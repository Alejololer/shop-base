import { boolean, integer, jsonb, pgTable, serial, text, timestamp, doublePrecision, numeric } from 'drizzle-orm/pg-core';

export type Spec = { label: string; value: string };

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  sort: integer('sort').notNull().default(0),
  active: boolean('active').notNull().default(true),
});

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline'),
  description: text('description'),
  logoUrl: text('logo_url'),
  heroUrl: text('hero_url'),
  sort: integer('sort').notNull().default(0),
  active: boolean('active').notNull().default(true),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  // Nullable: many imported goods have no brand worth naming.
  brandId: integer('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2, mode: 'number' }),
  compareAt: numeric('compare_at', { precision: 10, scale: 2, mode: 'number' }),
  shortDesc: text('short_desc'),
  description: text('description'),
  heroUrl: text('hero_url'),
  gallery: jsonb('gallery').$type<string[]>().notNull().default([]),
  specs: jsonb('specs').$type<Spec[]>().notNull().default([]),
  // Variant axes are named per product: Talla/Color, Tono/Tamaño, Capacidad/Color. Null = no axis.
  option1Label: text('option1_label'),
  option2Label: text('option2_label'),
  featured: boolean('featured').notNull().default(false),
  active: boolean('active').notNull().default(true),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Stock is informational and edited by hand: checkout ends in WhatsApp, nothing confirms a sale.
export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  option1: text('option1').notNull().default(''),
  option2: text('option2').notNull().default(''),
  stock: integer('stock').notNull().default(0),
  sku: text('sku'),
  sort: integer('sort').notNull().default(0),
});

export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  city: text('city').notNull(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  mapsUrl: text('maps_url'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  hours: text('hours'),
  sort: integer('sort').notNull().default(0),
  active: boolean('active').notNull().default(true),
});

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  city: text('city'),
  product: text('product'),
  message: text('message'),
  source: text('source'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Single-row settings: WhatsApp number + message templates, editable from /admin.
export const settings = pgTable('settings', {
  id: text('id').primaryKey().default('default'),
  whatsapp: text('whatsapp').notNull().default(''),
  cartTemplate: text('cart_template').notNull().default('¡Hola! Quiero hacer este pedido:\n\n{items}\n\nTotal: {total}'),
  productTemplate: text('product_template').notNull().default('¡Hola! Me interesa "{name}". ¿Está disponible?'),
});

export type Category = typeof categories.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Variant = typeof productVariants.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Settings = typeof settings.$inferSelect;
