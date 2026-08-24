# Prompt 210h Revision C: Claims audit note

**Surface:** `/body-tracker/formavision` (3D), `/body-tracker/composition` (numbers / 2D)  
**Date:** 2026-08-11  
**Status:** Copy framed for Kelsey review; no photographic reconstruction claim.

## Allowed framing (shipped)

| Phrase | Why it is accurate |
|--------|-------------------|
| Your body, built from your scan and measurements | Parametric mesh from measured circumferences and optional scan semi-axes |
| Built from your measurements | Manual-only path; same engine, estimated flags when UNKNOWN |
| Ghost overlay of where you started | First-scan (or future-self) vector through the same geometry builder |
| No photographic surface reconstruction | Explicit empty-state and header disclaimer |

## Forbidden (must not appear)

- Photographic surface reconstruction
- Photoreal skin / SMPL / suit-mesh equivalence claims
- Competitor mesh styling copy
- Fabricated improvements when single-scan or within-noise only

## Future reconstruction tier (gated)

A per-vertex photoreal reconstruction model is **not** in this build. Enabling it requires:

1. Gary approval of a named reconstruction model and license  
2. A separate prompt and feature flag  
3. Updated claims language after Kelsey clearance  

Until then, FormaVision remains measured parametric geometry only (210g / 210e-2 Rev C engine).

## Data spine

Both surfaces read `body_tracker` composition + circumference contracts. Manual Log Data and scans write the same tables; neither surface invents parallel stores.
