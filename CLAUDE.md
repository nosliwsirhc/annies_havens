# Working on the Annie's Havens website

Annie's Havens is an Ontario foster-care agency that supports children and youth with developmental needs, special needs, and medical conditions. This site exists to recruit foster parents and explain the program. Tone is **warm, trustworthy, and human** — never salesy or clinical.

## Repo layout (important)

- **`web/`** — the **LIVE site** and the whole project. An Astro app deployed to Cloudflare Pages. **All real work happens here.**
- The retired v1 (Express + Handlebars + MaterializeCSS) used to live at the repo root; it was deleted on 2026-05-31 and remains recoverable from git history (it was last present at commit `b537f39`).

## Stack (web/)

- **Astro 5**, static output, `@astrojs/cloudflare` adapter, `@astrojs/sitemap`.
- `passthroughImageService()` (no `sharp`) — images are pre-generated files in `web/public/images/`.
- Fonts: **Fraunces** (display/headings) + **Mulish** (body). Design tokens live in `web/src/styles/global.css`.
- One server endpoint: `web/src/pages/api/contact.ts` (`prerender = false`) runs as a Cloudflare Pages Function. Everything else is static.

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

**Push to `master` → GitHub Actions auto-builds and deploys to Cloudflare Pages** (`.github/workflows/deploy.yml`). No manual step. Live in ~40s.

- The GH Actions secret **`CLOUDFLARE_API_TOKEN` is a persistent Pages:Edit token. DO NOT roll it** — rolling it breaks CI.
- Runtime secrets (`RESEND_TOKEN`, `TURNSTILE_SECRET_KEY`, `CONTACT_TO`, `CONTACT_FROM`) live on the Cloudflare Pages **project**, not in the repo, and persist across deploys.

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
- **Never touch the mail / Microsoft 365 / Resend DNS records** (SPF, DKIM, DMARC, autodiscover, sip, lync, sendlayer, `send.`, `resend._domainkey`, enterprise enrollment/registration). Only the `www` and apex web records point at Cloudflare Pages.
- Analytics property to use is **`annieshavens.ca - GA4` (`G-MEVS4XBLNL`)**. A second property (`ah-foster-care` / `G-RED0CX4VTP`) is a dormant duplicate — ignore it.
