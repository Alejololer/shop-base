import { createHmac, timingSafeEqual } from 'node:crypto';

// ponytail: single admin, password in env, stateless HMAC cookie. Add a users table when staff accounts are needed.
export const COOKIE = 'am_admin';
const secret = () => {
  const s = import.meta.env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!s && import.meta.env.PROD) throw new Error('SESSION_SECRET is required in production');
  return s ?? 'dev-secret';
};
const sign = (v: string) => createHmac('sha256', secret()).update(v).digest('base64url');
const safeEq = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function checkPassword(input: string) {
  const expected = import.meta.env.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? '';
  return expected.length > 0 && safeEq(input, expected);
}

export function issueToken(days = 7) {
  const exp = String(Date.now() + days * 86_400_000);
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token?: string) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  return Number(exp) > Date.now() && safeEq(sig, sign(exp));
}

// ponytail: in-memory per-IP limiter; Fluid Compute reuses instances so it holds up for one admin.
// Ceiling: not shared across instances/regions. Upgrade path: Vercel Firewall rate-limit rule on /_actions/login.
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60_000;
const fails = new Map<string, { n: number; until: number }>();

export function loginBlocked(ip: string) {
  const f = fails.get(ip);
  if (f && f.until < Date.now()) fails.delete(ip);
  return (fails.get(ip)?.n ?? 0) >= MAX_FAILS;
}

export function recordLogin(ip: string, ok: boolean) {
  if (ok) return void fails.delete(ip);
  const f = fails.get(ip) ?? { n: 0, until: 0 };
  fails.set(ip, { n: f.n + 1, until: Date.now() + WINDOW_MS });
}
