# Body Scan Phase 1 Sprint Plan (Record Artifact)

## Nature of this document

This is a historical record artifact, adapted from Prompt #169a section 7. The dates and milestone numbering come from the original 169a plan and are preserved for traceability. They are NOT a live schedule. The authoritative statement of what is actually built lives in the "Actual web Phase 1 status" section near the end of this document and in the model card at `docs/models/body-composition-cnn-v1.md`. Where the original plan and the shipped reality differ, the shipped reality governs.

## Phase 1 scope (as planned in 169a section 7)

Phase 1, Tier 1: a four-photo, client-side body composition scan with transparent anthropometric estimation, a measurement-driven avatar, capture quality gating, multi-frame fusion, personal baseline drift correction, premium gating, a practitioner read path, and a PDF export. Tier 2 (depth sensors) and Tier 3 (GeneX360 genomic priors) were explicitly deferred to later phases.

## Sprint breakdown (adapted from 169a section 7)

The original plan organized the work into tracks (referred to in code comments as T1 through T7 and later additions). Reconstructed from the code's own track references:

- T1: anthropometric foundations. Navy and CUN-BAE equations, FFMI, shared types. Status in code: shipped (`navyBodyFat.ts`, `cunbaeBodyFat.ts`, `types.ts`).
- T2: persistence schema. `body_scan_quality`, `body_scan_tier_log`, `body_scan_composition`, plus columns on `body_photo_sessions`. Status: shipped (migrations under `supabase/migrations/20260516000010..060`).
- T3: pure quality and geometry math. Quality scoring, circumference prediction, blending, asymmetry. Status: shipped (`scan-quality.ts`, `circumferencePredictor.ts`, `compositionBlender.ts`, `asymmetryAnalyzer.ts`).
- T4: calibration and fusion. Credit card calibration, user-height fallback, multi-frame fusion, personal baseline drift. Status: shipped (`credit-card-calibration.ts`, `multi-frame-fusion.ts`, `personal-baseline-drift.ts`).
- T5 and T6: server analyze and export. `body-scan-analyze` (ephemeral vision plus ancillary persistence plus 169a premium gating) and `body-scan-export` (PDF). Status: shipped (`supabase/functions/body-scan-analyze`, `supabase/functions/body-scan-export`).
- T7: capture UI (PhotoSessionCapture) and full client wiring of fusion, calibration, and session creation. Status in code comments: referenced as the integration layer; several server comments note "until T7 ships" for session-id plumbing through the ephemeral path. Treat client capture wiring as the area most likely to diverge from the plan.

## Deferred to later phases (per 169a section 7)

- Tier 2: depth sensor fusion (LiDAR, ARCore depth, TrueDepth). The tier resolver accepts these flags but ignores them in Phase 1.
- Tier 3: GeneX360 genomic priors. See `docs/models/genomic-prior-effect-sizes.md`.
- A trained CNN or learned body mesh. See `docs/models/body-composition-cnn-v1.md`.
- Higher-fidelity or photoreal avatar. See `docs/licensing/smpl-x-commercial-license.md`.

## Actual web Phase 1 status (authoritative)

As of branch `feat/prompt-169-finish`:

- Anthropometric estimation pipeline: present and working (Navy plus CUN-BAE plus vision range, blended into a range with per-method breakdown).
- Measurement-driven parametric avatar: present.
- Capture quality, multi-frame fusion, personal baseline drift, CAQ cross-reference: present as pure modules.
- Server analyze and export edge functions: present, including 169a premium gating and the practitioner read and export paths.
- Helix `body_scan_completed` event: emitted by DB trigger on scan completion (amount 0; a milestone marker, not points).
- Tier resolver: always Tier 1.
- Clinical validation cohort: NOT run. See `docs/validation/body-scan-v1-clinical-validation.md` and `docs/validation/body-scan-v1-tier-a-internal.md`.
- A trained CNN, depth fusion, and genomic priors: not built.

## Launch dependency to flag

The server vision path sends four body photos (PHI) to Claude Vision ephemerally; the photos are never stored and are discarded immediately, but they leave Farmceutica infrastructure. A signed Business Associate Agreement with Anthropic must be on file before Body Scan is enabled in production. This is documented at the egress point in `supabase/functions/body-scan-analyze/index.ts`.

## Provenance

- Spec: Prompt #169 / #169a, section 7 (sprint plan) and section 16 (documentation deliverables).
- This artifact records the original plan and reconciles it against the shipped code; the shipped reality governs where they differ.
