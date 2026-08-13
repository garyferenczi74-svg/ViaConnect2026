/**
 * Prompt 215b: split long-scroll legacy description into section bodies.
 * Description keeps only the narrative; other categories move to their sections.
 * Zero content loss: extracted slices are returned for reassignment.
 */

import { normalizeProductCopy } from './lexicon';

export interface SplitLongScrollResult {
  /** Narrative only (no Full Description sub-heading, no other category blocks) */
  description: string;
  ingredientBreakdown: string | null;
  whoBenefits: string | null;
  formulation: string | null;
  geneticCompatibility: string | null;
  /** Which blocks were extracted from the original body */
  moved: Array<'ingredient_breakdown' | 'who_benefits' | 'formulation' | 'genetic_compatibility'>;
  /** True when original had duplicated category markers inside description */
  hadDuplication: boolean;
}

// Require markdown heading markers (#{1,3}) so body lines like
// "Who benefits: people seeking..." are not treated as section starts.
const MARKERS: Array<{
  key: 'ingredient_breakdown' | 'who_benefits' | 'formulation' | 'genetic_compatibility';
  re: RegExp;
}> = [
  {
    key: 'ingredient_breakdown',
    re: /(?:^|\n)\s*#{1,3}\s*ingredient\s*breakdown\b[^\n]*/i,
  },
  {
    key: 'who_benefits',
    re: /(?:^|\n)\s*#{1,3}\s*who\s*benefits(?:\s*(?:&|and)\s*what\s*makes\s*this\s*different)?\??[^\n]*/i,
  },
  {
    key: 'formulation',
    re: /(?:^|\n)\s*#{1,3}\s*formulation\b[^\n]*/i,
  },
  {
    key: 'genetic_compatibility',
    re: /(?:^|\n)\s*#{1,3}\s*genetic\s*compatibility\b[^\n]*/i,
  },
];

/**
 * Find earliest category marker after position 0 (skipping leading Description heading).
 */
function findNextMarker(
  text: string,
  from: number,
): { key: SplitLongScrollResult['moved'][number]; index: number; matchLen: number } | null {
  let best: { key: SplitLongScrollResult['moved'][number]; index: number; matchLen: number } | null =
    null;
  for (const m of MARKERS) {
    const slice = text.slice(from);
    const match = m.re.exec(slice);
    if (!match || match.index == null) continue;
    const abs = from + match.index;
    if (!best || abs < best.index) {
      best = { key: m.key, index: abs, matchLen: match[0].length };
    }
  }
  return best;
}

/** Strip leading redundant Description / Full Description headings. */
export function stripDescriptionHeading(text: string): string {
  return text
    .replace(/^\s*#{1,3}\s*full\s*description\s*\n+/i, '')
    .replace(/^\s*#{1,3}\s*description\s*\n+/i, '')
    .replace(/^\s*\*\*full\s*description\*\*\s*\n+/i, '')
    .trim();
}

/**
 * Split a long-scroll body into narrative + optional moved sections.
 */
export function splitLongScrollDescription(raw: string): SplitLongScrollResult {
  const normalized = normalizeProductCopy(raw || '');
  let work = stripDescriptionHeading(normalized);

  const moved: SplitLongScrollResult['moved'] = [];
  const buckets: Record<
    'ingredient_breakdown' | 'who_benefits' | 'formulation' | 'genetic_compatibility',
    string | null
  > = {
    ingredient_breakdown: null,
    who_benefits: null,
    formulation: null,
    genetic_compatibility: null,
  };

  // Walk markers in order of appearance
  let cursor = 0;
  const first = findNextMarker(work, 0);
  if (!first) {
    return {
      description: work.trim(),
      ingredientBreakdown: null,
      whoBenefits: null,
      formulation: null,
      geneticCompatibility: null,
      moved: [],
      hadDuplication: false,
    };
  }

  const description = work.slice(0, first.index).trim();
  cursor = first.index;

  while (cursor < work.length) {
    const here = findNextMarker(work, cursor);
    if (!here || here.index !== cursor) {
      // No marker at cursor; advance to next marker or end
      const next = findNextMarker(work, cursor + 1);
      if (!next) break;
      cursor = next.index;
      continue;
    }
    const startContent = here.index + here.matchLen;
    const next = findNextMarker(work, startContent);
    const end = next ? next.index : work.length;
    const body = work.slice(startContent, end).trim();
    if (body && !buckets[here.key]) {
      buckets[here.key] = body;
      moved.push(here.key);
    }
    cursor = end;
  }

  return {
    description: description || work.trim(),
    ingredientBreakdown: buckets.ingredient_breakdown,
    whoBenefits: buckets.who_benefits,
    formulation: buckets.formulation,
    geneticCompatibility: buckets.genetic_compatibility,
    moved,
    hadDuplication: moved.length > 0,
  };
}

/** Markers that must not appear inside a clean Description body. */
export const FORBIDDEN_DESCRIPTION_MARKERS = [
  /ingredient\s*breakdown/i,
  /who\s*benefits/i,
  /#{1,3}\s*formulation\b/i,
  /genetic\s*compatibility/i,
  /#{1,3}\s*full\s*description\b/i,
];

export function assertDescriptionBodyClean(body: string): {
  clean: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  for (const re of FORBIDDEN_DESCRIPTION_MARKERS) {
    if (re.test(body)) violations.push(re.source);
  }
  return { clean: violations.length === 0, violations };
}

/**
 * Build "What does [Product] do?" narrative from a clean description paragraph.
 * Does not re-introduce Full Description heading.
 */
export function formatDescriptionNarrative(productName: string, narrative: string): string {
  const clean = stripDescriptionHeading(narrative).trim();
  if (!clean) {
    return normalizeProductCopy(
      `## What does ${productName} do?\n\nDescription is being finalized.`,
    );
  }
  // If already has a What does heading, keep it
  if (/^##\s*what does\b/i.test(clean)) {
    return normalizeProductCopy(clean);
  }
  return normalizeProductCopy(`## What does ${productName} do?\n\n${clean}`);
}

export interface ParityLogRow {
  slug: string;
  hadDuplication: boolean;
  moved: string[];
  descriptionLenBefore: number;
  descriptionLenAfter: number;
  ingredientHasContent: boolean;
  whoHasContent: boolean;
  formulationHasContent: boolean;
  zeroLoss: boolean;
}
