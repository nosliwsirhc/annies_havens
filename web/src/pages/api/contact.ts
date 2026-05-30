import type { APIRoute } from 'astro';
import { isValidEmail, isValidPhone } from '../../lib/form';

// On-demand: runs as a Cloudflare Pages Function, not prerendered.
export const prerender = false;

const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
// Cloudflare's documented test keys (always pass). Real secret comes from env.
const TEST_SECRET = '1x0000000000000000000000000000000AA';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = ((locals as any).runtime?.env ?? {}) as Record<string, string | undefined>;

  let data: Record<string, string> = {};
  try {
    data = (await request.json()) as Record<string, string>;
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  const first = (data.first ?? '').trim();
  const last = (data.last ?? '').trim();
  const email = (data.email ?? '').trim();
  const phone = (data.phone ?? '').trim();
  const role = (data.role ?? '').trim();
  const message = (data.msg ?? data.message ?? '').trim();
  const token = data.token ?? '';

  // 1) Verify the Turnstile token (bot protection).
  const secret = env.TURNSTILE_SECRET_KEY ?? import.meta.env.TURNSTILE_SECRET_KEY ?? TEST_SECRET;
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
  const apiKey = env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
  const to = env.CONTACT_TO ?? 'recruitment@annieshavens.ca';
  const from = env.CONTACT_FROM ?? "Annie's Havens <noreply@annieshavens.ca>";
  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.warn('[contact] No RESEND_API_KEY set — skipping send (dev only).');
      return json({ ok: true, dev: true });
    }
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
      return json({ ok: false, error: 'We could not send your message. Please call us instead.' }, 502);
    }
  } catch {
    return json({ ok: false, error: 'We could not reach our mail service. Please call us instead.' }, 502);
  }

  return json({ ok: true });
};
