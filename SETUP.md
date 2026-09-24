# Instanciar una tienda

Todo lo que una tienda cambia está en la lista. Si tienes que tocar algo fuera de ella, es un bug del template.

## 1. Repo
- [ ] `gh repo create <owner>/<tienda> --template <owner>/shop-base --private --clone`
- [ ] `npm install && npm test`

## 2. Identidad (sin base de datos todavía)
- [ ] `src/config/site.ts` — nombre, tagline, descripción, ciudad, país, moneda, correo, teléfono, redes, etiquetas de taxonomía.
- [ ] `src/styles/global.css` → bloque `@theme` — colores del logo (`page`, `deep`, `raised`, `fg`, `accent`, `muted`, `primary`).
- [ ] `astro.config.mjs` → `fonts[]` (si cambias nombres, actualiza los `<Font>` de `layouts/Site.astro`, `layouts/Admin.astro` y `pages/admin/login.astro`; `npm run typecheck` lo detecta).
- [ ] `<meta name="theme-color">` en `src/layouts/Site.astro` = valor de `deep`.
- [ ] `public/favicon.svg` y, cuando exista, el logo en `Header.astro` (hoy es texto).
- [ ] `src/pages/nosotros.astro` — los tres puntos de la página.
- [ ] `CLAUDE.md` — bloque "INSTANCIA" con el negocio concreto.
- [ ] `npm run dev` y revisa que se vea bien vacío.

## 3. Infraestructura (Vercel)
- [ ] Importar el repo en Vercel (**no** `vercel deploy`: el proyecto debe quedar enlazado a git para deploys por push).
- [ ] Marketplace → **Neon** (free) conectado al proyecto. `vercel env pull .env`
- [ ] Storage → **Blob** conectado al proyecto. Verificar la cuota gratuita en el dashboard.
- [ ] Env vars en Production/Preview/Development: `ADMIN_PASSWORD`, `SESSION_SECRET` (`openssl rand -base64 32`), `PUBLIC_SITE_URL`, `PUBLIC_WHATSAPP`. Guardar las dos primeras en un gestor de contraseñas.
- [ ] Deployment Protection solo en previews (ver `docs/gotchas.md` › Vercel).

## 4. Datos
- [ ] `npm run db:push`
- [ ] Reemplazar `scripts/seed.mjs` por el catálogo real, o cargar desde `/admin`. (`npm run db:seed` siembra la demo.)
- [ ] `/admin/ajustes` — WhatsApp de pedidos y mensajes.
- [ ] `npm run dev` + `npm run check` en otra terminal.

## 5. Verificar en producción
- [ ] Push a `main` → deploy automático.
- [ ] Agregar un producto con variante al carrito, navegar a otra página, agregar otro: el contador sigue sumando.
- [ ] "Enviar pedido por WhatsApp" abre el chat correcto con talla/color y total.
- [ ] Un producto oculto no aparece; `/admin` pide login.
