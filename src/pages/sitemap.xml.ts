import type { APIRoute } from 'astro';
import { activeBrands, activeLocations, activeProducts } from '../db/queries';
import { abs } from '../lib/seo';

// Dynamic sitemap: products created in /admin appear without a rebuild. Hidden products (and those
// under a hidden brand/category) drop out because activeProducts() already filters them.
// ponytail: one file, no index. Google's limit is 50k URLs per sitemap; split into an index past that.
const STATIC = ['/', '/productos', '/marcas', '/sucursales', '/nosotros', '/contacto'];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const GET: APIRoute = async () => {
  const [products, brands, locations] = await Promise.all([activeProducts(), activeBrands(), activeLocations()]);
  const urls: { loc: string; lastmod?: Date }[] = [
    ...STATIC.map((p) => ({ loc: p })),
    ...products.map(({ product }) => ({ loc: `/productos/${product.slug}`, lastmod: product.updatedAt })),
    ...brands.map((b) => ({ loc: `/marcas/${b.slug}` })),
    ...locations.map((l) => ({ loc: `/sucursales/${l.slug}` })),
  ];
  const body = urls
    .map((u) => `<url><loc>${esc(abs(u.loc))}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString()}</lastmod>` : ''}</url>`)
    .join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' },
  });
};
