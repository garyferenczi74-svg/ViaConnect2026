/**
 * Prompt 215: lexicon normalization for product tab copy.
 */

const FOLD_TO_MAXIMUM = 'Maximum Bioavailability';

/** Replace em/en dashes and retire house fold-number bioavailability claims. */
export function normalizeProductCopy(text: string): string {
  let t = text
    .replace(/\u2013/g, '-') // en dash
    .replace(/\u2014/g, '-') // em dash
    .replace(/\u2011/g, '-'); // non-breaking hyphen

  t = t
    .replace(/\b10\s*[x×X]\s*(?:to|-)\s*28\s*[x×X]\s+(?:higher\s+)?bioavailability\b/gi, FOLD_TO_MAXIMUM)
    .replace(/\b10\s*(?:to|-)\s*28\s*[x×X]\s+(?:higher\s+)?bioavailability\b/gi, FOLD_TO_MAXIMUM)
    .replace(/\b10\s*[x×X]\s*(?:to|-)\s*28\s*[x×X]\s+(?:more\s+)?bioavailable\b/gi, FOLD_TO_MAXIMUM)
    .replace(/\b10\s*(?:to|-)\s*28\s*[x×X]\s+(?:more\s+)?bioavailable\b/gi, FOLD_TO_MAXIMUM)
    .replace(/\b10\s*[x×X]\s*(?:to|-)\s*28\s*[x×X]\s+(?:greater\s+|better\s+|enhanced\s+)?absorption\b/gi, FOLD_TO_MAXIMUM)
    .replace(/\b10\s*(?:to|-)\s*28\s*[x×X]\s+(?:greater\s+|better\s+|enhanced\s+)?absorption\b/gi, FOLD_TO_MAXIMUM)
    .replace(/\b10\s*[x×X]\s*(?:to|-)\s*28\s*[x×X]\b/gi, FOLD_TO_MAXIMUM)
    .replace(/\b10\s*(?:to|-)\s*28\s*[x×X]\b/gi, FOLD_TO_MAXIMUM)
    .replace(/FarmCeutica/g, 'Via Cura');

  return t;
}

export function hasLexiconViolation(text: string): string[] {
  const issues: string[] = [];
  if (/[\u2013\u2014]/.test(text)) issues.push('em_or_en_dash');
  if (/\b10\s*[-]\s*28\s*[x×X]\b/i.test(text)) issues.push('bioavailability_dash_form');
  if (/\b10\s*[x×X]\s*(?:to|-)\s*28\s*[x×X]\b/i.test(text)) {
    issues.push('bioavailability_fold_range');
  }
  return issues;
}
