// Form utilities shared across the site's forms.

/** NANP local phone pattern once formatted: XXX-XXX-XXXX */
export const PHONE_LOCAL_PATTERN = /^\d{3}-\d{3}-\d{4}$/;

/**
 * Format a phone number as the user types. Ported from KinFlow's
 * phone-input `autoFormat`: strip everything but digits, drop a leading
 * country-code "1" (NANP area codes never start with 1), cap at 10 digits,
 * then group progressively into XXX-XXX-XXXX.
 */
export function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('1')) digits = digits.substring(1);
  digits = digits.substring(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.substring(0, 3) + '-' + digits.substring(3);
  return digits.substring(0, 3) + '-' + digits.substring(3, 6) + '-' + digits.substring(6);
}

/** True once a complete 10-digit NANP number has been entered (XXX-XXX-XXXX). */
export function isValidPhone(value: string): boolean {
  return PHONE_LOCAL_PATTERN.test(value.trim());
}

/**
 * Email validation pattern. This is the WHATWG / HTML5 `<input type="email">`
 * spec pattern — strict enough to catch real typos (missing @, bad domain,
 * spaces) without rejecting valid-but-unusual addresses.
 */
export const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}
