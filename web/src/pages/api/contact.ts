import type { APIRoute } from 'astro';
// Worker environment (bindings, vars, secrets). In Astro 6+ the Cloudflare
// adapter removed `Astro.locals.runtime.env`; the supported replacement is
// the `env` export from the `cloudflare:workers` virtual module (typed in
// src/cloudflare-workers.d.ts).
import { env } from 'cloudflare:workers';
import { isValidEmail, isValidPhone } from '../../lib/form';

// On-demand: runs as a Cloudflare Worker route, not prerendered.
export const prerender = false;

const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
// Cloudflare's documented always-pass test secret. Only used in local dev;
// production must have TURNSTILE_SECRET_KEY set or the form refuses to send.
const TEST_SECRET = '1x0000000000000000000000000000000AA';

// Generous caps so a real message is never cut short, but a bot can't post
// megabytes through to the mail service.
const MAX_SHORT = 200;
const MAX_MESSAGE = 5000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Read a field as a trimmed string whatever the client sent (a number, null,
// an object), and cap its length.
const field = (data: Record<string, unknown>, key: string, max: number) => {
  const raw = data[key];
  return (typeof raw === 'string' ? raw : raw == null ? '' : String(raw)).trim().slice(0, max);
};
// Names end up in the email subject, which must stay on one line.
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ');

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    data = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  const first = oneLine(field(data, 'first', MAX_SHORT));
  const last = oneLine(field(data, 'last', MAX_SHORT));
  const email = field(data, 'email', MAX_SHORT);
  const phone = field(data, 'phone', MAX_SHORT);
  const role = oneLine(field(data, 'role', MAX_SHORT));
  const message = field(data, 'msg', MAX_MESSAGE) || field(data, 'message', MAX_MESSAGE);
  const token = field(data, 'token', 4096);

  // 1) Verify the Turnstile token (bot protection).
  const secret = env.TURNSTILE_SECRET_KEY ?? (import.meta.env.DEV ? TEST_SECRET : undefined);
  if (!secret) {
    console.error('[contact] TURNSTILE_SECRET_KEY is not set on the Worker.');
    return json({ ok: false, error: 'The contact form is not configured. Please call us.' }, 500);
  }
  let verified = false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (clientAddress) body.set('remoteip', clientAddress);
    const r = await fetch(TURNSTILE_VERIFY, { method: 'POST', body });
    verified = ((await r.json()) as { success?: boolean }).success === true;
  } catch {
    verified = false;
  }
  if (!verified) {
    return json({ ok: false, error: 'Verification failed. Please try the check again.' }, 400);
  }

  // 2) Server-side validation (mirrors the client).
  const missing: string[] = [];
  if (!first) missing.push('your first name');
  if (email && !isValidEmail(email)) missing.push('a valid email address');
  if (phone && !isValidPhone(phone)) missing.push('a 10-digit phone number');
  if (!email && !phone) missing.push('an email or phone number');
  if (!role) missing.push('what brings you here');
  if (!message) missing.push('a message');
  if (missing.length) {
    return json({ ok: false, error: `Please include ${missing.join(', ')}.` }, 422);
  }

  // 3) Send via Resend.
  // Accept either name; `RESEND_TOKEN` is what's set on the Worker.
  const apiKey = env.RESEND_TOKEN ?? env.RESEND_API_KEY;
  const to = env.CONTACT_TO ?? 'recruitment@annieshavens.ca';
  const from = env.CONTACT_FROM ?? "Annie's Havens <noreply@annieshavens.ca>";
  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.warn('[contact] No RESEND_TOKEN set, skipping send (dev only).');
      return json({ ok: true, dev: true });
    }
    console.error('[contact] RESEND_TOKEN is not set on the Worker.');
    return json({ ok: false, error: 'The contact form is not configured. Please call us.' }, 500);
  }

  const text =
    `New website inquiry\n\n` +
    `Name: ${first} ${last}`.trim() + `\n` +
    `Email: ${email || '(not provided)'}\n` +
    `Phone: ${phone || '(not provided)'}\n` +
    `I am a: ${role}\n\n` +
    `${message}\n`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email || undefined,
        subject: `New inquiry from ${first} ${last}`.trim(),
        text,
      }),
    });
    if (!res.ok) {
      // Status only: the response body can echo the message, which is personal data.
      console.error(`[contact] Resend rejected the message: HTTP ${res.status}`);
      return json({ ok: false, error: 'We could not send your message. Please call us instead.' }, 502);
    }
  } catch (err) {
    console.error('[contact] Could not reach Resend:', err instanceof Error ? err.message : err);
    return json({ ok: false, error: 'We could not reach our mail service. Please call us instead.' }, 502);
  }

  return json({ ok: true });
};
