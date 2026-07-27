import { createServerSupabase, createServiceSupabase, TENANT_ID } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import AddToCartButton from '@/components/shop/AddToCartButton'
import ProductGallery from '@/components/shop/ProductGallery'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props) {
  const supabase = await createServerSupabase()
  const [{ data: tenantData }, { data }] = await Promise.all([
    supabase.from('tenants').select('name').eq('id', TENANT_ID()).single(),
    supabase
      .from('products')
      .select('name, description, product_images(url, is_cover, sort_order)')
      .eq('tenant_id', TENANT_ID())
      .eq('slug', params.slug)
      .eq('active', true)
      .single(),
  ])
  if (!data) return { title: 'Producto no encontrado' }

  const storeName = tenantData?.name ?? 'Tienda'
  const title = `${data.name} - ${storeName}`
  const description = data.description
    ? data.description.slice(0, 155)
    : `Compra ${data.name} en ${storeName}. Envios a todo el pais.`

  const images = ((data.product_images ?? []) as any[]).sort((a, b) => {
    if (a.is_cover) return -1
    if (b.is_cover) return 1
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })
  const coverUrl = images[0]?.url ?? null

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(coverUrl ? { images: [{ url: coverUrl, width: 600, height: 900, alt: data.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(coverUrl ? { images: [coverUrl] } : {}),
    },
  }
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function ProductoPage({ params }: Props) {
  const supabase = await createServerSupabase()

  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', TENANT_ID()).single()
  const { data: config } = await supabase
    .from('store_config')
    .select('logo_url, whatsapp_number, notification_email, price_visibility, ignore_stock, video_360_url, min_qty_per_variant, interest_free_installments')
    .eq('tenant_id', TENANT_ID())
    .single()

  const { data: product } = await supabase
    .from('products')
    .select('*, product_images(*), variants(*, price_rules(*))')
    .eq('tenant_id', TENANT_ID())
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!product) notFound()

  const images = (product.product_images ?? []).sort((a: any, b: any) => {
    if (a.is_cover) return -1
    if (b.is_cover) return 1
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })
  const storeName = tenant?.name ?? 'TIENDA'

  const priceVisibility = (config as any)?.price_visibility ?? 'all'
  let showPrices = false
  let isWholesaleUser = false  // controla si se muestra el precio mayorista
  let isRetailUser = false     // logueado como retail en modo wholesale_only

  if (priceVisibility === 'all') {
    // Todos ven ambos precios sin importar si están logueados
    showPrices = true
    isWholesaleUser = true
  } else {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const service = createServiceSupabase()
        // Admin ve todo
        const { data: adminRows } = await service.from('users').select('id').eq('email', user.email ?? '').eq('tenant_id', TENANT_ID()).limit(1)
        if (adminRows && adminRows.length > 0) {
          showPrices = true
          isWholesaleUser = true
        } else {
          // Service client bypasea RLS. Usar auth_user_id (no email): el mail de
          // Auth puede ser "disfrazado" por tienda (ver lib/auth-email.ts) y ya
          // no coincide con customers.email para cuentas nuevas.
          const { data: customer } = await service
            .from('customers')
            .select('type')
            .eq('auth_user_id', user.id)
            .eq('tenant_id', TENANT_ID())
            .maybeSingle()
          const isWholesale = customer?.type === 'wholesale'
          const isRegistered = !!customer
          if (priceVisibility === 'logged_in') {
            // Cualquier registrado ve precios retail; solo mayoristas ven precio mayorista
            showPrices = isRegistered
            isWholesaleUser = isWholesale
          } else if (priceVisibility === 'wholesale_only') {
            // Solo mayoristas ven precios; retail logueado ve mensaje diferente
            showPrices = isWholesale
            isWholesaleUser = isWholesale
            isRetailUser = isRegistered && !isWholesale
          }
        }
      }
    } catch { /* si no hay sesión, mantener defaults */ }
  }

  // Una variante sin ningún price_rule activo con precio > 0 no es una opción
  // real de compra — se trata como si no existiera en la tienda (no aparece
  // como talle/color seleccionable), aunque el registro siga en la base. Esto
  // evita que celdas vacías del editor de Panel Admin (sin precio cargado)
  // se cuelen como opciones fantasma.
  const pricedVariants = (product.variants ?? []).filter((v: any) =>
    (v.price_rules ?? []).some((r: any) => r.active && (r.price ?? 0) > 0)
  )

  const sizes = [...new Set(pricedVariants.map((v: any) => v.size).filter(Boolean))]
  const colors = [...new Set(pricedVariants.map((v: any) => v.color).filter(Boolean))]

  const retailRule = pricedVariants[0]?.price_rules?.find((p: any) => p.type === 'retail' && p.active)
  const wholesaleRule = pricedVariants[0]?.price_rules?.find((p: any) => p.type === 'wholesale' && p.active)

  const coverImage = images[0]?.url ?? null
  const retailRegular: number | undefined = retailRule?.price
  const retailRebajado: number | undefined =
    (retailRule?.compare_at_price > 0 && retailRule?.compare_at_price < (retailRule?.price ?? Infinity))
      ? retailRule?.compare_at_price : undefined
  const retailPrice = retailRebajado ?? retailRegular
  const retailCompareAt = retailRebajado ? retailRegular : undefined
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? `${product.name} - ${storeName}`,
    image: coverImage ? [coverImage] : undefined,
    sku: (product as any).sku ?? undefined,
    offers: retailPrice ? {
      '@type': 'Offer',
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/tienda/${product.slug}`,
      priceCurrency: 'ARS',
      price: retailPrice,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: storeName },
    } : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar storeName={storeName} logoUrl={config?.logo_url} tourUrl={(config as any)?.video_360_url} />

      <main className="pt-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">

            <ProductGallery images={images} productName={product.name} />

            <div className="py-4">
              <p className="text-xs tracking-[0.15em] uppercase text-[var(--color-stone)] mb-6">
                Tienda / {product.name}
              </p>

              <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] leading-tight mb-6">
                {product.name}
              </h1>

              <div className="mb-8">
                {showPrices ? (
                  <>
                    {retailPrice ? (
                      <div>
                        <p className="text-2xl font-light text-[var(--color-charcoal)]">
                          {formatPrice(retailPrice!)}
                        </p>
                        {retailCompareAt && (
                          <p className="text-sm text-[var(--color-stone)] line-through mt-0.5">
                            {formatPrice(retailCompareAt)}
                          </p>
                        )}
                      </div>
                    ) : !(isWholesaleUser && wholesaleRule) ? (
                      <p className="text-sm text-[var(--color-stone)]">
                        Producto solo por mayor
                      </p>
                    ) : null}
                    {isWholesaleUser && wholesaleRule && (
                      <p className="text-sm text-[var(--color-stone)] mt-1">
                        Precio mayorista: {formatPrice(wholesaleRule.price)}
                      </p>
                    )}
                  </>
                ) : isRetailUser ? (
                  <p className="text-sm text-[var(--color-stone)]">
                    Necesitás una cuenta mayorista para ver el precio
                  </p>
                ) : (
                  <a
                    href="/cuenta/login"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors underline"
                  >
                    {priceVisibility === 'wholesale_only'
                      ? 'Precio disponible solo para mayoristas'
                      : 'Iniciá sesión para ver el precio'}
                  </a>
                )}
              </div>

              <div className="w-full h-px bg-[var(--color-border)] mb-8" />

              <AddToCartButton
                product={{
                  id: product.id,
                  name: product.name,
                  variants: pricedVariants,
                  coverUrl: images[0]?.url ?? null,
                  max_installments: (product as any).max_installments ?? null,
                }}
                sizes={sizes as string[]}
                colors={colors as string[]}
                showPrices={showPrices}
                isWholesale={isWholesaleUser}
                ignoreStock={Boolean((config as any)?.ignore_stock)}
                interestFreeInstallments={(config as any)?.interest_free_installments ?? null}
                minQty={(product as any).min_qty ?? (config as any)?.min_qty_per_variant ?? 1}
              />

              <div className="w-full h-px bg-[var(--color-border)] my-8" />

              {product.description && (
                <div>
                  <p className="text-xs tracking-[0.15em] uppercase text-[var(--color-stone)] mb-3">Descripcion</p>
                  <p className="text-sm text-[var(--color-stone)] leading-relaxed font-light">
                    {product.description}
                  </p>
                </div>
              )}

              {config?.whatsapp_number && (
                <div className="mt-8">
                  <a
                    href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}?text=Hola! Me interesa el producto: ${product.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors border-b border-[var(--color-border)] pb-1"
                  >
                    Consultar por WhatsApp
                  </a>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <Footer storeName={storeName} logoUrl={config?.logo_url ?? undefined} whatsapp={config?.whatsapp_number ?? ''} email={config?.notification_email ?? ''} />
    </>
  )
}
