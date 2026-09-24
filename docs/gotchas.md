# Gotchas (log de tropiezos)

Registro de cosas que costaron tiempo. Añadir una entrada cada vez que algo no obvio rompa.

## Astro 7
- **No existe `astro:schema`.** Importar zod directo: `import { z } from 'zod'` (zod 4 viene con Astro).
- **Campos ausentes en formularios llegan como `null`, no `undefined`.** `z.string().optional()` falla; usar `z.preprocess(nil, ...)` o `.nullish()`.
- **Arrays en formularios (`<input multiple>`, checkboxes repetidos)** solo usan `formData.getAll()` si el schema es un `z.array(...)` *sin envolver* en `preprocess`/`pipe` (Astro desenvuelve `optional/nullable/default`, no `pipe`). Filtrar archivos vacíos en el handler, no en el schema.
- **Acciones desde curl devuelven 403** sin cabecera `Origin` (CSRF check). Usar `-H "Origin: http://localhost:4321"`.
- **Headers puestos en middleware después de `next()` se pierden** (la respuesta ya va en streaming). Usar `Astro.response.headers.set(...)` en el layout/página.
- `<form action={actions.x}>` renderiza `action="?_action=x"`; el resultado se lee en la página con `Astro.getActionResult` y ahí se hace el redirect.
- **Un form en un layout compartido postea a la página actual**: "Salir" desde `/admin/sucursales` quedaba en `?_action=logout` sin redirigir (solo `/admin` lee el resultado). Fijar la ruta: `action={'/admin' + actions.logout}`.
- **Sesiones de Astro necesitan driver Redis en Vercel** → usamos cookie HMAC propia.
- `astro dev --background` bloquea el pipe si se encadena con otros comandos en el mismo Bash; lanzarlo solo.
- Font API: `cssVariable` no puede llamarse `--font-sans` porque choca con el token de Tailwind. Usar `--font-inter` y mapear en `@theme inline`.

## Tailwind v4
- `@apply` no acepta clases propias definidas en `@layer components`. Definirlas con `@utility nombre { ... }`; luego sí se pueden `@apply`.
- Tokens que referencian otras variables (`var(--font-inter)`) van en `@theme inline`, no en `@theme`.

## postgres.js / Drizzle
- **Columnas `jsonb`: no pasar `JSON.stringify(...)`** en inserts crudos, queda guardado como string escapado. Usar `sql.json(valor)`.
- `@neondatabase/serverless` (neon-http) no sirve contra Postgres local. `postgres` (postgres.js) funciona en local y en Neon; usar `prepare: false` para el pooler.
- `drizzle-kit push` necesita `DATABASE_URL` exportado en el shell (no lee `.env` solo).

## Windows / Git Bash
- **MSYS convierte `/seed/x.webp` en `C:/Program Files/Git/seed/x.webp`** en argumentos de curl. Poner `MSYS_NO_PATHCONV=1`.
- `rg` no está en PATH; el wrapper `rtk` cae a grep lento. Preferir `sed -n`/`head` para leer archivos grandes de node_modules.
- Heredocs largos con comillas en Bash a veces fallan con "unexpected EOF"; para archivos grandes usar la herramienta Write. Un heredoc que genera JS con escapes (`
`, `|`) dentro de strings los pierde: escribir ese código con Write/Edit.

## Pruebas destructivas
- Al probar borrados por HTTP, obtener el id **por slug en la DB**, nunca con `tail -1` de un listado (así se borró un registro equivocado; el seed lo restauró).

## Revisión visual
- `node scripts/shot.mjs <url> <out.png> [w] [h] [cookie=valor]` captura páginas (incluido admin con cookie) con Edge headless vía CDP. Con `--screenshot` plano no se pueden pasar cookies.
- Alturas `svh` se disparan en capturas con ventana altísima; capturar a 1440×900 y dejar que el script expanda a la altura del documento.

## Vercel
- Los proyectos nuevos traen **Deployment Protection (Vercel Authentication)** en *todos* los deploys: producción redirige a login de Vercel. Dejarla solo en previews: `vercel api -X PATCH /v9/projects/<id>?teamId=<team> --input body.json` con `{"ssoProtection":{"deploymentType":"preview"}}` (o Settings → Deployment Protection).
- `vercel integration add` no interactivo se detiene si faltan aceptar términos del marketplace; imprime la URL y hay que reintentar.
- `vercel git connect` falla con repos privados hasta instalar la GitHub App de Vercel en el repo.
- El conector MCP de Vercel puede estar en otra cuenta que el CLI (`list_teams` vacío, 403). Usar `vercel api` con la sesión del CLI.
- `vercel env add` con `--force` y stdin: `printf valor | vercel env add NOMBRE production --force`.
- Vercel añade `X-Robots-Tag: noindex` a todas las URLs `*.vercel.app`; desaparece con dominio propio. Vercel reescribe `Cache-Control` al cliente como `public, max-age=0, must-revalidate` aunque cachee en CDN por `s-maxage`; mirar `X-Vercel-Cache: HIT`.
- Vercel no cachea peticiones HEAD: para verificar caché usar GET (`curl -s -o /dev/null -D -`) dos veces y buscar `X-Vercel-Cache: HIT`.

## Imágenes
- **La cuota gratuita de Vercel Blob es por cuenta, no por store**: todas las tiendas de una misma cuenta comparten almacenamiento y transferencia. Tiendas de clientes con catálogo grande → cuenta/team de Vercel propia del cliente. `src/lib/blob.ts` no redimensiona: subir fotos ya comprimidas.
- **Wikimedia Commons responde 403 sin `User-Agent`.** Con `-A "Nombre/1.0 (correo)"` la API y las descargas funcionan; el 403 anterior no era de red.

## Revisión visual (capturas)
- `scroll-behavior: smooth` + `scrollTo(0,0)` deja la captura a mitad de scroll (header fijo aparece en medio de la página). Usar `behavior: "instant"`.
- Imágenes `decoding="async"` salen en blanco en `captureScreenshot` aunque `img.complete` sea true. `shot.mjs` espera `img.decode()` (con timeout: `decode()` de una imagen lazy no cargada nunca resuelve y cuelga el script).
- `SHOT_EVAL="js"` en `shot.mjs` ejecuta código antes de capturar (p. ej. abrir el menú móvil).

## View transitions (ClientRouter)
- **`transition:persist` en el header congela el estado activo del menú**: tras la primera navegación cliente el DOM del header es el de la página inicial (`aria-current` no cambia). No persistir el header; se re-renderiza barato.
- El morph `transition:name` de la tarjeta completa (`<a>` con texto) al contenedor de la galería del detalle se ve jittery. Sin nombre compartido, el crossfade por defecto es suave.

## Rediseño premium (2026-09-10)
- **Cambiar fuentes en `astro.config.mjs` rompe cualquier `<Font cssVariable>` suelto**: `admin/login.astro` tiene su propio `<head>` y seguía pidiendo `--font-barlow`; `astro check` lo detecta, `astro dev` no.
- Los tokens de color son **semánticos** (`page`, `deep`, `raised`, `fg`, `accent`, `muted`): una instancia cambia valores en `@theme`, nunca clases. Si la paleta pasa a oscura, revisar los overlays de imagen (`from-black/60`) y el texto sobre `bg-accent` (`text-page`). Los tokens `navy/surface/slate` son solo del admin.
- Imágenes `loading=lazy` fuera del viewport salen en blanco en `shot.mjs` aunque el `<img>` esté bien; para verificarlas: `SHOT_EVAL="document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')"`.
- `sed -i` con `\[` dentro de `grep -c` vía el wrapper `rtk` devuelve 0 aunque el texto exista; verificar con `cat`/Read, no con el código de salida.

## Animaciones scroll-driven (capa premium, 2026-09-10)
- **`animation-range: entry …` mide la altura del propio elemento**: un eyebrow de 20 px con `entry 0% entry 45%` termina su reveal en 9 px de scroll y parece que no hay animación. Los reveals usan `cover 0% cover 25%` (el recorrido completo por el viewport): ~250 px de scroll para cualquier tamaño.
- **`animation-range: entry 0% entry 35%` en un elemento de 1px no anima nada**: el rango `entry` mide la altura del propio elemento. Para las hairlines (`::before` de 1px) se usa una longitud absoluta: `entry 0% entry 240px`. `view()` sí funciona sobre pseudo-elementos.
- **`scroll(root)` en páginas cortas nunca llega al rango** (gracias, 404): la barra móvil y el header usan la *view timeline con nombre* del hero (`.hero { view-timeline: --hero }` + `body { timeline-scope: --hero }`). Sin hero, la timeline es inactiva y queda el estado base (header sólido, barra visible).
- `backdrop-filter` en el `<header>` lo convierte en *containing block* de sus hijos `fixed`: el panel del menú móvil con `fixed inset-x-0 top-[72px]` se posiciona respecto al header, no al viewport (aquí da igual porque el header es sticky a todo el ancho).
- Al volver a `page.goto` a la misma URL en Playwright, el navegador **restaura el scroll anterior**: las animaciones scroll-driven salen `finished` y parece un bug. Hacer `scrollTo({ top: 0, behavior: 'instant' })` antes de medir.
- Para ver el estado final de los reveals en capturas sin `reduce-motion`: inyectar `*{animation:none!important;transition:none!important}`.

## Scraping de redes (Instagram / Facebook)
- El navegador de Playwright MCP no trae las cookies de Chrome: el usuario inicia sesión una vez en esa ventana y la sesión persiste en su perfil.
- `instagram.com/api/v1/users/web_profile_info` devuelve 429 enseguida. Lo que funciona: `page.on('response')` capturando los JSON de `/graphql/query` mientras se hace scroll del perfil; cada item trae `image_versions2.candidates` (máxima resolución) y `caption.text`. Filtrar por `user.username`, el feed mezcla posts de otras cuentas.
- Facebook: `/<page>/photos_by` lista `a[href*="photo.php?fbid="]` con miniaturas; la foto grande se saca abriendo cada `photo.php` y leyendo `img[data-visualcompletion="media-vc-image"]`. Las URLs firmadas de `scontent` se descargan con `fetch` sin cookies (alguna devuelve 403; reintentar desde otra vista).
- `browser_run_code_unsafe` no tiene `require` ni `import()` dinámico y su parámetro `filename` falla con ENOENT: devolver el JSON como string y guardarlo desde el resultado de la herramienta.
- Las hojas de contacto con PIL dibujan la etiqueta **debajo** de cada miniatura; leer el índice equivocado cuesta un ciclo entero de recortes.
- **`ADMIN_PASSWORD`/`SESSION_SECRET` se inyectan como texto fijo en el build** (`import.meta.env.X` privado → `JSON.stringify` en `astro/dist/env/env-loader.js`). Cambiarlas en Vercel no sirve hasta hacer **Redeploy**; en local, reiniciar `astro dev`. Solo cuenta `.env` en dev; `.env.production`/`.env.prod` (pull de Vercel) se ignoran.
- **El middleware de `/admin/*` no cubre `/_actions/*`**: las acciones tienen su propia ruta. Ahora el middleware exige cookie en `/_actions/*` salvo `login` y `lead`. Probar con `curl -X POST -H "Origin: <site>" -F id=1 <site>/_actions/deleteLead` → 401 sin cookie (sin `Origin` Astro devuelve 403 por CSRF, no es lo mismo).

## Efectos de scroll del landing (2026-09-10)
- **`.frame > img` recorta un 8 % arriba y abajo** (`inset: -8% 0; height: 116%`) para dejar recorrido al parallax. Una foto sin `.parallax` pierde los bordes (el sello de Instagram salía como una mancha negra). Regla `.frame > img:not(.parallax) { inset: 0; height: 100% }`.
- **Firefox (155, el navegador del usuario) no soporta `animation-timeline`**: todo el motion scroll-driven (reveals, parallax, hero, header, hairlines) no existía ahí, y los `@keyframes` declarados dentro de `@supports` tampoco. Fallback: `<html class="io">` puesto en `<head>` antes del primer pintado (y otra vez en `astro:after-swap`, el `<html>` nuevo no trae la clase) + IntersectionObserver en `Site.astro` que añade `.in`. Verificar en Firefox real con `node scripts/ff-shot.mjs <url> <out.png> [w] [h]` y `FF_EVAL` (WebDriver BiDi; Firefox ya no tiene CDP), no solo en el Chromium de Playwright.
- **Galería horizontal anclada**: la mueve JS en todos los navegadores (una sola ruta): sección `240svh`, hijo `sticky` de `100svh` con `overflow: hidden`, y `translate` = −(scrollWidth − clientWidth) × progreso del scroll por la sección. El JS decide si está anclada leyendo el `position` calculado del sticky (misma guarda que el CSS: `min-width: 64rem` + motion permitido) y limpia el `translate` si no, p. ej. al reducir la ventana bajo 1024 px.
- Fuera de esa guarda la galería es una tira `overflow-x: auto` con snap. **`scroll-snap-align: start` ignora el `padding` de la pista**: sin `scroll-padding-inline` en el scroller la primera foto queda pegada al borde. La primera versión (pista a todo el ancho del viewport, título dentro de la pista) se veía mal: a 1920 el título salía por la izquierda y las fotos se cortaban contra el borde; ahora título fijo + pista recortada dentro del contenedor. Las reglas base de la tira van **antes** del bloque de motion: al ir después, `overflow-x: auto` pisaba el `overflow: hidden` del sticky.
- **Cifras que cuentan sin JS**: `@property --n { syntax: '<integer>' }` + `counter-reset: n var(--n)` + `::before { content: counter(n) / '' }` (el `/ ''` lo oculta al lector de pantalla; el número real va en un `sr-only`). La animación solo declara `from { --n: 0 }`; el valor final es el `style="--n:400"` inline.

## Carrito (shop-base)
- El sitemap es un endpoint dinámico (`src/pages/sitemap.xml.ts`), no `@astrojs/sitemap`: esa integración corre al compilar y no ve productos creados después desde `/admin`. Cacheado 5 min en CDN como las páginas.
- **ClientRouter ejecuta los `<script>` procesados UNA vez**, pero reemplaza el `<body>`. Un listener pegado a un botón muere en la primera navegación. El carrito delega `click`/`submit` en `document` (que sobrevive) y solo re-renderiza en `astro:page-load`. Probar siempre: agregar → navegar → agregar otra vez.
- **El ClientRouter también escucha `submit` en `document`** y navega (GET `?variant=…&qty=…`) antes de que un listener en burbuja llegue a `preventDefault`: el carrito se guardaba pero la página navegaba y el drawer no abría. El listener de agregar-al-carrito va en **fase de captura** (`addEventListener('submit', fn, true)`) + `stopPropagation`. El smoke HTTP no lo ve; solo un navegador real.
- **`[].every(...)` es `true`**: un producto sin variantes parecería agotado. `soldOut()` en `src/lib/shop.ts` guarda por `length > 0`; `npm test` cubre ambos caminos.
- Guardar un producto reemplaza sus variantes (borra e inserta): los ids cambian. Los carritos abiertos guardan opciones y precio como snapshot, así que el mensaje de WhatsApp sigue correcto.
- `npm test` (lógica pura, sin DB) es lo que corre CI. `npm run check` es un smoke contra un server corriendo con base sembrada.
