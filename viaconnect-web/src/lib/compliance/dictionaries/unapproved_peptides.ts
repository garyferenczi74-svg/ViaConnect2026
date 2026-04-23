/**
 * Marshall dictionary: peptides that are prohibited platform-wide OR gated to
 * specific delivery forms. These back the MARSHALL.PEPTIDE.* rule family.
 */

export const PROHIBITED_PEPTIDES: readonly string[] = [
  // Standing Rule §0.3 — Semaglutide is forbidden everywhere on the platform.
  "semaglutide",
] as const;

export const INJECTABLE_ONLY_PEPTIDES: readonly string[] = [
  "retatrutide",
] as const;

export const MONOTHERAPY_PEPTIDES: readonly string[] = [
  // Cannot be stacked with other peptides in the same cart / protocol.
  "retatrutide",
] as const;

export const AGE_RESTRICTED_PEPTIDES: ReadonlyArray<{ name: string; minAge: number }> = [
  // Cognitive stimulants carry a higher minimum age than the 18 default.
  { name: "bromantane", minAge: 21 },
  { name: "semax", minAge: 21 },
  { name: "selank", minAge: 21 },
  { name: "cerebrolysin", minAge: 21 },
];

// SKU prefix patterns Marshall uses to infer delivery form without hitting the DB.
export const SKU_FORM_PATTERN = {
  INJECTABLE: /^[A-Z]{2,3}-INJ-/i,
  LIPOSOMAL: /^[A-Z]{2,3}-LIP-/i,
  MICELLAR: /^[A-Z]{2,3}-MIC-/i,
  NASAL: /^[A-Z]{2,3}-NSL-/i,
  ORAL: /^[A-Z]{2,3}-ORL-/i,
} as const;

export function skuIsInjectable(sku: string): boolean {
  return SKU_FORM_PATTERN.INJECTABLE.test(sku);
}

export function skuIsLiposomalOrAlt(sku: string): boolean {
  return (
    SKU_FORM_PATTERN.LIPOSOMAL.test(sku) ||
    SKU_FORM_PATTERN.MICELLAR.test(sku) ||
    SKU_FORM_PATTERN.NASAL.test(sku) ||
    SKU_FORM_PATTERN.ORAL.test(sku)
  );
}
