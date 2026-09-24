import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db, hasDb, schema } from './client';

const { brands, categories, products, productVariants, locations } = schema;

export type ProductRow = {
  product: schema.Product;
  brand: schema.Brand | null;
  category: schema.Category | null;
  variants: schema.Variant[];
};

const none = <T>(v: T) => (hasDb ? null : v);

export const activeBrands = async () =>
  none([] as schema.Brand[]) ?? db.select().from(brands).where(eq(brands.active, true)).orderBy(asc(brands.sort), asc(brands.name));
export const activeCategories = async () =>
  none([] as schema.Category[]) ??
  db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sort), asc(categories.name));
export const activeLocations = async () =>
  none([] as schema.Location[]) ?? db.select().from(locations).where(eq(locations.active, true)).orderBy(asc(locations.sort));

export const brandBySlug = async (slug: string) =>
  hasDb ? db.query.brands.findFirst({ where: and(eq(brands.slug, slug), eq(brands.active, true)) }) : undefined;
export const locationBySlug = async (slug: string) =>
  hasDb ? db.query.locations.findFirst({ where: and(eq(locations.slug, slug), eq(locations.active, true)) }) : undefined;

export async function getSettings(): Promise<schema.Settings> {
  const fallback = { id: 'default', whatsapp: import.meta.env.PUBLIC_WHATSAPP ?? '', cartTemplate: '', productTemplate: '' };
  if (!hasDb) return fallback;
  const row = await db.query.settings.findFirst();
  return { ...row!, whatsapp: row?.whatsapp || fallback.whatsapp } as schema.Settings;
}

async function withVariants(rows: Omit<ProductRow, 'variants'>[]): Promise<ProductRow[]> {
  const ids = rows.map((r) => r.product.id);
  const vs = ids.length
    ? await db.select().from(productVariants).where(inArray(productVariants.productId, ids)).orderBy(asc(productVariants.sort), asc(productVariants.id))
    : [];
  return rows.map((r) => ({ ...r, variants: vs.filter((v) => v.productId === r.product.id) }));
}

const baseQuery = () =>
  db
    .select({ product: products, brand: brands, category: categories })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id));

/** Active products with brand, category and variants. Filtering in JS: catalog is hundreds of rows at most. */
export async function activeProducts(filter: { brand?: string; category?: string; featured?: boolean } = {}): Promise<ProductRow[]> {
  if (!hasDb) return [];
  const rows = await baseQuery()
    .where(eq(products.active, true))
    .orderBy(desc(products.featured), asc(products.sort), asc(products.name));
  // An inactive brand/category hides its products, but products with none stay visible.
  const visible = rows.filter(
    ({ product, brand, category }) =>
      (!brand || brand.active) &&
      (!category || category.active) &&
      (!filter.brand || brand?.slug === filter.brand) &&
      (!filter.category || category?.slug === filter.category) &&
      (!filter.featured || product.featured),
  );
  return withVariants(visible);
}

export async function productBySlug(slug: string): Promise<ProductRow | undefined> {
  if (!hasDb) return undefined;
  const rows = await baseQuery().where(and(eq(products.slug, slug), eq(products.active, true))).limit(1);
  return (await withVariants(rows))[0];
}
