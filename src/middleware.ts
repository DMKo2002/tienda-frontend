import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware de resolución de tenant + refresco de sesión Supabase.
 *
 * Por cada request:
 *  1. Refresca el token de auth de Supabase (imprescindible para getUser() en SSR)
 *  2. Resuelve el tenant por hostname e inyecta x-tenant-id en headers
 *
 * En desarrollo local (localhost) cae al env var NEXT_PUBLIC_TENANT_ID.
 */
export async function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers)

  // ── 1. Refresco de sesión Supabase ─────────────────────────────────────────
  // Necesario para que getUser() funcione en Server Components.
  // El cliente con cookies reales renueva el JWT si venció.
  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => requestHeaders.set(`cookie`, `${name}=${value}`))
          response = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  // Llama a getUser() para que el cliente renueve el access_token si venció
  await supabaseAuth.auth.getUser()

  // ── 2. Resolución de tenant ─────────────────────────────────────────────────
  const hostname = req.headers.get('host') ?? ''
  const host = hostname.replace(/^www\./, '').split(':')[0]

  const isLocal =
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.startsWith('192.168.')

  let tenantId: string | null = null

  if (!isLocal) {
    // Cliente sin cookies — solo necesitamos leer la tabla tenants (pública)
    const supabaseTenant = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    if (host.endsWith('.creart.com')) {
      const slug = host.replace(/\.creart\.com$/, '')
      if (slug) {
        const { data } = await supabaseTenant
          .from('tenants')
          .select('id')
          .eq('slug', slug)
          .eq('status', 'active')
          .maybeSingle()
        tenantId = data?.id ?? null
      }
    } else {
      const { data } = await supabaseTenant
        .from('tenants')
        .select('id')
        .eq('domain', host)
        .eq('status', 'active')
        .maybeSingle()
      tenantId = data?.id ?? null
    }
  }

  if (!tenantId) {
    tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? null
  }

  if (tenantId) {
    response.headers.set('x-tenant-id', tenantId)
    response.cookies.set('x-tenant-id', tenantId, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
  }

  return response
}

export const config = {
  // Corre en todas las rutas excepto assets estáticos e imágenes de Next
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
