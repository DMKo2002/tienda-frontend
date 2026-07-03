import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'
import { sendEmail, emailBienvenidaCliente } from '@/lib/email'

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) { console.warn('TURNSTILE_SECRET_KEY no configurada'); return true }
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })
  const data = await res.json()
  return data.success === true
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, apellido, email, password, tipo, empresa, cuit, direccion, provincia, localidad, turnstileToken } = body
    if (!nombre || !email || !password || !tipo)
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    if (password.length < 8)
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    if (tipo === 'wholesale' && (!empresa || !cuit))
      return NextResponse.json({ error: 'Empresa y CUIT son obligatorios para cuentas mayoristas' }, { status: 400 })
    if (tipo === 'wholesale' && (!direccion || !provincia || !localidad))
      return NextResponse.json({ error: 'Dirección, provincia y localidad son obligatorias' }, { status: 400 })
    if (!turnstileToken)
      return NextResponse.json({ error: 'Verificación de seguridad requerida' }, { status: 400 })
    if (!await verifyTurnstile(turnstileToken))
      return NextResponse.json({ error: 'Verificación de seguridad fallida. Intentá de nuevo.' }, { status: 400 })

    const supabase = await createServerSupabase()
    const tenantId = TENANT_ID()

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: `${nombre} ${apellido ?? ''}`.trim(), tipo },
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    })

    let userId: string

    if (authError?.message.includes('already registered')) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError || !signInData.user)
        return NextResponse.json(
          { error: 'Ya existe una cuenta con ese email. Si ya compraste en otra tienda CreArt, usá la misma contraseña — o iniciá sesión.' },
          { status: 409 }
        )
      userId = signInData.user.id
      const { data: existing } = await supabase.from('customers').select('id').eq('id', userId).eq('tenant_id', tenantId).maybeSingle()
      if (existing)
        return NextResponse.json({ error: 'Ya tenés una cuenta en esta tienda. Iniciá sesión.' }, { status: 409 })
    } else if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    } else {
      if (!authData.user) return NextResponse.json({ error: 'Error al crear el usuario' }, { status: 500 })
      userId = authData.user.id
    }

    // Verificar si ya existe un customer con este email (importado de WooCommerce u otra tienda)
    const { data: existingByEmail } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', email)
      .limit(1)

    if (existingByEmail && existingByEmail.length > 0) {
      // Existe un customer (importado u otro) → actualizar tipo y datos SIN tocar el id
      // No cambiamos el id para evitar FK constraint violation (orders.customer_id → customers.id)
      const { error: updateErr } = await supabase.from('customers').update({
        full_name: nombre,
        last_name: apellido ?? null,
        type: tipo,
        company_name: empresa ?? null,
        cuit: cuit ?? null,
        ...(direccion ? { address_street: direccion } : {}),
        ...(provincia ? { address_province: provincia } : {}),
        ...(localidad ? { address_city: localidad } : {}),
        active: true,
      }).eq('id', existingByEmail[0].id).eq('tenant_id', tenantId)
      if (updateErr) console.error('[registro] error actualizando customer existente:', updateErr.message)
    } else if (!existingByEmail || existingByEmail.length === 0) {
      // No existe → insertar nuevo
      await supabase.from('customers').insert({
        id: userId, tenant_id: tenantId, email,
        full_name: nombre, last_name: apellido ?? null,
        company_name: empresa ?? null, cuit: cuit ?? null,
        phone: null, type: tipo,
        address_street: direccion ?? null,
        address_province: provincia ?? null,
        address_city: localidad ?? null,
        active: true,
      })
    }

    // Email de bienvenida
    const [{ data: tenant }, { data: emailConfig }] = await Promise.all([
      supabase.from('tenants').select('name').eq('id', tenantId).single(),
      supabase.from('store_configs').select('email_from_name, reply_to').eq('tenant_id', tenantId).single(),
    ])
    const storeName = tenant?.name ?? 'Tienda'
    const needsConfirmation = !authData?.session
    const emailResult = await sendEmail({
      to: email,
      subject: `Bienvenido/a a ${storeName}`,
      html: emailBienvenidaCliente({ storeName, firstName: nombre, storeUrl: siteUrl }),
      fromName: emailConfig?.email_from_name ?? storeName,
      ...(emailConfig?.reply_to ? { replyTo: emailConfig.reply_to } : {}),
    }).catch(e => { console.error('[email bienvenida] fetch error:', e); return { ok: false } })
    console.log(`[registro] email bienvenida a ${email}: ${emailResult.ok ? 'ENVIADO OK' : 'FALLO'}, confirmacion auth: ${needsConfirmation}`)

    return NextResponse.json({ ok: true, confirmacion: needsConfirmation })
  } catch (err: any) {
    console.error('Error registro:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
