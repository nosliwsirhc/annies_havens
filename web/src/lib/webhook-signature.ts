// Checks that a webhook request really came from Resend. Resend signs its
// webhooks the Svix way (https://docs.svix.com/receiving/verifying-payloads/how-manual):
// - the signed text is `${svix-id}.${svix-timestamp}.${raw body}`;
// - the key is the base64 part of the endpoint's `whsec_...` signing secret;
// - `svix-signature` lists one or more `v1,<base64 HMAC-SHA256>` values,
//   separated by spaces (more than one while a secret is being rotated).

// How far the timestamp may be from now, so a captured request can't be
// replayed later. Resend signs every delivery attempt afresh.
const TOLERANCE_SECONDS = 5 * 60;

const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Throws if the secret itself is malformed: a configuration error, not a bad request.
export async function importWebhookKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    fromBase64(secret.trim().replace(/^whsec_/, '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

// Whether the request carries a current signature made with this key.
export async function isSignedWebhook(key: CryptoKey, headers: Headers, body: string, now = Date.now()): Promise<boolean> {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signatures = headers.get('svix-signature');
  if (!id || !timestamp || !signatures) return false;
  if (!/^\d{1,12}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const signed = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
  for (const entry of signatures.split(' ')) {
    const comma = entry.indexOf(',');
    if (comma < 0 || entry.slice(0, comma) !== 'v1') continue;
    let signature: Uint8Array<ArrayBuffer>;
    try {
      signature = fromBase64(entry.slice(comma + 1));
    } catch {
      continue;
    }
    // crypto.subtle.verify compares in constant time.
    if (await crypto.subtle.verify('HMAC', key, signature, signed)) return true;
  }
  return false;
}
