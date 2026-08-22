/**
 * Prompt 227a G60: change class is assigned by field lookup, never by Sherlock judgement.
 */

export type ChangeClass = 0 | 1 | 2 | 3 | 4 | 5;

/** Mirrors curation_field_class_map seed. CI asserts totality against this list. */
export const CURATION_FIELD_CLASS_MAP_227A: ReadonlyArray<{
  targetTable: string;
  targetField: string;
  changeClass: ChangeClass;
}> = [
  { targetTable: 'kb_trials', targetField: 'row_insert', changeClass: 0 },
  { targetTable: 'kb_publications', targetField: 'row_insert', changeClass: 0 },
  { targetTable: 'kb_peptide_synonyms', targetField: 'row_insert', changeClass: 0 },
  { targetTable: 'kb_trials', targetField: 'last_verified_at', changeClass: 0 },
  { targetTable: 'kb_publications', targetField: 'last_verified_at', changeClass: 0 },
  { targetTable: 'kb_peptides', targetField: 'evidence_grade_overall', changeClass: 1 },
  { targetTable: 'kb_peptides', targetField: 'honesty_layer', changeClass: 1 },
  {
    targetTable: 'kb_goal_peptide_links',
    targetField: 'evidence_grade_for_this_goal',
    changeClass: 1,
  },
  {
    targetTable: 'kb_goal_peptide_links',
    targetField: 'indication_match',
    changeClass: 2,
  },
  { targetTable: 'kb_goal_peptide_links', targetField: 'row_insert', changeClass: 2 },
  {
    targetTable: 'kb_peptide_routes',
    targetField: 'is_preferred_by_evidence',
    changeClass: 2,
  },
  {
    targetTable: 'kb_peptide_routes',
    targetField: 'bioavailability_value',
    changeClass: 2,
  },
  { targetTable: 'kb_peptides', targetField: 'misconception_notes', changeClass: 2 },
  { targetTable: 'kb_peptides', targetField: 'provenance_disclosure', changeClass: 2 },
  { targetTable: 'kb_peptides', targetField: 'fda_status', changeClass: 3 },
  { targetTable: 'kb_peptides', targetField: 'fda_503a_category', changeClass: 3 },
  { targetTable: 'kb_peptides', targetField: 'wada_status', changeClass: 3 },
  { targetTable: 'kb_peptides', targetField: 'wada_class', changeClass: 3 },
  { targetTable: 'kb_peptides', targetField: 'controlled_substance', changeClass: 3 },
  { targetTable: 'kb_peptides', targetField: 'exclusion_tier', changeClass: 3 },
  { targetTable: 'kb_peptides', targetField: 'consumer_safe', changeClass: 4 },
  { targetTable: 'kb_goal_domains', targetField: 'row_insert', changeClass: 5 },
  { targetTable: 'authorities_sources', targetField: 'source_tier', changeClass: 5 },
] as const;

export function lookupChangeClass(
  targetTable: string,
  targetField: string,
): ChangeClass {
  const hit = CURATION_FIELD_CLASS_MAP_227A.find(
    (r) => r.targetTable === targetTable && r.targetField === targetField,
  );
  if (!hit) {
    throw new Error(
      `curation_field_class_map_missing:${targetTable}.${targetField}`,
    );
  }
  return hit.changeClass;
}

/** Grade upgrades on evidence_grade fields escalate to Class 2 even if map says 1. */
export function effectiveChangeClass(args: {
  targetTable: string;
  targetField: string;
  direction: 'addition' | 'correction' | 'subtraction' | 'negative_result';
  isGradeUpgrade?: boolean;
}): ChangeClass {
  const base = lookupChangeClass(args.targetTable, args.targetField);
  if (
    args.isGradeUpgrade &&
    (args.targetField === 'evidence_grade_overall' ||
      args.targetField === 'evidence_grade_for_this_goal')
  ) {
    return 2;
  }
  return base;
}

export function canAutoApply(changeClass: ChangeClass): boolean {
  return changeClass === 0 || changeClass === 1;
}
