// Types for the Cloudflare Worker runtime module the API endpoints import
// (src/pages/api/*.ts). Only `env` is used: the Worker's vars and secrets,
// set with `wrangler secret put <NAME> --name annies-havens-web`.
declare module 'cloudflare:workers' {
  export const env: {
    TURNSTILE_SECRET_KEY?: string;
    RESEND_TOKEN?: string;
    RESEND_API_KEY?: string;
    CONTACT_TO?: string;
    CONTACT_FROM?: string;
    // Delivery alerts (src/pages/api/resend-events.ts).
    RESEND_WEBHOOK_SECRET?: string;
    ALERT_TO?: string;
  };
}
