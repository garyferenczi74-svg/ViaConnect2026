# Body Scan v1 Tier A Internal Validation

## Status: PENDING, NOT YET RUN

This is a placeholder. The Tier A internal validation has not been run and no results exist. Per Prompt #169a section 9 and the acceptance criteria, this document must NOT contain invented results.

## What Tier A internal validation will be (when run)

A smaller, internal-cohort sanity check, run before or alongside the external clinical validation in `docs/validation/body-scan-v1-clinical-validation.md`. Its purpose is to confirm the pipeline behaves as designed end to end and to catch gross errors before the formal clinical study, not to produce a marketing accuracy claim.

## Required elements (to be filled in only with real data)

- Internal participant count and basic demographics.
- Test-retest repeatability: same person, repeat scans, to characterize the noise floor that personal baseline drift correction assumes.
- Front-only versus front-plus-side uncertainty, to confirm the wider uncertainty the code already applies when no side view exists.
- Credit card calibration versus height-only scale agreement.
- Manual calibration anchoring behavior: confirm a strong manual reading (confidence at or above 0.80) correctly dominates the blend.
- Quality gate behavior: confirm blocking checks (lighting, pose, clothing, camera level, frame coverage) and the advisory background clutter check behave at their boundaries.
- Multi-frame fusion behavior on 3-frame input.
- Date, analyst, and sign-off by Gary.

## Relationship to the clinical study

Tier A internal validation is the internal gate; it does not substitute for the external clinical validation and does not by itself authorize any accuracy claim. Both must clear, and Gary must sign off, before any accuracy statement is permitted.

## Provenance

- Spec: Prompt #169 / #169a, section 9 (validation) and the acceptance criteria.
- Implementation under validation: `src/lib/arnold/scanning/` and `src/lib/body-tracker/` on branch `feat/prompt-169-finish`.
- Placeholder only; replace with real internal-cohort results when the test is run.
