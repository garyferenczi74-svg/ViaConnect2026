/**
 * Peptides that require an active practitioner linkage (patient_practitioner_link.status='active')
 * before the consumer can add to cart. Maintained here so Steve Rica can see the list in code.
 */

export const PRACTITIONER_REQUIRED_PEPTIDES: ReadonlySet<string> = new Set([
  "retatrutide",
  "tirzepatide",
  "ipamorelin",
  "cjc-1295",
  "cjc1295",
  "sermorelin",
  "tesamorelin",
  "pt-141",
  "pt141",
  "bremelanotide",
  "bpc-157", // injectable only; oral/nasal forms have lighter gating
  "tb-500",
  "tb500",
  "thymosin-beta-4",
  "thymosin beta 4",
  "epitalon",
  "dsip",
]);

export function peptideRequiresPractitioner(name: string): boolean {
  return PRACTITIONER_REQUIRED_PEPTIDES.has(name.trim().toLowerCase());
}
