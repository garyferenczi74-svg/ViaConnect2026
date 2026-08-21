# Prompt 225a: Honesty layer apply + refresh proof

**Date:** 2026-08-20  
**Deploy:** `https://www.viaconnectapp.com` (commit `23544534`)  
**Artifacts:** `225a-apply-honesty-result.json`, `225a-honesty-layer-result.json`

## Migration

| File | Result |
| --- | --- |
| `20260820150000_prompt_225a_clinical_evidence_schema.sql` | ok (idempotent re-apply) |
| `20260820151000_prompt_225a_honesty_layer.sql` | **ok** (`kb_peptides.honesty_layer` jsonb) |

ICTRP remains `pending_access`. `trialsearch.who.int` stay rejected / inactive.

## Honesty refresh

| Metric | Value |
| --- | --- |
| ok | **true** |
| Peptides updated | **10** (Wave 1 linked set) |
| With `evidence_gap_statement` | **10** |
| Errors | 0 |
| Canonical framing | Registration is not completion. Completion is not publication. Publication is not a positive result. |

Computed fields: `trials_registered`, `trials_completed`, `trials_terminated_or_withdrawn`, `trials_with_results_posted`, `publications_human`, `publications_animal`, `systematic_reviews`, `terminated_for_safety`, `termination_reasons`, `evidence_gap_statement`, `coverage_note`.

## Hannah NCT dosing refusal (Section 10.3)

- Code: `trial_protocol_dosing` in `peptideRefusals.ts`
- Unit + harness tests: **15/15 passed** locally
- Allows ClinicalTrials.gov study URL only; no dose amounts restated

## Budget

See `225a-wave1-budget-projection.md`: Wave 1 CT.gov + PubMed used **0** Firecrawl credits (API-first).
