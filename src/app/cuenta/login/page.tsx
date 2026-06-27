'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      if (authError.message.includes('Invalid login') || authError.message.includes('invalid')) {
        setError('Email o contraseña incorrectos')
      } else if (authError.message.includes('Email not confirmed')) {
        setError('Confirmá tu email antes de iniciar sesión. Revisá tu bandeja de entrada.')
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    router.push('/cuenta')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <Link href="/tienda" className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors">
            ← Volver a la tienda
          </Link>
          <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] mt-4">Mi cuenta</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)] mb-1.5">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)]">Contraseña</label>
              <Link href="/cuenta/recuperar" className="text-[10px] text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              type="password"
              className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors"
              value={password} onChange={e => setPassword(e.target.value)} required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[var(--color-charcoal)] text-white text-[11px] tracking-[0.2em] uppercase hover:bg-[var(--color-stone)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>

          <p className="text-center text-sm text-[var(--color-stone)] font-light">
            ¿No tenés cuenta?{' '}
            <Link href="/cuenta/registro" className="text-[var(--color-charcoal)] underline hover:text-[var(--color-stone)] transition-colors">
              Registrarse
            </Link>
          </p>
        </form>

      </div>
    </div>
  )
}
