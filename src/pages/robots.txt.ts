import type { APIRoute } from 'astro';
import { abs } from '../lib/seo';

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${abs('/sitemap.xml')}\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
