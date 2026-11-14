// Types for the Cloudflare Worker runtime module the contact endpoint imports
// (src/pages/api/contact.ts). Only `env` is used: the Worker's vars and
// secrets, set with `wrangler secret put <NAME> --name annies-havens-web`.
declare module 'cloudflare:workers' {
  export const env: {
    TURNSTILE_SECRET_KEY?: string;
    RESEND_TOKEN?: string;
    RESEND_API_KEY?: string;
    CONTACT_TO?: string;
    CONTACT_FROM?: string;
  };
}
