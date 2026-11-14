import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { readBody } from '../../lib/read-body';
import { importWebhookKey, isSignedWebhook } from '../../lib/webhook-signature';

// Resend posts email events here (a webhook set up in the Resend dashboard).
// When a website email doesn't reach its recipient, this emails an alert to
// ALERT_TO, with the message itself when Resend lets us read it back, so a lost
// inquiry is noticed the same day. From July to November 2026 every inquiry
// was dropped without a word, because recruitment@ was on Resend's
// suppression list and Resend still answered each send with a success.
export const prerender = false;

// Event payloads are a few kilobytes.
const MAX_BODY_BYTES = 256 * 1024;
// Alerts carry this tag, so an alert that itself fails is never alerted on.
const ALERT_TAG = 'delivery-alert';
const SUPPRESSIONS = 'https://resend.com/emails/suppressions';

type Details = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ');

// The events the webhook subscribes to, each with what happened and what to do.
const ALERTS: Record<string, { title: string; happened: string; what: string; todo: string; reason: (d: Details) => string }> = {
  'email.suppressed': {
    title: 'not sent',
    happened: 'was not sent',
    what: 'Resend did not send it, because the address is on its suppression list.',
    todo: `Resend blocks an address after it bounces or is marked as spam. Once the address works again, remove it at ${SUPPRESSIONS} so emails get through.`,
    reason: (d) => str((d.suppressed as Details | undefined)?.message),
  },
  'email.bounced': {
    title: 'bounced',
    happened: 'bounced',
    what: "The recipient's mail server refused it.",
    todo: `Check that the address exists and accepts mail from outside. A permanent bounce adds the address to Resend's suppression list, and every later email to it is dropped; remove it at ${SUPPRESSIONS} once the address works.`,
    reason: (d) => {
      const b = (d.bounce ?? {}) as Details;
      return [str(b.type), str(b.subType)].filter(Boolean).join(' / ') + (str(b.message) ? `: ${str(b.message)}` : '');
    },
  },
  'email.failed': {
    title: 'failed',
    happened: 'failed to send',
    what: 'Resend could not send it.',
    todo: 'See the reason above. Common causes are a sending limit, or a problem with the API key or the domain: https://resend.com/emails',
    reason: (d) => str((d.failed as Details | undefined)?.reason),
  },
  'email.complained': {
    title: 'marked as spam',
    happened: 'was marked as spam',
    what: "It was delivered, but the recipient's mail system marked it as spam.",
    todo: `Check the mailbox's junk filtering. Resend adds an address that complains to its suppression list (${SUPPRESSIONS}).`,
    reason: () => '',
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const torontoTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })} (Toronto time)`;
};

// The email's text, read back from Resend, or null if that isn't allowed (a
// sending-only API key) or doesn't work.
async function readEmailText(apiKey: string, emailId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(emailId)}`, {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(`[resend-events] Could not read the email back from Resend: HTTP ${res.status}`);
      return null;
    }
    const text = ((await res.json()) as { text?: unknown }).text;
    return typeof text === 'string' ? text : null;
  } catch (err) {
    console.warn('[resend-events] Could not read the email back from Resend:', err instanceof Error ? err.message : err);
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const secret = env.RESEND_WEBHOOK_SECRET;
  const alertTo = (env.ALERT_TO ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!secret || !alertTo.length) {
    // 500 so Resend retries and shows the failures on the webhook's page.
    console.error('[resend-events] RESEND_WEBHOOK_SECRET or ALERT_TO is not set on the Worker.');
    return json({ ok: false, error: 'Not configured.' }, 500);
  }
  let key: CryptoKey;
  try {
    key = await importWebhookKey(secret);
  } catch {
    console.error('[resend-events] RESEND_WEBHOOK_SECRET is not a valid whsec_ signing secret.');
    return json({ ok: false, error: 'Not configured.' }, 500);
  }

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'Too large.' }, 413);
  }
  let raw: string | null;
  try {
    raw = await readBody(request, MAX_BODY_BYTES);
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }
  if (raw === null) return json({ ok: false, error: 'Too large.' }, 413);
  if (!(await isSignedWebhook(key, request.headers, raw))) {
    return json({ ok: false, error: 'Invalid signature.' }, 401);
  }

  let event: { type?: unknown; data?: unknown };
  try {
    event = JSON.parse(raw);
    if (!event || typeof event !== 'object') throw new Error('not an object');
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }
  const type = str(event.type);
  const alert = Object.hasOwn(ALERTS, type) ? ALERTS[type] : undefined;
  const data = (event.data && typeof event.data === 'object' ? event.data : {}) as Details;
  // Event tags are an object ({ source: '...' }); accept the API's list form too.
  const isAlert = Array.isArray(data.tags)
    ? data.tags.some((t) => t?.name === 'source' && t?.value === ALERT_TAG)
    : (data.tags as Details | undefined)?.source === ALERT_TAG;
  // Anything else (a webhook subscribed to more events, or an alert about an
  // alert) is acknowledged and dropped, so Resend doesn't retry it.
  if (!alert || isAlert) return json({ ok: true, ignored: true });

  const emailId = str(data.email_id);
  const recipients = Array.isArray(data.to) ? data.to.map(str).filter(Boolean).join(', ') : str(data.to);
  const subject = oneLine(str(data.subject));
  const sent = torontoTime(str(data.created_at));
  const reason = alert.reason(data);

  const apiKey = env.RESEND_TOKEN ?? env.RESEND_API_KEY;
  const message = apiKey && emailId ? await readEmailText(apiKey, emailId) : null;

  const text =
    `An email from the Annie's Havens website ${alert.happened}.\n\n` +
    `What happened: ${alert.what}\n` +
    `To: ${recipients || '(unknown)'}\n` +
    `Subject: ${subject || '(none)'}\n` +
    (sent ? `Sent: ${sent}\n` : '') +
    (reason ? `Reason: ${reason}\n` : '') +
    (emailId ? `In Resend: https://resend.com/emails/${emailId}\n` : '') +
    `\nWhat to do: ${alert.todo}\n\n` +
    (message !== null
      ? `The email:\n\n${message.slice(0, 20000)}\n`
      : `The email itself is in Resend's log (link above) for 30 days. Copy anything you need from it before then.\n`);
  const alertSubject = `Website email ${alert.title}: ${subject || type}`;

  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.info(`[resend-events] Would send to ${alertTo.join(', ')} (dev only):\n${alertSubject}\n\n${text}`);
      return json({ ok: true, dev: true });
    }
    console.error('[resend-events] RESEND_TOKEN is not set on the Worker.');
    return json({ ok: false, error: 'Not configured.' }, 500);
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        // Resend retries an event until it gets a 2xx; the same key within 24
        // hours sends the alert only once.
        'idempotency-key': `delivery-alert/${request.headers.get('svix-id')}`,
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM ?? "Annie's Havens <noreply@annieshavens.ca>",
        to: alertTo,
        subject: alertSubject,
        text,
        tags: [{ name: 'source', value: ALERT_TAG }],
      }),
    });
    if (!res.ok) {
      console.error(`[resend-events] Resend rejected the alert: HTTP ${res.status}`);
      return json({ ok: false, error: 'Alert not sent.' }, 502);
    }
  } catch (err) {
    console.error('[resend-events] Could not reach Resend:', err instanceof Error ? err.message : err);
    return json({ ok: false, error: 'Alert not sent.' }, 502);
  }
  return json({ ok: true });
};
