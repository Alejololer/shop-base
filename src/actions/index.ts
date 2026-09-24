import { ActionError, defineAction } from 'astro:actions';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db/client';
import { COOKIE, checkPassword, issueToken, loginBlocked, recordLogin } from '../lib/auth';
import { uploadImage, uploadImages } from '../lib/blob';
import { parseRows, slugify } from '../lib/format';
import { parseVariants } from '../lib/shop';

const { brands, categories, products, productVariants, locations, leads, settings } = schema;

const id = z.coerce.number().int().positive();
const optId = z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().int().positive().optional());
const bool = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean());
const nil = (v: unknown) => (v == null || v === '' ? undefined : v);
const file = z.preprocess(nil, z.instanceof(File).optional());
// Arrays must stay unwrapped so Astro uses formData.getAll(); empty file inputs are filtered in uploadImages.
const files = z.array(z.instanceof(File)).optional();
const str = z.string().trim();
const optStr = z.preprocess(nil, z.string().trim().optional()).transform((v) => (v ? v : null));
const optInt = z.preprocess(nil, z.coerce.number().int().optional());
const optFloat = z.preprocess(nil, z.coerce.number().optional());
const optMoney = z.preprocess(nil, z.coerce.number().nonnegative().optional()).transform((v) => v ?? null);
const nullId = optId.transform((v) => v ?? null);

const cookieOpts = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: import.meta.env.PROD, maxAge: 7 * 86400 };

export const server = {
  lead: defineAction({
    accept: 'form',
    input: z.object({
      name: str.min(2, 'Ingresa tu nombre'),
      phone: str.min(7, 'Ingresa un teléfono válido'),
      email: optStr,
      city: optStr,
      product: optStr,
      message: optStr,
      source: optStr,
    }),
    handler: async (input) => {
      await db.insert(leads).values(input);
      return { ok: true };
    },
  }),

  login: defineAction({
    accept: 'form',
    input: z.object({ password: z.string() }),
    handler: async ({ password }, ctx) => {
      const ip = ctx.clientAddress;
      if (loginBlocked(ip)) throw new ActionError({ code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Espera 15 minutos.' });
      const ok = checkPassword(password);
      recordLogin(ip, ok);
      if (!ok) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Contraseña incorrecta' });
      ctx.cookies.set(COOKIE, issueToken(), cookieOpts);
      return { ok: true };
    },
  }),

  logout: defineAction({
    accept: 'form',
    handler: async (_, ctx) => {
      ctx.cookies.delete(COOKIE, { path: '/' });
      return { ok: true };
    },
  }),

  saveCategory: defineAction({
    accept: 'form',
    input: z.object({ id: optId, name: str.min(1), slug: optStr, description: optStr, sort: optInt, active: bool, image: file, imageUrl: optStr }),
    handler: async ({ id, image, imageUrl, ...c }) => {
      const values = { ...c, slug: c.slug || slugify(c.name), sort: c.sort ?? 0, imageUrl: (await uploadImage(image, 'categories')) ?? imageUrl };
      if (id) await db.update(categories).set(values).where(eq(categories.id, id));
      else await db.insert(categories).values(values);
      return { ok: true };
    },
  }),

  deleteCategory: defineAction({
    accept: 'form',
    input: z.object({ id }),
    handler: async ({ id }) => { await db.delete(categories).where(eq(categories.id, id)); return { ok: true }; },
  }),

  saveBrand: defineAction({
    accept: 'form',
    input: z.object({
      id: optId,
      name: str.min(1),
      slug: optStr,
      tagline: optStr,
      description: optStr,
      sort: optInt,
      active: bool,
      logo: file,
      hero: file,
      logoUrl: optStr,
      heroUrl: optStr,
    }),
    handler: async ({ id, logo, hero, logoUrl, heroUrl, ...b }) => {
      const values = {
        ...b,
        slug: b.slug || slugify(b.name),
        sort: b.sort ?? 0,
        logoUrl: (await uploadImage(logo, 'brands')) ?? logoUrl,
        heroUrl: (await uploadImage(hero, 'brands')) ?? heroUrl,
      };
      if (id) await db.update(brands).set(values).where(eq(brands.id, id));
      else await db.insert(brands).values(values);
      return { ok: true };
    },
  }),

  deleteBrand: defineAction({
    accept: 'form',
    input: z.object({ id }),
    handler: async ({ id }) => { await db.delete(brands).where(eq(brands.id, id)); return { ok: true }; },
  }),

  saveProduct: defineAction({
    accept: 'form',
    input: z.object({
      id: optId,
      categoryId: nullId,
      brandId: nullId,
      name: str.min(1),
      slug: optStr,
      price: optMoney,
      compareAt: optMoney,
      shortDesc: optStr,
      description: optStr,
      specs: optStr,
      option1Label: optStr,
      option2Label: optStr,
      variants: optStr,
      featured: bool,
      active: bool,
      sort: optInt,
      hero: file,
      heroUrl: optStr,
      gallery: files,
      keepGallery: z.array(z.string()).optional(),
    }),
    handler: async ({ id, hero, heroUrl, gallery, keepGallery, specs, variants, ...p }) => {
      const values = {
        ...p,
        slug: p.slug || slugify(p.name),
        sort: p.sort ?? 0,
        specs: parseRows(specs),
        heroUrl: (await uploadImage(hero, 'products')) ?? heroUrl,
        gallery: [...(keepGallery ?? []), ...(await uploadImages(gallery, 'products'))],
        updatedAt: new Date(),
      };
      const rows = parseVariants(variants);
      await db.transaction(async (tx) => {
        const productId = id
          ? (await tx.update(products).set(values).where(eq(products.id, id)).returning({ id: products.id }))[0]?.id
          : (await tx.insert(products).values(values).returning({ id: products.id }))[0].id;
        if (!productId) throw new ActionError({ code: 'NOT_FOUND', message: 'Producto no encontrado' });
        // ponytail: replace-all keeps save idempotent; variant ids change on every save. Carts snapshot options, so open carts still read right.
        await tx.delete(productVariants).where(eq(productVariants.productId, productId));
        if (rows.length) await tx.insert(productVariants).values(rows.map((r) => ({ ...r, productId })));
      });
      return { ok: true };
    },
  }),

  deleteProduct: defineAction({
    accept: 'form',
    input: z.object({ id }),
    handler: async ({ id }) => { await db.delete(products).where(eq(products.id, id)); return { ok: true }; },
  }),

  saveLocation: defineAction({
    accept: 'form',
    input: z.object({
      id: optId,
      city: str.min(1),
      name: str.min(1),
      slug: optStr,
      address: str.min(1),
      phone: optStr,
      whatsapp: optStr,
      mapsUrl: optStr,
      lat: optFloat,
      lng: optFloat,
      hours: optStr,
      sort: optInt,
      active: bool,
    }),
    handler: async ({ id, ...l }) => {
      const values = { ...l, slug: l.slug || slugify(`${l.city} ${l.name}`), sort: l.sort ?? 0 };
      if (id) await db.update(locations).set(values).where(eq(locations.id, id));
      else await db.insert(locations).values(values);
      return { ok: true };
    },
  }),

  deleteLocation: defineAction({
    accept: 'form',
    input: z.object({ id }),
    handler: async ({ id }) => { await db.delete(locations).where(eq(locations.id, id)); return { ok: true }; },
  }),

  deleteLead: defineAction({
    accept: 'form',
    input: z.object({ id }),
    handler: async ({ id }) => { await db.delete(leads).where(eq(leads.id, id)); return { ok: true }; },
  }),

  saveSettings: defineAction({
    accept: 'form',
    input: z.object({ whatsapp: str, cartTemplate: str.min(1), productTemplate: str.min(1) }),
    handler: async (s) => {
      const values = { ...s, whatsapp: s.whatsapp.replace(/\D/g, '') };
      await db.insert(settings).values({ id: 'default', ...values }).onConflictDoUpdate({ target: settings.id, set: values });
      return { ok: true };
    },
  }),
};
