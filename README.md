# Annie's Havens Website

The website for **Annie's Havens**, a foster-care agency in Ontario that supports children and youth with developmental needs, special needs, and medical conditions. The site's purpose is to raise awareness and recruit foster parents.

🌐 **Live:** [www.annieshavens.ca](https://www.annieshavens.ca)

## Current stack (the live site lives in [`web/`](./web))

- **[Astro](https://astro.build/)** (static output) deployed to **Cloudflare Pages**
- **Cloudflare Turnstile** + **Resend** power the contact form (a Cloudflare Pages Function at `web/src/pages/api/contact.ts`)
- **GA4** analytics, opt-in via a cookie-consent banner
- Fonts: Fraunces (display) + Mulish (body); design tokens in `web/src/styles/global.css`
- News/articles are Markdown files in `web/src/content/news/` (Astro content collections)

## Develop

Requires **Node 22** (see `web/.nvmrc`).

```bash
cd web
nvm use
npm install --ignore-scripts
npm run dev      # http://localhost:4321
npm run build    # builds to web/dist
```

## Deploy

Continuous deployment: **pushing to `master` triggers a GitHub Actions workflow** (`.github/workflows/deploy.yml`) that builds `web/` and deploys to Cloudflare Pages automatically. No manual step.

## Repo structure

- **`web/`** — the live Astro site (all active development); the whole project lives here.
- The retired v1 (Express + Handlebars + MaterializeCSS, formerly on a DigitalOcean droplet) used to sit at the repo root. It was deleted on 2026-05-31 and is recoverable from git history (last present at commit `b537f39`).

## Working notes

See [`CLAUDE.md`](./CLAUDE.md) for project conventions, the article-publishing workflow, deploy/token rules, and DNS cautions.
