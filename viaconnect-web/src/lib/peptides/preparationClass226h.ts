/**
 * Prompt 226h G55: cytomax (tissue_extract) vs cytogen (synthetic_defined) separation.
 */

export type PreparationClass =
  | 'tissue_extract'
  | 'synthetic_defined'
  | 'not_applicable';

export function preparationClassesConflict(
  a: PreparationClass | null | undefined,
  b: PreparationClass | null | undefined,
): boolean {
  const left = a ?? 'not_applicable';
  const right = b ?? 'not_applicable';
  if (left === 'not_applicable' || right === 'not_applicable') return false;
  return (
    (left === 'tissue_extract' && right === 'synthetic_defined') ||
    (left === 'synthetic_defined' && right === 'tissue_extract')
  );
}

/** True when a publication studying `studied` may be linked to peptide `target`. */
export function mayLinkEvidence(args: {
  studiedClass: PreparationClass | null | undefined;
  targetClass: PreparationClass | null | undefined;
}): boolean {
  return !preparationClassesConflict(args.studiedClass, args.targetClass);
}
