# Working on the Annie's Havens website

Annie's Havens is an Ontario foster-care agency that supports children and youth with developmental needs, special needs, and medical conditions. This site exists to recruit foster parents and explain the program. Tone is **warm, trustworthy, and human** — never salesy or clinical.

## Repo layout (important)

- **`web/`** — the **LIVE site** and the whole project. An Astro app deployed to Cloudflare Pages. **All real work happens here.**
- The retired v1 (Express + Handlebars + MaterializeCSS) used to live at the repo root; it was deleted on 2026-05-31 and remains recoverable from git history (it was last present at commit `b537f39`).

## Stack (web/)

- **Astro 6**, static output, `@astrojs/cloudflare` v13 adapter (Cloudflare **Workers** target), `@astrojs/sitemap`.
- `passthroughImageService()` (no `sharp`) — images are pre-generated files in `web/public/images/`. The adapter is configured with `imageService: 'compile'` so no Cloudflare Images binding is required.
- We don't use Astro sessions; `session: { driver: 'memory' }` in `astro.config.mjs` keeps the adapter from emitting a `SESSION` KV binding that would need a provisioned namespace.
- Fonts: **Fraunces** (display/headings) + **Mulish** (body). Design tokens live in `web/src/styles/global.css`.
- One server endpoint: `web/src/pages/api/contact.ts` (`prerender = false`) runs inside the Worker. It reads runtime env (RESEND etc.) via `import { env } from 'cloudflare:workers'` (Astro 6 removed `Astro.locals.runtime.env`). Everything else is static, served from the Worker's `ASSETS` binding.

## Local dev

Pinned to **Node 22** (`web/.nvmrc`). Run commands inside `web/`:

```bash
cd web
nvm use            # or: source ~/.nvm/nvm.sh && nvm use
npm install --ignore-scripts   # first time
npm run dev        # local dev server
npm run build      # production build into web/dist
```

If you ever deploy manually, use `./node_modules/.bin/wrangler` (the global `npx wrangler@latest` fails silently in this sandbox).

## Deploy: just push

**Push to `master` → GitHub Actions auto-builds and deploys to Cloudflare Workers** (`.github/workflows/deploy.yml`). No manual step. Live in ~40s. The deploy runs `wrangler deploy --config dist/server/wrangler.json` (the config the adapter emits at build time). The Worker is named **`annies-havens-web`** (from `package.json` "name").

- The GH Actions secret **`CLOUDFLARE_API_TOKEN`** must have **Workers Scripts:Edit** scope (the old Pages:Edit scope does not work for `wrangler deploy`). It's persistent; don't roll it without updating the secret.
- Runtime secrets (`RESEND_TOKEN`, `TURNSTILE_SECRET_KEY`, `CONTACT_TO`, `CONTACT_FROM`) live on the **Worker** (set with `wrangler secret put <NAME> --name annies-havens-web`), not in the repo, and persist across deploys.
- Migrated off Cloudflare Pages on 2026-05-31 when Astro 6 / adapter v13 dropped Pages support. The old Pages project can be deleted once the Worker + DNS are confirmed live.

## Adding a news article

One Markdown file = one article. Create `web/src/content/news/<slug>.md`; the filename becomes the URL (`/news/<slug>`). Frontmatter: `title`, `description`, `date` (YYYY-MM-DD), optional `author` (defaults to "Annie's Havens"), optional `youtube` (video ID). Body is plain Markdown. It auto-appears on `/news`. Commit + push to publish.

## Conventions (the user cares about these)

- **Title Case** for headings and buttons.
- **No em dashes** — use a regular hyphen or rephrase.
- **No emojis** anywhere in the UI.
- **Analytics is opt-in** (`ConsentBanner.astro`, GA4 `G-MEVS4XBLNL`) — nothing loads until the visitor clicks Accept. Gate any new tracking the same way (`window.gtag?.(...)`).
- Use **real Annie's Havens content**, not placeholder/mockup copy.

## DNS / infrastructure — handle with care

- Canonical host is **`www.annieshavens.ca`**; the apex 301-redirects to it (a Cloudflare Dynamic Redirect rule that excludes `/api/`).
- **Never touch the mail / Microsoft 365 / Resend DNS records** (SPF, DKIM, DMARC, autodiscover, sip, lync, sendlayer, `send.`, `resend._domainkey`, enterprise enrollment/registration). Only the `www` and apex web records point at Cloudflare (now the Worker's custom-domain route, formerly the Pages project).
- Analytics property to use is **`annieshavens.ca - GA4` (`G-MEVS4XBLNL`)**. A second property (`ah-foster-care` / `G-RED0CX4VTP`) is a dormant duplicate — ignore it.
