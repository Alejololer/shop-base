import { defineMiddleware } from 'astro:middleware';
import { COOKIE, verifyToken } from './lib/auth';

const PUBLIC = new Set(['/admin/login', '/_actions/login', '/_actions/lead']);

export const onRequest = defineMiddleware((ctx, next) => {
  const { pathname } = ctx.url;
  const guarded = pathname.startsWith('/admin') || pathname.startsWith('/_actions');
  if (guarded && !PUBLIC.has(pathname) && !verifyToken(ctx.cookies.get(COOKIE)?.value)) {
    return pathname.startsWith('/_actions') ? new Response('Unauthorized', { status: 401 }) : ctx.redirect('/admin/login');
  }
  return next();
});
