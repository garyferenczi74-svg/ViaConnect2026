/**
 * PHI redaction on the boundary.
 * Runs before any external call (Tavus) and before writing to transcript tables.
 */

const PHI_PATTERNS: Array<{ pattern: RegExp; replace: string }> = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replace: '[SSN]' },
  { pattern: /\b\d{10,}\b/g, replace: '[NUM]' },
  { pattern: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, replace: '[DATE]' },
  { pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, replace: '[NAME]' },
  { pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, replace: '[EMAIL]' },
  { pattern: /\bMRN[:\s]*\w+\b/gi, replace: '[MRN]' },
];

export function redactPHI(text: string): string {
  let out = text;
  for (const { pattern, replace } of PHI_PATTERNS) {
    out = out.replace(new RegExp(pattern.source, pattern.flags), replace);
  }
  return out;
}

export function redactPHIFromContext(context: unknown): unknown {
  const json = JSON.stringify(context);
  return JSON.parse(redactPHI(json));
}
