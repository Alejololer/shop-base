import type { APIRoute } from 'astro';
import { desc } from 'drizzle-orm';
import { db, schema } from '../../db/client';

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export const GET: APIRoute = async () => {
  const rows = await db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt));
  const head = ['fecha', 'nombre', 'telefono', 'email', 'ciudad', 'producto', 'mensaje', 'origen'];
  const body = rows.map((l) => [l.createdAt.toISOString(), l.name, l.phone, l.email, l.city, l.product, l.message, l.source].map(esc).join(','));
  return new Response('﻿' + [head.join(','), ...body].join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="leads.csv"', 'Cache-Control': 'private, no-store' },
  });
};
