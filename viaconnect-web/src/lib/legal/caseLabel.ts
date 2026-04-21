// Prompt #104 Phase 2: Case label generator.
//
// Produces deterministic human-readable labels of the form
// LEG-YYYY-NNNNNN where YYYY is the case-creation year and NNNNNN is
// a zero-padded sequence within that year. Pure function so the API
// can compute the next label by passing in the current count.

export interface CaseLabelInput {
  year: number;
  sequence_within_year: number;  // 1-based
}

const LABEL_RE = /^LEG-(\d{4})-(\d{6})$/;

export function formatCaseLabel({ year, sequence_within_year }: CaseLabelInput): string {
  if (!Number.isInteger(year) || year < 2000 || year > 2999) {
    throw new Error(`Invalid year: ${year}`);
  }
  if (!Number.isInteger(sequence_within_year) || sequence_within_year < 1 || sequence_within_year > 999_999) {
    throw new Error(`sequence_within_year must be 1..999999, got ${sequence_within_year}`);
  }
  return `LEG-${year}-${String(sequence_within_year).padStart(6, '0')}`;
}

export function parseCaseLabel(label: string): CaseLabelInput | null {
  const m = LABEL_RE.exec(label);
  if (!m) return null;
  return { year: Number(m[1]), sequence_within_year: Number(m[2]) };
}

export function nextCaseLabel(args: { year: number; existing_labels_for_year: ReadonlyArray<string> }): string {
  let max = 0;
  for (const label of args.existing_labels_for_year) {
    const parsed = parseCaseLabel(label);
    if (parsed && parsed.year === args.year && parsed.sequence_within_year > max) {
      max = parsed.sequence_within_year;
    }
  }
  return formatCaseLabel({ year: args.year, sequence_within_year: max + 1 });
}
