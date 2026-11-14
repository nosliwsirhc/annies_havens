import type { APIRoute } from 'astro';
// Worker environment (bindings, vars, secrets). In Astro 6+ the Cloudflare
// adapter removed `Astro.locals.runtime.env`; the supported replacement is
// the `env` export from the `cloudflare:workers` virtual module (typed in
// src/cloudflare-workers.d.ts).
import { env } from 'cloudflare:workers';
import { FIELD_MAX_LENGTH, MESSAGE_MAX_LENGTH, MESSAGE_TOO_LONG, isValidEmail, isValidPhone } from '../../lib/form';
import { readBody } from '../../lib/read-body';

// On-demand: runs as a Cloudflare Worker route, not prerendered.
export const prerender = false;

const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
// Cloudflare's documented always-pass test secret. Only used in local dev;
// production must have TURNSTILE_SECRET_KEY set or the form refuses to send.
const TEST_SECRET = '1x0000000000000000000000000000000AA';

// A full form (fields at their limits, plus the Turnstile token) is well under
// this; anything bigger isn't a real inquiry, so don't parse it.
const MAX_BODY_BYTES = 64 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Read a field as a trimmed string. Only strings and numbers count; anything
// else (null, an object, an array) is treated as empty, so validation answers
// it, and converting it can't throw. Lengths are checked during validation,
// never cut short.
const field = (data: Record<string, unknown>, key: string) => {
  const raw = data[key];
  return (typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : '').trim();
};
// Names end up in the email subject, which must stay on one line.
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ');

// Which field to name when one is too long.
const FIELD_LABELS = { first: 'first name', last: 'last name', email: 'email address', phone: 'phone number', role: 'role' } as const;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const tooBig = () =>
    json({ ok: false, error: 'That message is too long to send. Please shorten it, or call us.' }, 413);
  // A declared size over the limit is refused without reading anything.
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return tooBig();
  let raw: string | null;
  try {
    raw = await readBody(request, MAX_BODY_BYTES);
  } catch {
    // The upload broke off (client went away, stream error): a bad request, not a crash.
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }
  if (raw === null) return tooBig();

  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    data = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  const first = oneLine(field(data, 'first'));
  const last = oneLine(field(data, 'last'));
  const email = field(data, 'email');
  const phone = field(data, 'phone');
  const role = oneLine(field(data, 'role'));
  const message = field(data, 'msg') || field(data, 'message');
  const token = field(data, 'token');

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

  // 2) Server-side validation (mirrors the client). Over-long input is
  // refused with a clear message rather than trimmed, so nothing is lost
  // without the sender knowing.
  if (message.length > MESSAGE_MAX_LENGTH) {
    return json({ ok: false, error: `${MESSAGE_TOO_LONG}, or call us.` }, 422);
  }
  const values = { first, last, email, phone, role };
  const tooLong = (Object.keys(values) as (keyof typeof values)[]).find((k) => values[k].length > FIELD_MAX_LENGTH);
  if (tooLong) {
    return json({ ok: false, error: `Your ${FIELD_LABELS[tooLong]} is too long. Please shorten it and try again.` }, 422);
  }
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

  // 200 must mean "accepted for delivery": the contact form counts a 200 whose
  // body never arrives as sent. Any failure must use a 4xx or 5xx status.
  return json({ ok: true });
};
