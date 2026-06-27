import type { Metadata } from 'next'
import './globals.css'
import { CartProvider } from '@/components/shop/CartContext'
import CookieBanner from '@/components/layout/CookieBanner'

export const metadata: Metadata = {
  title: { default: 'Tienda', template: '%s | Tienda' },
  description: 'Estilo que trasciende tendencia.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="overflow-x-hidden">
        <CartProvider>
          {children}
          <CookieBanner />
        </CartProvider>
        </body>
    </html>
  )
}
