// Idempotent demo seed: upserts by slug, replaces each product's variants. Run: npm run db:seed (after npm run db:push)
// The six products are deliberately mixed so a fresh clone exercises every path the storefront can break:
// two-axis variants (Talla/Color, Tono/Tamaño, Capacidad/Color), no variants, no brand, all variants sold out, no price, on sale.
// An instance replaces this whole file with its real catalogue (or loads it from /admin).
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const categories = [
  { slug: 'ropa', name: 'Ropa', sort: 1 },
  { slug: 'cosmeticos', name: 'Cosméticos', sort: 2 },
  { slug: 'tecnologia', name: 'Tecnología', sort: 3 },
  { slug: 'hogar', name: 'Hogar', sort: 4 },
  { slug: 'accesorios', name: 'Accesorios', sort: 5 },
];

const brands = [
  { slug: 'marca-demo-a', name: 'Marca Demo A', tagline: 'Marca de ejemplo: reemplázala desde /admin/marcas.', sort: 1 },
  { slug: 'marca-demo-b', name: 'Marca Demo B', tagline: 'Otra marca de ejemplo.', sort: 2 },
];

const products = [
  { slug: 'polo-basico', name: 'Polo básico de algodón', category: 'ropa', brand: 'marca-demo-a', price: 14.9, featured: true, sort: 1,
    short_desc: 'Polo de algodón peinado, corte regular.', option1_label: 'Talla', option2_label: 'Color',
    specs: [['Material', '100% algodón'], ['Origen', 'Importado']],
    variants: [['S', 'Negro', 4, 'POLO-S-N'], ['M', 'Negro', 0, 'POLO-M-N'], ['L', 'Negro', 6, 'POLO-L-N'], ['M', 'Blanco', 3, 'POLO-M-B']] },
  { slug: 'labial-mate', name: 'Labial mate larga duración', category: 'cosmeticos', brand: 'marca-demo-b', price: 6.5, featured: true, sort: 1,
    short_desc: 'Acabado mate, hasta 12 horas.', option1_label: 'Tono', option2_label: 'Tamaño',
    variants: [['Nude 01', '3.5 g', 10], ['Rojo 05', '3.5 g', 2], ['Rosa 03', '3.5 g', 0]] },
  { slug: 'bateria-portatil', name: 'Batería portátil', category: 'tecnologia', brand: 'marca-demo-a', price: 24, compare_at: 29.9, featured: true, sort: 1,
    short_desc: 'Carga rápida USB-C, en oferta.', option1_label: 'Capacidad', option2_label: 'Color',
    variants: [['10000 mAh', 'Negro', 5], ['20000 mAh', 'Blanco', 3]] },
  { slug: 'organizador-cocina', name: 'Organizador de cocina', category: 'hogar', brand: null, price: 9.75, sort: 1,
    short_desc: 'Sin marca y sin variantes: siempre disponible.' },
  { slug: 'gorra-bordada', name: 'Gorra bordada', category: 'accesorios', brand: 'marca-demo-b', price: 12, sort: 1,
    short_desc: 'Todas sus variantes están en 0: se muestra agotada.', option1_label: 'Color',
    variants: [['Beige', '', 0], ['Negro', '', 0]] },
  { slug: 'perfume-importado', name: 'Perfume importado', category: 'cosmeticos', brand: 'marca-demo-a', price: null, featured: true, sort: 2,
    short_desc: 'Sin precio publicado: se confirma por WhatsApp.' },
];

const idsOf = async (table, rows) => {
  for (const r of rows) await sql`insert into ${sql(table)} ${sql(r)} on conflict (slug) do update set ${sql(r)}`;
  return Object.fromEntries((await sql`select id, slug from ${sql(table)}`).map((r) => [r.slug, r.id]));
};
const cat = await idsOf('categories', categories);
const brand = await idsOf('brands', brands);

for (const { category, brand: b, specs = [], variants = [], ...p } of products) {
  const row = {
    compare_at: null, option1_label: null, option2_label: null, featured: false, ...p,
    category_id: cat[category], brand_id: b ? brand[b] : null,
    specs: sql.json(specs.map(([label, value]) => ({ label, value }))), updated_at: new Date(),
  };
  const [{ id }] = await sql`insert into products ${sql(row)} on conflict (slug) do update set ${sql(row)} returning id`;
  await sql`delete from product_variants where product_id = ${id}`;
  for (const [i, [option1, option2, stock, sku = null]] of variants.entries()) {
    await sql`insert into product_variants ${sql({ product_id: id, option1, option2, stock, sku, sort: i })}`;
  }
}

await sql`insert into settings (id, whatsapp) values ('default', ${process.env.PUBLIC_WHATSAPP ?? ''}) on conflict (id) do nothing`;
const [c] = await sql`select (select count(*) from categories) c, (select count(*) from brands) b, (select count(*) from products) p, (select count(*) from product_variants) v`;
console.log(`seeded: ${c.c} categories, ${c.b} brands, ${c.p} products, ${c.v} variants`);
await sql.end();
