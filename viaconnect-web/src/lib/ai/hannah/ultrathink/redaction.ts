/**
 * PHI redaction on the boundary.
 * Runs before any external call (Tavus) and before writing to transcript tables.
 *
 * Conservative approach: target high-confidence PHI patterns only.
 * Avoid overly aggressive regex that would destroy product names,
 * medical terms, and answer quality (e.g., "Bio Optimization", "Foundation Stack").
 */

// Terms that look like two capitalized words but are NOT names.
// Used to avoid false-positive redaction of product/medical terminology.
const SAFE_TERMS = new Set([
  'bio optimization', 'foundation stack', 'alpha gpc', 'helix rewards',
  'daily schedule', 'genex360', 'nad precursor', 'vitamin d3',
  'omega elite', 'bio boost', 'neuro calm', 'telo prime',
  'farm ceutica', 'via connect', 'hannah ultrathink',
]);

const PHI_PATTERNS: Array<{ pattern: RegExp; replace: string }> = [
  // SSN (US format)
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replace: '[SSN]' },
  // Email addresses
  { pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, replace: '[EMAIL]' },
  // MRN / medical record numbers
  { pattern: /\bMRN[:\s]*\w+\b/gi, replace: '[MRN]' },
  // US phone numbers (various formats)
  { pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replace: '[PHONE]' },
  // Dates of birth (MM/DD/YYYY or similar)
  { pattern: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, replace: '[DATE]' },
  // Insurance / policy IDs (letter-number combos 8+ chars)
  { pattern: /\b[A-Z]{1,3}\d{6,}\b/g, replace: '[ID]' },
];

export function redactPHI(text: string): string {
  let out = text;
  for (const { pattern, replace } of PHI_PATTERNS) {
    out = out.replace(new RegExp(pattern.source, pattern.flags), replace);
  }
  return out;
}
