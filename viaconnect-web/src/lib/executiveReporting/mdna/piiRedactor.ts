// Prompt #105 §3.6 — PHI/PII redaction boundary enforced BEFORE any
// Claude API call. If the prompt payload contains a PII-shaped string
// the pre-send scanner aborts the call rather than leaking it.

/** Patterns that must not appear in any Claude API payload during MD&A drafting. */
const PII_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { name: 'ein', re: /\b\d{2}-\d{7}\b/ },
  { name: 'credit_card', re: /\b(?:\d{4}[-\s]?){3}\d{4}\b/ },
  { name: 'bank_account_maybe', re: /\b\d{9,17}\b/ },
  { name: 'email_address', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { name: 'phone_us', re: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
  { name: 'sin_ca', re: /\b\d{3}-\d{3}-\d{3}\b/ },
];

export interface PIIScanHit {
  pattern: string;
  offset: number;
  preview: string; // 4 surrounding chars each side, with the hit itself masked
}

export interface PIIScanResult {
  ok: boolean;
  hits: PIIScanHit[];
}

/** Pure: scan a payload (string OR structured JSON serialized to string)
 *  for any PII pattern. Returns ok=false + enumerated hits on detection. */
export function scanForPII(content: string): PIIScanResult {
  const hits: PIIScanHit[] = [];
  for (const { name, re } of PII_PATTERNS) {
    const match = re.exec(content);
    if (match && match[0]) {
      const start = match.index;
      const end = start + match[0].length;
      const preview =
        content.slice(Math.max(0, start - 4), start)
        + '[REDACTED]'
        + content.slice(end, Math.min(content.length, end + 4));
      hits.push({ pattern: name, offset: start, preview });
    }
  }
  return { ok: hits.length === 0, hits };
}

/** Pure: assertion variant that throws on detection. Call this
 *  immediately before any fetch to the Claude API. */
export function assertNoPIIInClaudePrompt(content: string, context: string): void {
  const r = scanForPII(content);
  if (!r.ok) {
    // NEVER include the full content or exact hit in the error message —
    // it becomes part of logs. Only pattern names + count.
    const summary = r.hits.map((h) => h.pattern).join(',');
    throw new Error(`PII_IN_CLAUDE_PROMPT: context=${context} patterns=${summary}`);
  }
}
