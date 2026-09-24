// Smoke check against a RUNNING server with a SEEDED database (npm run db:seed). Not for CI — `npm test` is.
// Usage: BASE=http://localhost:4321 node --env-file=.env scripts/check.mjs   (defaults to localhost:4321)
import assert from 'node:assert/strict';
import postgres from 'postgres';

const BASE = process.env.BASE ?? 'http://localhost:4321';
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const [c] = await sql`select (select count(*)::int from products) p, (select count(*)::int from categories) c, (select count(*)::int from product_variants) v`;
assert.ok(c.p >= 6 && c.c >= 1 && c.v >= 1, `seed counts ${JSON.stringify(c)}`);
const [bad] = await sql`select count(*)::int n from products where jsonb_typeof(gallery) <> 'array' or jsonb_typeof(specs) <> 'array'`;
assert.equal(bad.n, 0, 'jsonb columns must be arrays');
await sql.end();

const get = async (p) => { const r = await fetch(BASE + p, { redirect: 'manual' }); return { status: r.status, text: r.status === 200 ? await r.text() : '' }; };
for (const p of ['/', '/productos', '/productos?categoria=ropa', '/marcas', '/sucursales', '/nosotros', '/contacto', '/robots.txt']) assert.equal((await get(p)).status, 200, p);

const polo = await get('/productos/polo-basico');
assert.equal(polo.status, 200);
assert.match(polo.text, /"@type":"Product"/, 'product JSON-LD');
assert.match(polo.text, /<link rel="canonical"/, 'canonical');
assert.match(polo.text, /name="variant"/, 'variant picker');
// The two stock paths must stay opposite:
assert.doesNotMatch((await get('/productos/organizador-cocina')).text, /name="variant"|>Agotado</, 'no variants: no picker, never sold out');
assert.match((await get('/productos/gorra-bordada')).text, />Agotado</, 'all variants at 0: sold out');

const sm = await get('/sitemap.xml');
assert.match(sm.text, /\/productos\/polo-basico<\/loc><lastmod>/, 'product pages in sitemap');
assert.doesNotMatch(sm.text, /\/admin|\/gracias/, 'sitemap excludes admin and thank-you');
assert.match((await get('/robots.txt')).text, /Sitemap: .*\/sitemap\.xml/, 'robots points to sitemap');
assert.equal((await get('/admin')).status, 302, 'admin must redirect when logged out');
assert.equal((await get('/no-existe')).status, 404);
console.log('check ok');
