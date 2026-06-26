import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Para client components — lee env var (NEXT_PUBLIC_ es accesible en el browser)
// En deployments multi-tenant, el env var se setea por deployment de template.
// Para true multi-tenant con un solo deployment, usar useTenantId() desde TenantProvider.
export const TENANT_ID = () => process.env.NEXT_PUBLIC_TENANT_ID ?? ''
