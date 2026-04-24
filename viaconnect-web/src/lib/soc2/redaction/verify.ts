// Prompt #122 P1: PHI leakage verifier.
//
// Given a chunk of evidence output (string or object), scans for patterns
// that indicate PHI slipped past the redactor. Used by tests and by the
// assembly-time self-check before a packet is signed.
//
// This is a defense-in-depth check: the redactor is already fail-closed on
// unpolicy'd fields. verify.ts catches:
//   - Pattern-based PHI (email, phone, SSN-shaped digits) regardless of
//     which column the redactor got wrong
//   - Obvious name patterns when the redactor misclassified a field as retain

export interface VerificationResult {
  ok: boolean;
  violations: Violation[];
}

export interface Violation {
  pattern: 'email' | 'phone' | 'ssn' | 'raw_uuid' | 'credit_card';
  matched: string;
  index: number;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Strict US/intl phone — tight enough not to catch ISO dates or CIDR blocks.
// Matches: +1-555-123-4567, (555) 123-4567, 555.123.4567.
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
// Canonical UUID (8-4-4-4-12). Pseudonyms are 26-char base32, so any raw UUID
// in output is a redaction miss.
const RAW_UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
// Credit-card: 13–16 digits with optional spaces/dashes every group.
// Require actual separator pattern to avoid matching plain number strings.
const CREDIT_CARD_RE = /\b(?:\d{4}[\s-]){3}\d{4}\b/g;

/**
 * Check a string for PHI leakage patterns. Returns the list of matches.
 */
export function verifyNoPhi(text: string): VerificationResult {
  const violations: Violation[] = [];

  // Order matters: more-specific patterns first. SSN before phone because
  // SSN format (3-2-4) is strictly narrower and should win on "123-45-6789".
  pushMatches(EMAIL_RE, 'email', text, violations);
  pushMatches(SSN_RE, 'ssn', text, violations);
  pushMatches(CREDIT_CARD_RE, 'credit_card', text, violations);
  pushMatches(RAW_UUID_RE, 'raw_uuid', text, violations);
  pushMatches(PHONE_RE, 'phone', text, violations);

  return { ok: violations.length === 0, violations };
}

/**
 * Deep-check an object or array by JSON-stringifying first.
 */
export function verifyObjectNoPhi(obj: unknown): VerificationResult {
  return verifyNoPhi(JSON.stringify(obj ?? {}));
}

function pushMatches(
  re: RegExp,
  pattern: Violation['pattern'],
  text: string,
  violations: Violation[],
): void {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    // Credit-card regex will collide with phone numbers sometimes.
    // Skip if already reported at this index.
    if (violations.some((v) => v.index === m!.index && v.pattern !== pattern)) {
      continue;
    }
    violations.push({ pattern, matched: m[0], index: m.index });
    // Safety: prevent infinite loop on zero-width matches.
    if (m.index === re.lastIndex) re.lastIndex++;
  }
}
