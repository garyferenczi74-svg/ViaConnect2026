// Prompt #102 — PII redaction helpers for logs + audit entries.

/** Pure: redact an SSN to show only the last 4 digits.
 *  "123-45-6789" → "***-**-6789". Null / malformed input returns null. */
export function redactSSN(ssn: string): string | null {
  const m = ssn.match(/\d{3}-?\d{2}-?(\d{4})$/);
  if (!m) return null;
  return `***-**-${m[1]}`;
}

/** Pure: redact an EIN to show only the last 4 digits. */
export function redactEIN(ein: string): string | null {
  const m = ein.match(/\d{2}-?(\d{7})$/);
  if (!m) return null;
  return `**-***${m[1]!.slice(-4)}`;
}

/** Pure: redact a bank account number to last 4 digits. */
export function redactAccountNumber(acct: string): string | null {
  const digits = acct.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return `****${digits.slice(-4)}`;
}

/** Pure: scan a free-text string for common PII shapes and redact.
 *  Used as a defense-in-depth belt-and-braces for any log line or
 *  webhook payload the prompt accidentally forwards. */
const PII_SHAPES: Array<{ re: RegExp; replacement: string }> = [
  { re: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '***-**-****' }, // SSN
  { re: /\b\d{2}-\d{7}\b/g, replacement: '**-*******' },         // EIN
  { re: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '****-****-****-****' }, // card
  { re: /\b\d{9,17}\b/g, replacement: '(redacted-id)' },          // long numeric (bank acct, routing)
];

export function scrubStringForPII(input: string): string {
  let out = input;
  for (const { re, replacement } of PII_SHAPES) out = out.replace(re, replacement);
  return out;
}
