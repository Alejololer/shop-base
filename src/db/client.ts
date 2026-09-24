import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL;
// ponytail: no DATABASE_URL → queries return empty instead of crashing, so a fresh clone of the
// template builds and renders. postgres.js connects lazily, so the placeholder URL is never dialed.
export const hasDb = Boolean(url);
// One driver for local Postgres and Neon. prepare:false keeps it compatible with Neon's pooled endpoint.
const sql = postgres(url || 'postgres://localhost/unset', { prepare: false, max: 5 });
export const db = drizzle(sql, { schema });
export { schema };
