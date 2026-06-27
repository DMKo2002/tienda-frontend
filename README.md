# Tienda Frontend

Frontend público de la tienda — estética inspirada en adeio-design.com.

## Stack
- Next.js 14+ (App Router)
- TypeScript
- Supabase (misma DB que el panel admin)
- Tailwind CSS
- Fuentes: Cormorant Garamond + DM Sans

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Crear variables de entorno
cp .env.example .env.local
# Completar con tus credenciales de Supabase

# 3. Correr en desarrollo (puerto diferente al panel admin)
npm run dev -- -p 3001
```

Abrir http://localhost:3001

## Estructura
```
src/
├── app/
│   ├── page.tsx          # Home
│   └── tienda/
│       └── page.tsx      # Catálogo
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── shop/
│       ├── ProductCard.tsx
│       └── CatalogFilters.tsx
└── lib/
    ├── supabase.ts        # Cliente browser
    └── supabase-server.ts # Cliente SSR
```

## Variables de entorno (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_TENANT_ID=uuid-del-tenant
```

## Próximos pasos
- [ ] Página de producto individual (/tienda/[slug])
- [ ] Carrito con localStorage
- [ ] Checkout con MercadoPago
- [ ] Login del cliente comprador
- [ ] Historial de pedidos
EOF
