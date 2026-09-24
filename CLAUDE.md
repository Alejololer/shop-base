# shop-base — tienda en línea + CMS

@AGENTS.md

## Qué es
Base reutilizable de e-commerce: catálogo con dos ejes de filtro (categoría × marca), variantes
opcionales de dos ejes con stock, carrito que termina en un **pedido por WhatsApp** (sin pasarela de
pago, por diseño), captación de leads y un panel `/admin` propio. Cada tienda es un repo creado desde
este template, con su propio Vercel, Neon y Blob.

<!-- INSTANCIA: reemplaza este bloque con el negocio concreto (qué vende, ciudad, dueño, datos confirmados). -->

## Stack (no cambiar sin motivo)
- Astro 7 (`output: 'server'`) + `@astrojs/vercel` + Tailwind v4 (`@tailwindcss/vite`). Sin React ni frameworks cliente.
- Neon Postgres (Vercel Marketplace) + Drizzle ORM. Esquema en `src/db/schema.ts`, aplicado con `drizzle-kit push`.
- Vercel Blob para imágenes subidas desde el admin (fallback a `public/uploads` sin token).
- Astro Actions para mutaciones; middleware protege `/admin/*` y `/_actions/*`.
- Auth: un solo admin, `ADMIN_PASSWORD` + cookie firmada HMAC con `SESSION_SECRET` (sin librería).
- Sin `DATABASE_URL` el sitio renderiza vacío en vez de romper (`hasDb` en `src/db/client.ts`): el template se clona y corre al instante.

## Dónde vive cada cosa
- **Identidad del negocio**: `src/config/site.ts` (nombre, textos, redes, etiquetas de taxonomía). Nunca hardcodear datos del negocio en componentes.
- **Tema**: tokens semánticos en `@theme` de `src/styles/global.css` (`page`, `deep`, `raised`, `fg`, `accent`, `muted`). Cambiar valores, no clases. Fuentes en `astro.config.mjs`.
- **Lectura de datos**: `src/db/queries.ts`. **Escritura**: `src/actions/index.ts`.
- **Lógica de compra** (stock, carrito, mensaje de WhatsApp): `src/lib/shop.ts`, pura y cubierta por `npm test`. El carrito del navegador (`src/components/Cart.astro`) solo la usa.
- WhatsApp de pedidos y plantillas de mensaje: tabla `settings`, editable en `/admin/ajustes` (fallback `PUBLIC_WHATSAPP`).

## Reglas
- Contenido público en español. Código y commits en inglés.
- Ponytail: la solución más corta que funciona. CSS antes que JS, restricciones en DB antes que en app.
- **Sin variantes ≠ agotado.** Cualquier lógica de stock pasa por `soldOut()`/`hasVariants()` de `src/lib/shop.ts`.
- El stock es informativo: nada lo descuenta solo (no hay checkout que confirme la venta).
- Interactividad cliente: delegar eventos en `document`, re-renderizar en `astro:page-load` (ver `docs/gotchas.md` › Carrito).
- Imágenes de DB con `<img>` normal (width/height/alt/loading=lazy).
- SEO es base del producto: cada página pública usa `<Seo />` vía `Site.astro` (title, description, canonical, OG, JSON-LD). Nunca indexar `/admin`.
- Commits pequeños como checkpoints después de cada bloque funcional.
- No inventar datos del cliente: lo no confirmado va como placeholder editable.
- Antes de tocar algo raro, lee `docs/gotchas.md`.

## Env vars
`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `PUBLIC_SITE_URL`, `PUBLIC_WHATSAPP`

## Comandos
`npm run dev` · `npm run build` · `npm test` (lógica pura, CI) · `npm run typecheck` · `npm run db:push` · `npm run db:seed` · `npm run check` (smoke contra server + DB)
