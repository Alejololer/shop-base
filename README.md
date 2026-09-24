# shop-base

Base de tienda en línea para negocios pequeños: catálogo con categorías y marcas, variantes
(talla/color, tono/tamaño, capacidad/color…) con stock, carrito que envía el pedido por
**WhatsApp**, captación de leads y panel de administración propio.

Astro 7 · Tailwind v4 · Drizzle + Neon Postgres · Vercel Blob · Vercel. Costo $0 en los planes gratuitos.

## Probarlo ya

```bash
npm install
npm run dev        # http://localhost:4321 — sin base de datos el sitio carga vacío
npm test           # lógica de carrito, stock y mensaje de WhatsApp
```

Con datos de ejemplo: copia `.env.example` a `.env`, pon un `DATABASE_URL` de Postgres y corre
`npm run db:push && npm run db:seed`. El admin está en `/admin` (contraseña = `ADMIN_PASSWORD`).

## Crear una tienda nueva

Usa este repo como template (**Use this template** en GitHub, o
`gh repo create mi-tienda --template <owner>/shop-base --private`) y sigue [`SETUP.md`](SETUP.md).

## Documentación
- [`SETUP.md`](SETUP.md) — checklist para instanciar una tienda.
- [`CLAUDE.md`](CLAUDE.md) — arquitectura y reglas.
- [`docs/gotchas.md`](docs/gotchas.md) — tropiezos conocidos y cómo evitarlos.
