'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { ShoppingBag, Menu, X, Search, User } from 'lucide-react'
import { useCart } from '@/components/shop/CartContext'

interface NavbarProps {
  storeName?: string
  logoUrl?: string | null
  tourUrl?: string | null
}

interface Leaf { id: string; name: string; slug: string }
interface Sub extends Leaf { subcategories: Leaf[] }
interface Category extends Leaf { subcategories: Sub[] }

export default function Navbar({ storeName = 'TIENDA', logoUrl, tourUrl }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [megaOpen, setMegaOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { count } = useCart()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    fetch('/api/nav-categories').then(r => r.json()).then(setCategories).catch(() => {})
  }, [])

  function open() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMegaOpen(true)
  }

  function close() {
    closeTimer.current = setTimeout(() => setMegaOpen(false), 120)
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  const headerHeight = scrolled ? 'top-[52px]' : 'top-[72px]'

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-[var(--color-warm-white)] border-b border-[var(--color-border)] py-3' : 'bg-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)] hover:text-[var(--color-stone)] transition-colors">
              Home
            </Link>

            {/* Tienda trigger — sin div envolvente: si no, queda una caja de línea
                distinta a la de los demás links y "Tienda" se ve corrido hacia abajo */}
            <Link
              href="/tienda"
              onMouseEnter={open}
              onMouseLeave={close}
              className={`text-xs tracking-[0.15em] uppercase transition-colors ${megaOpen ? 'text-[var(--color-stone)]' : 'text-[var(--color-charcoal)] hover:text-[var(--color-stone)]'}`}
            >
              Tienda
            </Link>

            {tourUrl && (
              <Link href="/tour" className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)] hover:text-[var(--color-stone)] transition-colors">
                Local Virtual
              </Link>
            )}

            <Link href="/contacto" className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)] hover:text-[var(--color-stone)] transition-colors">
              Contacto
            </Link>
          </nav>

          {/* Logo centrado */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            {logoUrl ? (
              <span className="relative block h-8 w-[160px]">
                <Image src={logoUrl} alt={storeName} fill sizes="160px" className="object-contain" priority />
              </span>
            ) : (
              <span className="font-display text-xl font-light tracking-[0.2em] uppercase text-[var(--color-charcoal)]">
                {storeName}
              </span>
            )}
          </Link>

          {/* Iconos derecha */}
          <div className="hidden md:flex items-center gap-6">
            <button className="text-[var(--color-charcoal)] hover:text-[var(--color-stone)] transition-colors">
              <Search size={18} strokeWidth={1.5} />
            </button>
            <Link href="/cuenta" className="text-[var(--color-charcoal)] hover:text-[var(--color-stone)] transition-colors" title="Mi cuenta">
              <User size={18} strokeWidth={1.5} />
            </Link>
            <Link href="/carrito" className="relative text-[var(--color-charcoal)] hover:text-[var(--color-stone)] transition-colors">
              <ShoppingBag size={20} strokeWidth={1.5} />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-charcoal)] text-white text-[9px] rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-4 ml-auto">
            <Link href="/cuenta" title="Mi cuenta">
              <User size={20} strokeWidth={1.5} />
            </Link>
            <Link href="/carrito" className="relative">
              <ShoppingBag size={20} strokeWidth={1.5} />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-charcoal)] text-white text-[9px] rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── MEGA MENU ── full width panel */}
      {categories.length > 0 && (
        <div
          className={`fixed left-0 right-0 z-40 hidden md:block transition-all duration-300 ease-in-out ${headerHeight} ${
            megaOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
          style={{ background: 'linear-gradient(to bottom, rgba(229,231,235,1) 0%, rgba(229,231,235,0.4) 100%)' }}
          onMouseEnter={cancelClose}
          onMouseLeave={close}
        >
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="grid grid-cols-5 gap-x-8 gap-y-2">
              {/* "Ver todo" como primer columna */}
              <div className="flex flex-col gap-2 min-w-[120px]">
                <Link
                  href="/tienda"
                  onClick={() => setMegaOpen(false)}
                  className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--color-charcoal)] mb-3 hover:text-[var(--color-stone)] transition-colors"
                >
                  Ver todo
                </Link>
              </div>

              {/* Una columna por categoría madre */}
              {categories.map(cat => (
                <div key={cat.id} className="flex flex-col min-w-[140px]">
                  <Link
                    href={`/tienda?cat=${cat.slug}`}
                    onClick={() => setMegaOpen(false)}
                    className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--color-charcoal)] mb-3 hover:text-[var(--color-stone)] transition-colors"
                  >
                    {cat.name}
                  </Link>
                  {cat.subcategories.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {cat.subcategories.map(sub => (
                        <li key={sub.id}>
                          <Link
                            href={`/tienda?cat=${sub.slug}`}
                            onClick={() => setMegaOpen(false)}
                            className="text-xs tracking-[0.08em] text-zinc-600 hover:text-[var(--color-charcoal)] transition-colors"
                          >
                            {sub.name}
                          </Link>
                          {sub.subcategories.length > 0 && (
                            <ul className="mt-1 ml-2 flex flex-col gap-1">
                              {sub.subcategories.map(leaf => (
                                <li key={leaf.id}>
                                  <Link
                                    href={`/tienda?cat=${leaf.slug}`}
                                    onClick={() => setMegaOpen(false)}
                                    className="text-[11px] tracking-[0.06em] text-zinc-400 hover:text-zinc-700 transition-colors"
                                  >
                                    {leaf.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile fullscreen menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-[var(--color-warm-white)] flex flex-col items-center justify-center gap-8 md:hidden overflow-y-auto py-20">
          <Link href="/" onClick={() => setMenuOpen(false)}
            className="font-display text-3xl font-light tracking-widest uppercase text-[var(--color-charcoal)]">
            Home
          </Link>
          <Link href="/tienda" onClick={() => setMenuOpen(false)}
            className="font-display text-3xl font-light tracking-widest uppercase text-[var(--color-charcoal)]">
            Tienda
          </Link>
          {categories.length > 0 && (
            <div className="flex flex-col items-center gap-3 -mt-4">
              {categories.map(cat => (
                <Link key={cat.id} href={`/tienda?cat=${cat.slug}`} onClick={() => setMenuOpen(false)}
                  className="text-sm tracking-[0.15em] uppercase text-[var(--color-stone)]">
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
          {tourUrl && (
            <Link href="/tour" onClick={() => setMenuOpen(false)}
              className="font-display text-3xl font-light tracking-widest uppercase text-[var(--color-charcoal)]">
              Local Virtual
            </Link>
          )}
          <Link href="/contacto" onClick={() => setMenuOpen(false)}
            className="font-display text-3xl font-light tracking-widest uppercase text-[var(--color-charcoal)]">
            Contacto
          </Link>
          <Link href="/cuenta" onClick={() => setMenuOpen(false)}
            className="font-display text-3xl font-light tracking-widest uppercase text-[var(--color-charcoal)]">
            Mi cuenta
          </Link>
        </div>
      )}
    </>
  )
}
