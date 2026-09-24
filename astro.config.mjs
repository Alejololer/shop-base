// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

export default defineConfig({
  site,
  output: 'server',
  adapter: vercel(),
  integrations: [
    sitemap({
      // customPages carry the canonical form (no trailing slash); drop the auto-discovered slash duplicates, admin and thank-you.
      filter: (page) => !/\/(admin|gracias)/.test(page) && (!page.endsWith('/') || new URL(page).pathname === '/'),
      customPages: ['/', '/productos', '/marcas', '/sucursales', '/nosotros', '/contacto'].map((p) => site + p),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  // Per-store: swap families here. Changing names? Also update the <Font> tags in layouts/Site.astro and pages/admin/login.astro.
  fonts: [
    { provider: fontProviders.google(), name: 'Inter', cssVariable: '--font-inter', weights: [400, 500, 600], subsets: ['latin'], fallbacks: ['system-ui', 'sans-serif'] },
    { provider: fontProviders.google(), name: 'Outfit', cssVariable: '--font-outfit', weights: [200, 300, 400, 500], styles: ['normal'], subsets: ['latin'], fallbacks: ['system-ui', 'sans-serif'] },
  ],
});
