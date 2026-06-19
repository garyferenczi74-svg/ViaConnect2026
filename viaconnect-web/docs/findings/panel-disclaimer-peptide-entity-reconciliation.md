# Finding: PanelDisclaimer peptide non-sale statement, entity vs brand reconciliation

**Author:** Claude Code session 2026-06-19 (raised by Marshall during the SNP consult-warning review, commit 5edb309c)
**Status:** Discovery only. No code written. Awaiting Gary + Marshall/counsel decision.
**Severity:** Low (no false health claim; this is an under/over-specified ENTITY reference on a compliance-sensitive non-sale statement, not a bad claim).
**Surfaces affected:** /shop/genex360, /genetics/blueprint, and (newly) the /genetics Your Variants card when the PeptideIQ panel is active.

---

## 1. The problem

`PanelDisclaimer`'s PeptideIQ caveat names the consumer BRAND "Via Cura" in a legal non-sale statement, while the dedicated peptides pages make the same non-sale statement in the name of the legal ENTITY "FarmCeutica Wellness LLC". The two surfaces disagree on who is stated to not sell peptides.

This is not a wrong brand per se. The privacy policy establishes that "Via Cura" is the legitimate consumer supplement brand and "Farmceutica Wellness LLC" is the registered legal entity / controller (`src/app/(legal)/privacy/page.tsx:26`). The question is narrow: for a compliance non-sale claim, should the statement name the legal entity (as the peptides pages do) or the consumer brand (as PanelDisclaimer does)?

## 2. Evidence (the divergence)

PanelDisclaimer (brand form):
- `src/components/shop/genex360/PanelDisclaimer.tsx:27`
  > "PeptideIQ is educational and intended for practitioner guided interpretation. Via Cura does not sell peptides as commercial products."

Dedicated peptides surfaces (legal-entity form, the more compliance-careful copy):
- `src/app/(app)/(consumer)/shop/peptides/page.tsx:181`
  > "FarmCeutica Wellness LLC does not sell peptides at retail. ..."
- `src/app/(app)/(consumer)/shop/peptides/page.tsx:104`
  > "FarmCeutica Wellness LLC provides peptide information, educational ..."
- `src/app/(app)/(consumer)/shop/peptides/[slug]/page.tsx:331`
  > "FarmCeutica Wellness LLC does not sell, dispense, or distribute peptides at ..."

Legal pages (entity is canonical controller; brand is a named sub-brand):
- `src/app/(legal)/privacy/page.tsx:26,39,41`: "Farmceutica Wellness LLC ... operates ... the Via Cura consumer supplement brand ..."

## 3. Decision needed (Gary + Marshall/counsel)

For the peptide non-sale statement specifically: name the legal entity "FarmCeutica Wellness LLC" (consistent with the peptides pages and the legal entity references) or keep the consumer brand "Via Cura"?

Recommendation (not a legal conclusion): align PanelDisclaimer to the legal-entity form used on the peptides pages, since a non-sale / non-distribution statement is a legal posture about the selling entity, and the peptides pages are the most compliance-careful precedent. Marshall to ratify the exact wording; Gary holds the brand decision.

## 4. Scope boundary (what is NOT in this ticket)

"Via Cura" appears in ~34 source files, the large majority as legitimate consumer-brand usage (shop product copy, cart/checkout, brand mentions). Those are correct and OUT of scope. This ticket is ONLY the peptide non-sale/legal statement entity reference in `PanelDisclaimer`, plus any other place a non-sale or other legal-posture claim names the brand where the entity is canonical.

## 5. Implementation constraint

`PanelDisclaimer.tsx` copy is locked by verbatim source-contract tests in `src/components/shop/genex360/__tests__/PanelDisclaimer.test.ts` (it asserts the exact BASE_DISCLAIMER, PEPTIDE_IQ_DISCLAIMER, and CANNABIS_IQ_DISCLAIMER strings). Any approved copy change MUST update those assertions in the same change, or the test suite breaks. This is why the consult-warning change (5edb309c) reused PanelDisclaimer unchanged and deferred this reconciliation rather than editing it inline.

## 6. Suggested resolution steps (once the decision lands)

1. Marshall ratifies the final verbatim peptide caveat wording (entity vs brand).
2. Update `PEPTIDE_IQ_DISCLAIMER` in `PanelDisclaimer.tsx`.
3. Update the matching verbatim assertion in `PanelDisclaimer.test.ts` in lockstep.
4. Confirm no other non-sale/legal-posture statement still names the brand where the entity is canonical.
5. Run the no-dash hook + the genex360 test suite; ship.
