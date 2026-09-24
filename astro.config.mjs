// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

export default defineConfig({
  site,
  output: 'server',
  adapter: vercel(),
  // Sitemap is a dynamic endpoint (src/pages/sitemap.xml.ts) so products added in /admin are listed without a rebuild.
  vite: { plugins: [tailwindcss()] },
  // Per-store: swap families here. Changing names? Also update the <Font> tags in layouts/Site.astro and pages/admin/login.astro.
  fonts: [
    { provider: fontProviders.google(), name: 'Inter', cssVariable: '--font-inter', weights: [400, 500, 600], subsets: ['latin'], fallbacks: ['system-ui', 'sans-serif'] },
    { provider: fontProviders.google(), name: 'Outfit', cssVariable: '--font-outfit', weights: [200, 300, 400, 500], styles: ['normal'], subsets: ['latin'], fallbacks: ['system-ui', 'sans-serif'] },
  ],
});
