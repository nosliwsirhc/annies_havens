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

// Each email the site sends carries a `source` tag, which tells an event what
// it is about, and which address hears about a failure:
// - an inquiry (contact.ts): ALERT_TO gets an alert, with the inquiry in it;
// - an alert: CONTACT_TO gets a notice that alerts are failing;
// - that notice: nobody can be emailed, so only the Worker log says so.
// No kind of email is alerted on by its own kind, so a broken address can't
// start a loop.
const SOURCE = { inquiry: 'contact-form', alert: 'delivery-alert', notice: 'delivery-alert-notice' } as const;

const SUPPRESSIONS = 'https://resend.com/emails/suppressions';
const DEFAULT_CONTACT_TO = 'recruitment@annieshavens.ca';
const DEFAULT_FROM = "Annie's Havens <noreply@annieshavens.ca>";

type Details = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ');
// "Name <a@example.com>" or "a@example.com", compared as "a@example.com".
const bareAddress = (s: string) => (s.match(/<([^>]+)>/)?.[1] ?? s).trim().toLowerCase();

// The events the webhook subscribes to, each with what happened and what to do.
const ALERTS: Record<string, { title: string; happened: string; what: string; todo: string; reason: (d: Details) => string }> = {
  'email.suppressed': {
    title: 'not sent',
    happened: 'was not sent',
    what: 'Resend did not send it, because the address is on its suppression list.',
    todo: `Resend blocks an address after it bounces or is reported as spam. Once the address works again, remove it at ${SUPPRESSIONS} so emails get through.`,
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
    title: 'reported as spam',
    happened: 'was reported as spam',
    what: 'It was delivered, but someone reading that mailbox reported it as spam.',
    todo: `Ask whoever reads the mailbox whether it was reported by mistake. Resend stops sending to an address that reports spam; once that is sorted out, remove the address at ${SUPPRESSIONS}.`,
    reason: () => '',
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Resend's log is the only other copy of a lost email.
const KEEP = 'Resend keeps emails for a limited time (30 days on the current plan), so copy out anything you need today.';

// Today's date in Toronto, as YYYY-MM-DD.
const torontoDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date());

const torontoTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })} (Toronto time)`;
};

// A tag's value. Events give tags as an object ({ source: '...' }); accept the
// send API's list form ([{ name, value }]) too.
const tagValue = (tags: unknown, name: string) => {
  if (Array.isArray(tags)) {
    const tag = tags.find((t) => t && typeof t === 'object' && (t as Details).name === name) as Details | undefined;
    return str(tag?.value);
  }
  return tags && typeof tags === 'object' ? str((tags as Details)[name]) : '';
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

// Send through Resend; true once it is accepted. Resend refuses a reused
// idempotency key with a different body (409 invalid_idempotent_request): an
// email with that key already went out, so that counts as sent too.
async function send(apiKey: string, idempotencyKey: string, email: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      body: JSON.stringify(email),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return true;
    const name = await res
      .json()
      .then((body) => str((body as Details | null)?.name))
      .catch(() => '');
    if (res.status === 409 && name === 'invalid_idempotent_request') return true;
    // Status and error name only: the body can echo the email, which is personal data.
    console.error(`[resend-events] Resend refused the email: HTTP ${res.status}${name ? ` (${name})` : ''}`);
    return false;
  } catch (err) {
    console.error('[resend-events] Could not reach Resend:', err instanceof Error ? err.message : err);
    return false;
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
  // Other events (if the webhook subscribes to more) are acknowledged, so
  // Resend doesn't retry them.
  if (!alert) return json({ ok: true, ignored: true });

  const data = (event.data && typeof event.data === 'object' ? event.data : {}) as Details;
  const source = tagValue(data.tags, 'source');
  if (source === SOURCE.notice) {
    console.error(`[resend-events] The notice that alerts are failing was not delivered either (${type}). Check ALERT_TO and CONTACT_TO at ${SUPPRESSIONS}.`);
    return json({ ok: true, ignored: true });
  }

  const recipients = (Array.isArray(data.to) ? data.to : [data.to]).map(str).filter(Boolean);
  const alertAddresses = new Set(alertTo.map(bareAddress));
  // An alert, by its tag, or by being addressed only to ALERT_TO in case an
  // event ever arrives without its tags.
  const isAlert =
    source === SOURCE.alert ||
    (!source && recipients.length > 0 && recipients.every((r) => alertAddresses.has(bareAddress(r))));
  const emailId = str(data.email_id);
  const subject = oneLine(str(data.subject));
  const sent = torontoTime(str(data.created_at));
  const reason = alert.reason(data);
  const facts =
    `What happened: ${alert.what}\n` +
    `To: ${recipients.join(', ') || '(unknown)'}\n` +
    `Subject: ${subject || '(none)'}\n` +
    (sent ? `Sent: ${sent}\n` : '') +
    (reason ? `Reason: ${reason}\n` : '') +
    (emailId ? `In Resend: https://resend.com/emails/${emailId}\n` : '');

  const apiKey = env.RESEND_TOKEN ?? env.RESEND_API_KEY;
  // The email the event is about: the lost email, or for a failed alert, the
  // alert (which holds the lost email).
  const message = apiKey && emailId ? await readEmailText(apiKey, emailId) : null;
  let outgoing: { to: string[]; subject: string; text: string; source: string; idempotencyKey: string };
  if (isAlert) {
    // ALERT_TO isn't getting alerts: tell the recruitment mailbox instead.
    console.error(`[resend-events] An alert to ALERT_TO ${alert.happened} (${type}).`);
    outgoing = {
      to: [env.CONTACT_TO ?? DEFAULT_CONTACT_TO],
      subject: 'Website delivery alerts are not getting through',
      text:
        `When a website email is not delivered, the Annie's Havens website emails an alert to ${alertTo.join(', ')}. ` +
        `One of those alerts ${alert.happened}, so later alerts may not reach ${alertTo.length > 1 ? 'all of those addresses' : 'anyone'}.\n\n` +
        facts +
        `\nWhat to do: ${alert.todo} If the address itself is wrong, change the ALERT_TO secret on the annies-havens-web Worker.\n\n` +
        `This notice is sent at most once a day (Toronto time). Later failures that day are not emailed, so check https://resend.com/emails until this is fixed.\n\n` +
        (message !== null
          ? `The alert, with the email it was about:\n\n${message.slice(0, 30000)}\n`
          : `That alert was about an email that was not delivered. Open the link above to read it. ${KEEP}\n`),
      source: SOURCE.notice,
      // At most one notice a day, however many alerts fail: the same key with a
      // different body is refused, and send() counts that as already sent.
      idempotencyKey: `${SOURCE.notice}/${torontoDate()}`,
    };
  } else {
    // Every email the site sends is tagged, so an untagged one came from
    // elsewhere (the Resend dashboard, or before tags were added).
    const inquiry = source === SOURCE.inquiry;
    outgoing = {
      to: alertTo,
      subject: `${inquiry ? 'Website inquiry' : 'Email'} ${alert.title}: ${subject || type}`,
      text:
        `${inquiry ? "An inquiry from the website's contact form" : "An email from the agency's Resend account"} ${alert.happened}.\n\n` +
        facts +
        `\nWhat to do: ${alert.todo}\n\n` +
        (message !== null
          ? `The email:\n\n${message.slice(0, 20000)}\n`
          : `The email itself is in Resend's log (link above). ${KEEP}\n`),
      source: SOURCE.alert,
      // Resend retries an event until it gets a 2xx, each time with the same
      // svix-id, so the alert goes out once. Its last retries come after the
      // key's 24 hours, which at worst repeats an alert.
      idempotencyKey: `${SOURCE.alert}/${request.headers.get('svix-id')}`,
    };
  }

  if (!apiKey) {
    if (import.meta.env.DEV) {
      // The text goes back to the caller (a local test), never to the log.
      console.info(`[resend-events] Would send the ${isAlert ? 'notice' : 'alert'} for this ${type} event (dev only).`);
      return json({ ok: true, dev: true, to: outgoing.to, subject: outgoing.subject, text: outgoing.text });
    }
    console.error('[resend-events] RESEND_TOKEN is not set on the Worker.');
    return json({ ok: false, error: 'Not configured.' }, 500);
  }

  const accepted = await send(apiKey, outgoing.idempotencyKey, {
    from: env.CONTACT_FROM ?? DEFAULT_FROM,
    to: outgoing.to,
    subject: outgoing.subject,
    text: outgoing.text,
    tags: [{ name: 'source', value: outgoing.source }],
  });
  // 502 so Resend retries later.
  return accepted ? json({ ok: true }) : json({ ok: false, error: 'Alert not sent.' }, 502);
};
