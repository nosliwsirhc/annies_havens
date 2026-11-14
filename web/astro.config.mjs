// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import { unified } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import remarkArticle from './src/lib/remark-article.mjs';

// Vite 7's default browser targets (Vite 8 raised them; see `vite` below).
const VITE7_BROWSERS = ['chrome107', 'edge107', 'firefox104', 'safari16'];

// Mostly-static content site with two on-demand endpoints (the contact form
// and Resend's delivery events). Pages are prerendered by default; the API
// routes opt into SSR and run as a Cloudflare Worker (static assets + a server entry).
export default defineConfig({
  site: 'https://www.annieshavens.ca',
  output: 'static',
  trailingSlash: 'never',
  // Emit flat files (/about-us.html, not /about-us/index.html) so Cloudflare's
  // static asset handling serves no-slash URLs with a 200 instead of
  // redirecting to a trailing slash - keeps the served URL matching our
  // no-slash canonicals.
  build: { format: 'file' },
  // Astro 7 changed the default to 'jsx', which strips whitespace between
  // inline elements on separate lines (e.g. the byline's date / bullet /
  // author spans). Keep the HTML-aware behaviour the templates were written for.
  compressHTML: true,
  // imageService 'compile' transforms images at build time for prerendered
  // routes instead of using a runtime Cloudflare Images binding. We already
  // pre-generate every image and use passthroughImageService below, so this
  // just avoids requiring an IMAGES binding on the Worker.
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [sitemap()],
  // Images live in public/ and are referenced directly, so we don't need
  // sharp-based optimization. Passthrough avoids the native sharp dependency.
  image: { service: passthroughImageService() },
  prefetch: { prefetchAll: true },
  // Vite 8 (Astro 7) raised its default browser target to Safari 16.4. For
  // CSS that lets the minifier rewrite `@media (max-width: 520px)` as
  // `(width <= 520px)`, which older iPhones ignore (they'd get the desktop
  // layout); for JS it would let newer syntax through unlowered. Keep Vite 7's
  // targets so the site works where it did before. Set both: in this build
  // cssTarget does not pick up `target` on its own.
  vite: { build: { target: VITE7_BROWSERS, cssTarget: VITE7_BROWSERS } },
  // We don't use Astro sessions. Opting out keeps the Cloudflare adapter from
  // wiring a KV-backed session (and a SESSION binding that would need a
  // provisioned namespace at deploy time).
  session: false,
  markdown: {
    // Astro 7 renders Markdown with Satteri by default. Our article
    // directives (:::pullquote, :::stats, ::figure, ...) are remark plugins,
    // so stay on the unified (remark/rehype) pipeline. remarkDirective must
    // run first to parse the syntax; remarkArticle then rewrites the nodes
    // onto the editorial classes in global.css.
    processor: unified({ remarkPlugins: [remarkDirective, remarkArticle] }),
  },
});
