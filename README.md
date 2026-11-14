# Annie's Havens Website

The website for **Annie's Havens**, a foster-care agency in Ontario that supports children and youth with developmental needs, special needs, and medical conditions. The site raises awareness and recruits foster parents.

**Live:** [www.annieshavens.ca](https://www.annieshavens.ca)

## Stack

The whole site lives in [`web/`](./web).

- **[Astro 7](https://astro.build/)** with static output, deployed to **Cloudflare Workers** through `@astrojs/cloudflare` 14. Pages are served from the Worker's static assets. Two API routes run in the Worker itself:
  - `web/src/pages/api/contact.ts`, the contact form. It checks **Cloudflare Turnstile**, validates the fields, and sends the inquiry through **Resend** to `recruitment@annieshavens.ca`.
  - `web/src/pages/api/resend-events.ts`, delivery alerts. Resend posts a webhook here when a site email bounces, fails, is suppressed or is reported as spam. The route then emails `ALERT_TO` with the lost inquiry.
- **GA4** analytics, loaded only after the visitor accepts the cookie banner.
- News articles are Markdown files in `web/src/content/news/` (an Astro content collection).
- Security headers are in `web/public/_headers` and redirects in `web/public/_redirects`.
- Fonts are Fraunces (headings) and Mulish (body). Design tokens are in `web/src/styles/global.css`.

## Develop

Requires **Node 24** (`web/.nvmrc`; CI reads the same file).

```bash
cd web
nvm use
npm install --ignore-scripts
npm run dev      # http://localhost:4321
npm run check    # type check
npm run build    # builds to web/dist
```

Locally, the contact form uses Cloudflare's always-pass Turnstile test keys. Without a Resend key, it reports success without sending anything. To try real settings, copy `web/.dev.vars.example` to `web/.dev.vars`, which is gitignored.

## Deploy

On a push to `master`, GitHub Actions (`.github/workflows/deploy.yml`) type-checks, builds and deploys `web/` to the `annies-havens-web` Worker. It's live in about 40 seconds. Pull requests get the same type check and build, without deploying. Only changes under `web/` or to the workflow itself start a run.

The workflow uses the repository secret `CLOUDFLARE_API_TOKEN`, a Cloudflare account API token with **Workers Scripts: Edit**.

## Worker secrets

These live on the Worker, not in the repo, and persist across deploys. Set one with `wrangler secret put <NAME> --name annies-havens-web`.

| Name | Purpose |
| --- | --- |
| `TURNSTILE_SECRET_KEY` | Turnstile's server-side key. Without it, the form refuses to send. |
| `RESEND_TOKEN` | Resend API key. It needs full access, because delivery alerts read the lost email back. |
| `RESEND_WEBHOOK_SECRET` | The Resend webhook's signing secret (`whsec_...`). |
| `ALERT_TO` | Where delivery alerts go: one address, or several separated by commas. Use an agency mailbox other than `CONTACT_TO`, so alerts still arrive when that address is the problem. |
| `CONTACT_TO`, `CONTACT_FROM` | Optional. They default to `recruitment@annieshavens.ca` and `Annie's Havens <noreply@annieshavens.ca>`. |

## When inquiries go missing

Resend answers a send to a suppressed address with a success, so the form says "Message sent" even though nothing arrives. From July to November 2026, every inquiry was lost this way after one bounce. The delivery alerts now report it the same day. To investigate:

1. In the [Resend dashboard](https://resend.com/emails), check each email's status.
2. Under **Emails > Suppressions**, remove the address once it accepts mail again.
3. Under **Webhooks**, check the endpoint's delivery log.
4. Copy out anything you need promptly. Resend keeps emails for 30 days on the current plan, and nothing else stores inquiries.

If an alert itself can't be delivered, the `CONTACT_TO` mailbox gets one notice a day saying that alerts are failing.

## Adding a news article

Create `web/src/content/news/<slug>.md`. The filename becomes the URL (`/news/<slug>`). The frontmatter has these fields:
- `title`, `description` and `date` (YYYY-MM-DD);
- optionally `author`, which defaults to "Annie's Havens";
- optionally `youtube`, a video ID.

The article appears on `/news` once it is committed and pushed to `master`.

## Repo structure

- **`web/`**: the live Astro site. All development happens here.
- **`.github/workflows/deploy.yml`**: the type check, build and deploy.
- The retired v1 (Express, Handlebars and MaterializeCSS, formerly on a DigitalOcean droplet) used to sit at the repo root. It was deleted on 2026-05-31 and can be recovered from git history (last present at commit `b537f39`).

## Working notes

[`CLAUDE.md`](./CLAUDE.md) has the project conventions (Title Case, no em dashes, no emojis), deploy and token rules, and DNS cautions.
