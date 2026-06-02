// Prompt 172 Phase 0 (170c primitive): basic clinical claim linter.
//
// 170c §13 promises a shared linter for every AI text generation pipeline.
// Phase 0 ships the basic ruleset: prescriptive medical language, diagnostic
// claims, treatment/cure/prevention claims, and FDA approved phrasing. The
// rule set explicitly preserves the DSHEA verb pair loophole (the negated
// "not intended to diagnose, treat, cure, or prevent" formula that every US
// supplement marketer uses) so the canonical disclaimer copy itself does not
// trip the linter.
//
// The linter is pure TS with zero dependencies. Used as a vitest helper at
// build time for AI generated copy review, NOT as a runtime gate. 170h §13.5
// and 170r §15.3 will wire this into their generation pipelines once the
// full §13.5 rule versioning table lands.

export type ViolationKind = 'prescriptive' | 'diagnostic' | 'curative';

export interface Violation {
  match: string;
  index: number;
  kind: ViolationKind;
  suggested?: string;
}

export interface LintResult {
  violations: Violation[];
  ok: boolean;
}

interface Rule {
  pattern: RegExp;
  kind: ViolationKind;
  suggested?: string;
}

// Prescriptive: telling the user what to do, in second person. The §13.2 list
// is non exhaustive; Phase 0 covers the canonical openings. Each rule is a
// case insensitive substring; word boundaries on either side keep "you need
// to eat" from firing on copy like "if you need to eatin a hurry" (a typo
// edge case, but the boundary is cheap insurance).
const PRESCRIPTIVE_RULES: Rule[] = [
  { pattern: /\byou should take\b/gi, kind: 'prescriptive', suggested: 'consider taking' },
  { pattern: /\bwe recommend you take\b/gi, kind: 'prescriptive', suggested: 'a common pattern is' },
  { pattern: /\byou must avoid\b/gi, kind: 'prescriptive', suggested: 'many people avoid' },
  { pattern: /\byou need to eat\b/gi, kind: 'prescriptive', suggested: 'foods that may help include' },
  { pattern: /\byou should eat\b/gi, kind: 'prescriptive', suggested: 'foods that may help include' },
  { pattern: /\byou should avoid\b/gi, kind: 'prescriptive', suggested: 'many people avoid' },
];

const DIAGNOSTIC_RULES: Rule[] = [
  { pattern: /\byour symptoms indicate\b/gi, kind: 'diagnostic' },
  { pattern: /\byou have [a-z]+ deficiency\b/gi, kind: 'diagnostic' },
];

// Curative bucket carries treat / cure / prevent claims. We match the
// positive forms; the DSHEA negated form is allowed by the §13.2 loophole
// detector below.
const CURATIVE_RULES: Rule[] = [
  { pattern: /\bto treat\b/gi, kind: 'curative' },
  { pattern: /\bwill cure\b/gi, kind: 'curative' },
  { pattern: /\bthis cures\b/gi, kind: 'curative' },
  { pattern: /\bthis prevents\b/gi, kind: 'curative' },
  { pattern: /\bcures? [a-z]+\b/gi, kind: 'curative' },
];

// FDA approved is a regulated phrase; only drugs approved through the FDA
// drug approval process may use it. Supplements never may.
const FDA_RULES: Rule[] = [
  { pattern: /\bFDA approved\b/gi, kind: 'curative' },
  { pattern: /\bFDA-approved\b/gi, kind: 'curative' },
];

const ALL_RULES: Rule[] = [
  ...PRESCRIPTIVE_RULES,
  ...DIAGNOSTIC_RULES,
  ...CURATIVE_RULES,
  ...FDA_RULES,
];

// DSHEA negated loophole. When the canonical "not intended to diagnose,
// treat, cure, or prevent any disease" phrase is present, suppress curative
// matches that fall inside the loophole window. The window is approximate
// (the §13.5 versioned rules will tighten this) but anchored on a specific
// sentinel substring so we do not accidentally clear copy that happens to
// include those four verbs in a sentence about treating illness.
const DSHEA_LOOPHOLE_RX = /not intended to diagnose,\s*treat,\s*cure,\s*or\s*prevent/gi;

function findLoopholeRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  // Build a window from the start of the negated clause through ~80 chars
  // after the matched substring (covers "any disease." plus trailing punct).
  while ((m = DSHEA_LOOPHOLE_RX.exec(text)) !== null) {
    ranges.push([m.index, Math.min(text.length, m.index + m[0].length + 80)]);
  }
  return ranges;
}

function isInsideLoophole(index: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([lo, hi]) => index >= lo && index <= hi);
}

export function lintClinicalClaims(text: string): LintResult {
  if (!text) return { violations: [], ok: true };
  const loopholeRanges = findLoopholeRanges(text);
  const violations: Violation[] = [];

  for (const rule of ALL_RULES) {
    // Reset lastIndex because regex literals with /g are stateful when reused
    // across calls. A fresh exec loop per rule keeps things clean.
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(text)) !== null) {
      if (rule.kind === 'curative' && isInsideLoophole(m.index, loopholeRanges)) {
        continue;
      }
      violations.push({
        match: m[0],
        index: m.index,
        kind: rule.kind,
        suggested: rule.suggested,
      });
    }
  }

  // Stable ordering by source index makes test assertions deterministic.
  violations.sort((a, b) => a.index - b.index);

  return { violations, ok: violations.length === 0 };
}
