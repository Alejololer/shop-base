import { SITE } from '../config/site';
import type { Brand, Category, Location, Product, Variant } from '../db/schema';
import { soldOut } from './shop';

export const SITE_NAME = SITE.name;

export const site = () => import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:4321';
export const abs = (path: string) => new URL(path, site()).href;

const sameAs = [SITE.instagram, SITE.facebook].filter(Boolean);

export const locationJsonLd = (l: Location) => ({
  '@type': 'Store',
  '@id': abs(`/sucursales/${l.slug}#place`),
  name: `${SITE.name} ${l.city}`,
  url: abs(`/sucursales/${l.slug}`),
  ...(l.phone || SITE.phone ? { telephone: l.phone ?? SITE.phone } : {}),
  address: { '@type': 'PostalAddress', streetAddress: l.address, addressLocality: l.city, addressCountry: SITE.country },
  ...(l.lat && l.lng ? { geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng } } : {}),
  ...(l.hours ? { openingHours: l.hours } : {}),
  ...(l.mapsUrl ? { hasMap: l.mapsUrl } : {}),
});

export const orgJsonLd = (locs: Location[]) => ({
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  '@id': abs('/#store'),
  name: SITE.name,
  url: site(),
  ...(SITE.email ? { email: SITE.email } : {}),
  ...(SITE.phone ? { telephone: SITE.phone } : {}),
  ...(sameAs.length ? { sameAs } : {}),
  areaServed: SITE.country,
  ...(locs.length ? { department: locs.map(locationJsonLd) } : {}),
});

export const productJsonLd = (p: Product, b: Brand | null, c: Category | null, variants: Variant[]) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: p.name,
  ...(b ? { brand: { '@type': 'Brand', name: b.name } } : {}),
  ...(c ? { category: c.name } : {}),
  image: [p.heroUrl, ...p.gallery].filter((u): u is string => !!u).map(abs),
  ...(p.shortDesc ? { description: p.shortDesc } : {}),
  ...(variants[0]?.sku ? { sku: variants[0].sku } : {}),
  url: abs(`/productos/${p.slug}`),
  ...(p.price != null
    ? {
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: SITE.currency,
          availability: soldOut(variants) ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          seller: { '@id': abs('/#store') },
        },
      }
    : {}),
});

export const breadcrumbJsonLd = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
});
