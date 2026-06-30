'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient, TENANT_ID } from '@/lib/supabase'

export default function TourPage() {
  const supabase = createClient()
  const [storeName, setStoreName] = useState('TIENDA')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [tourUrl, setTourUrl] = useState<string | null>(null)
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: tenant }, { data: config }] = await Promise.all([
        supabase.from('tenants').select('name').eq('id', TENANT_ID()).single(),
        supabase.from('store_config')
          .select('logo_url, video_360_url, whatsapp_number, notification_email, instagram_url, facebook_url')
          .eq('tenant_id', TENANT_ID()).single(),
      ])
      if (tenant) setStoreName(tenant.name)
      if (config) {
        setLogoUrl(config.logo_url)
        setTourUrl((config as any).video_360_url ?? null)
        setWhatsapp(config.whatsapp_number ?? '')
        setEmail(config.notification_email ?? '')
        setInstagram(config.instagram_url ?? '')
        setFacebook(config.facebook_url ?? '')
      }
    }
    load()
  }, [])

  return (
    <>
      <Navbar storeName={storeName} logoUrl={logoUrl} tourUrl={tourUrl} />

      <main className="min-h-screen bg-[var(--color-warm-white)] pt-28 pb-20">
        <div className="w-full px-4 md:px-8">
          {/* Título */}
          <div className="mb-8 text-center">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-stone)] mb-2">Experiencia inmersiva</p>
            <h1 className="font-display text-3xl md:text-4xl font-light tracking-[0.1em] uppercase text-[var(--color-charcoal)]">
              Local Virtual
            </h1>
          </div>

          {/* Iframe Matterport — full width */}
          {tourUrl ? (
            <div className="w-full overflow-hidden shadow-sm" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={tourUrl}
                width="100%"
                height="100%"
                allowFullScreen
                allow="xr-spatial-tracking"
                style={{ border: 'none', display: 'block' }}
                title="Local Virtual"
              />
            </div>
          ) : (
            <div className="w-full flex items-center justify-center bg-[var(--color-border)] text-[var(--color-stone)] text-sm" style={{ aspectRatio: '16/9' }}>
              Tour no disponible
            </div>
          )}

          <p className="text-center text-xs text-[var(--color-stone)] mt-6 tracking-wide">
            Usá el mouse o touch para navegar el espacio en 360°
          </p>
        </div>
      </main>

      <Footer
        storeName={storeName}
        whatsapp={whatsapp}
        email={email}
        instagramUrl={instagram || undefined}
        facebookUrl={facebook || undefined}
      />
    </>
  )
}
