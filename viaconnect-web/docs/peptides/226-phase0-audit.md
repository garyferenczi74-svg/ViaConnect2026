# Prompt 226 Phase 0 Audit

**Date:** 2026-08-20  
**Mode:** read-only (no schema writes in this document)  
**Gates locked:** G15–G20 defaults (Gary confirmed)

## Governing rule

> The platform performs arithmetic on a dose. The platform never originates a dose.

Scale indicator must be read-only (not draggable, no tap-to-set).

---

## 1. Existing calculator / dosing surfaces

**Finding: no live peptide concentration converter or syringe-unit calculator.**

| Class | Paths | Originates dose? |
| --- | --- | --- |
| Commerce calculators | white-label quote/pricing, storage fees, CBP fees, custom-formulation pricing | No |
| Hannah refusals | `src/lib/hannah/peptideRefusals.ts` | No (blocks dose/reconstitut/BAC) |
| Ingest redaction | `src/lib/thanos/doseRedaction.ts` | No |
| Educational copy | `peptide-protocol`, practitioner peptides, catalog cards | No (explicit no-dosing) |

Production peptide surfaces educate and refuse dosing. Nothing converts vial/dose/diluent into syringe units. Nothing supplies platform dose presets.

---

## 2. Prompt 225 no-dose enforcement

| Control | Status |
| --- | --- |
| `kb_peptides_practitioner_depth_no_dose` CHECK | Present (`20260820130000_prompt_225_kb_peptides.sql`) |
| `peptideDoseProhibition.test.ts` | Present |
| Apply-225 CHECK probe | Present |
| Dose redaction on CT.gov/PubMed | Present (225a) |
| Hannah 20Q dosing refusals | Present |

226 must not weaken these. Converter user inputs live only in `converter_sessions` / future practitioner protocols, never in Collection 14 monographs.

---

## 3. Allowlist candidate input

Schema has `fda_status`, `routes_studied`, `exclusion_tier`.

**Gaps:**

- No `health_canada_status` column
- No `converter_eligible` boolean
- No verified IU-to-mg factor columns

**Seed gap:** rows such as `liraglutide` ship with `fda_status = 'unknown'`. Filter-only allowlist is empty until Marshall verifies status and flips `converter_eligible`.

UNKNOWN is not a pass.

---

## 4. Practitioner infrastructure

- Peptide practitioner page gates on `profiles.is_practitioner` / role / user_type (self-asserted role flag)
- `practitioner_profiles.license_verified` exists but is **not** enforced for Module B
- Module B requires verification state machine (AB + NY first) before issue

---

## 5. PHI

Clinical PHI exists elsewhere (labs, genetics, body, nutrition). No converter or practitioner_protocol tables yet. G17: Lex + Security Advisor before named-patient Module B; de-identified opaque ref is valid alternative.

---

## 6. Honest verdict (219l)

| Item | Verdict |
| --- | --- |
| Build Module A without originating doses | **Yes** with boundary architecture |
| Ship allowlist tomorrow | **No** (status unknown; columns missing) |
| Module B now | **No** (licence verify + PHI) |
| Module C with A | **Yes** after content review |
| Production without Lex (G20) | **Forbidden** |

**Phase 0 GO** for Wave 0 scaffolding (schema, math, CI, disclaimers).  
**Phase 0 NO-GO** for consumer converter UI until Marshall allowlist population + Lex disclaimer v1 sign-off + boundary tests green.
