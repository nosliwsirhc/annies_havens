// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// Mostly-static content site with one on-demand endpoint (the contact form).
// Pages are prerendered by default; the contact API route opts into SSR and
// runs as a Cloudflare Pages Function.
export default defineConfig({
  site: 'https://www.annieshavens.ca',
  output: 'static',
  adapter: cloudflare(),
  integrations: [sitemap()],
  // Images live in public/ and are referenced directly, so we don't need
  // sharp-based optimization. Passthrough avoids the native sharp dependency.
  image: { service: passthroughImageService() },
  prefetch: { prefetchAll: true },
});
