/**
 * Prompt 227e: pure detectors for PubMed retraction / EoC signals.
 * No network. No abstract storage.
 */

export type RetractionKind =
  | 'retracted'
  | 'retraction_of'
  | 'expression_of_concern'
  | 'erratum';

export type RetractionHit = {
  kind: RetractionKind;
  noticePmid?: string;
  matchedOn: string;
};

const TYPE_RULES: Array<{ re: RegExp; kind: RetractionKind }> = [
  { re: /retracted publication/i, kind: 'retracted' },
  { re: /retraction of publication/i, kind: 'retraction_of' },
  { re: /expression of concern/i, kind: 'expression_of_concern' },
  { re: /\berratum\b/i, kind: 'erratum' },
];

const REF_RULES: Array<{ re: RegExp; kind: RetractionKind }> = [
  { re: /^RetractionIn$/i, kind: 'retracted' },
  { re: /^RetractionOf$/i, kind: 'retraction_of' },
  { re: /^ExpressionOfConcernIn$/i, kind: 'expression_of_concern' },
  { re: /^ErratumIn$/i, kind: 'erratum' },
];

export function detectRetractionFromPubmedMeta(args: {
  publicationTypes: string[];
  commentCorrectionRefs?: Array<{ refType: string; pmid?: string }>;
}): RetractionHit | null {
  for (const t of args.publicationTypes) {
    for (const rule of TYPE_RULES) {
      if (rule.re.test(t)) {
        return { kind: rule.kind, matchedOn: `publication_type:${t}` };
      }
    }
  }
  for (const ref of args.commentCorrectionRefs ?? []) {
    for (const rule of REF_RULES) {
      if (rule.re.test(ref.refType)) {
        return {
          kind: rule.kind,
          noticePmid: ref.pmid,
          matchedOn: `ref_type:${ref.refType}`,
        };
      }
    }
  }
  return null;
}

/** Safety-relevant trial statuses that should flag dependent evidence links. */
export function isAdverseTrialStatus(status: string): boolean {
  return (
    status === 'terminated' ||
    status === 'withdrawn' ||
    status === 'suspended'
  );
}

const GRADE_RANK: Record<string, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
};

export function nextWorseGrade(current: string): string | null {
  const rank = GRADE_RANK[current] ?? 1;
  if (rank <= 1) return null;
  const next = Object.entries(GRADE_RANK).find(([, r]) => r === rank - 1);
  return next ? next[0] : null;
}
