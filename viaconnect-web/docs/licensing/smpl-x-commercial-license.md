# SMPL-X Commercial License: Decision Record

## Decision: SMPL-X is NOT used in Phase 1. No SMPL-X commercial license is required for what shipped.

Phase 1 does not use SMPL-X (or SMPL, or any SMPL-family body model). The avatar that actually shipped is a parametric primitive mannequin, and the human geometry that actually shipped comes from MediaPipe, which is Apache-2.0 licensed. This record documents the licensing reality of the shipped code and preserves the SMPL-X question as a pending decision for a possible future higher-fidelity avatar.

## What actually ships and its license

1. Avatar rendering: `src/lib/arnold/scanning/avatarMeshGenerator.ts`. The avatar is built from geometric primitives (sphere, ellipsoid, cylinder) driven by 9 measurement parameters. The file states it is intentionally a stylized anatomical mannequin, not a photoreal body scan, and that no external mesh assets are required. There is no SMPL-X mesh, no SMPL-X model file, and no SMPL-X dependency.
2. Pose landmarks: MediaPipe Pose (BlazePose), loaded via `@mediapipe/pose`. MediaPipe is licensed under Apache-2.0.
3. Body segmentation: MediaPipe Selfie Segmentation via `@tensorflow-models/body-segmentation` on the TensorFlow.js runtime. These are Apache-2.0 licensed.
4. Calibration computer vision: OpenCV.js, used only for credit card contour detection in `src/lib/body-tracker/credit-card-calibration.ts`. OpenCV is Apache-2.0 licensed (current OpenCV releases).

A repository-wide search for "SMPL", "smpl", "GHUM", and "ghum" returns no matches. The spec's references to an SMPL-X or GHUM-based avatar describe an aspirational higher-fidelity path that was NOT taken in Phase 1.

## Why this matters for licensing

SMPL and SMPL-X are distributed by the Max Planck Institute under a license that restricts commercial use; commercial deployment generally requires a separate paid commercial license (historically administered via Meshcapade). Because Phase 1 ships none of these assets, none of that applies to the current build. The shipped human-geometry stack is entirely Apache-2.0, which permits commercial use without a separate commercial license.

## Pending decision (future phases only)

If a future phase pursues a higher-fidelity, photoreal, or learned body mesh avatar, the SMPL-X licensing question reopens. At that point the options to evaluate include:

1. Stay on the parametric primitive avatar (no new license; lowest fidelity).
2. Use a fully permissive (for example Apache-2.0 or MIT) body model or a Farmceutica-owned mesh (no SMPL-X license needed).
3. License SMPL-X commercially (paid; revisit current terms and administrator at decision time).

This is a Gary decision. It is not required for Phase 1 and is explicitly out of scope for this build. No commitment to SMPL-X is made or implied by this record.

## Provenance

- Spec: Prompt #169 / #169a, section 16.
- Shipped reality: `src/lib/arnold/scanning/avatarMeshGenerator.ts`, `src/lib/arnold/scanning/landmarkDetector.ts`, `src/lib/arnold/scanning/silhouetteProcessor.ts`, `src/lib/body-tracker/credit-card-calibration.ts`.
- Verified absence of SMPL and GHUM references via repository search on branch `feat/prompt-169-finish`.
