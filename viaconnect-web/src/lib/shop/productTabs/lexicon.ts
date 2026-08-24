/**
 * Prompt 215: lexicon normalization for product tab copy.
 */

/** Replace em/en dashes and fix bioavailability phrasing. */
export function normalizeProductCopy(text: string): string {
  let t = text
    .replace(/\u2013/g, '-') // en dash
    .replace(/\u2014/g, '-') // em dash
    .replace(/\u2011/g, '-') // non-breaking hyphen
    .replace(/10\s*[–—−-]\s*28\s*[×xX]/g, '10x to 28x')
    .replace(/10\s*to\s*28\s*[×xX]/g, '10x to 28x')
    .replace(/10x-28x/gi, '10x to 28x')
    .replace(/10× to 28×/g, '10x to 28x')
    .replace(/FarmCeutica/g, 'Via Cura');

  // Prefer locked bioavailability phrase when multiplier language appears
  if (/bioavail/i.test(t) && /10x to 28x/i.test(t) === false && /10\s*[x×]/i.test(t)) {
    t = t.replace(/10\s*[x×]\s*(?:to|-)?\s*28\s*[x×]/gi, '10x to 28x');
  }
  return t;
}

export function hasLexiconViolation(text: string): string[] {
  const issues: string[] = [];
  if (/[\u2013\u2014]/.test(text)) issues.push('em_or_en_dash');
  if (/10\s*[–—-]\s*28/.test(text)) issues.push('bioavailability_dash_form');
  if (/bioavail/i.test(text) && /10\s*[x×]\s*28/i.test(text) && !/10x to 28x/i.test(text)) {
    issues.push('bioavailability_not_verbatim');
  }
  return issues;
}
