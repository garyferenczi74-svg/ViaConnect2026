# Body Scan Inclusivity Roadmap (Phase 2)

Prompt #169b, Task 19, spec section 7.3 / 7.4.

## Why this document exists

The in-flow inclusivity message shown on every Body Scan capture step (component
`BodyScanInclusivityFallback`, the "I can't do this pose" affordance) makes an
honest promise: today, Via Cura Body Scan requires a standing A-pose with both
arms outstretched, and we are working to expand support for more body types and
capture positions in a future release.

This file is the brief, honest record of what "expand support" means, so the
in-flow copy is grounded in a real plan rather than a vague aspiration. These are
roadmap items only. There is no code for any of these capture modes yet. The
shipped behavior in Phase 1 is the standing A-pose only.

## Phase 2 candidate capture modes

These map to the `requested_capability` values offered to users who opt into the
inclusivity waitlist (`body_scan_inclusivity_waitlist.requested_capability`), so
we can prioritize by demand.

- **Seated capture (`seated`)**
  A capture flow for users who cannot stand for the scan (wheelchair users, users
  with balance, fatigue, or chronic pain limitations). Requires a seated pose
  template, a revised silhouette segmentation expectation, and seated-specific
  measurement geometry. Not built.

- **Single-arm capture (`single_arm`)**
  A capture flow for users who cannot fully outstretch both arms (limb
  difference, amputation, injury, range-of-motion limitations, casts/slings).
  Requires landmark and measurement handling that does not assume bilateral arm
  symmetry. Not built.

- **Single-leg capture (`single_leg`)**
  A capture flow for users who cannot bear weight or stand symmetrically on both
  legs (limb difference, amputation, prosthesis, injury). Requires lower-body
  landmark and measurement handling that does not assume bilateral leg symmetry.
  Not built.

- **Other (`other`)**
  A catch-all for capture limitations not enumerated above, captured as free-text
  context (`body_scan_inclusivity_waitlist.notes`) so we learn about needs we did
  not anticipate. This is also the value recorded for the generic in-flow "I
  can't do this pose" opt-in.

## In the meantime (Phase 1, shipped)

Until the modes above ship, a user who cannot complete the standing A-pose is
told, honestly, that their practitioner can run a manual body composition
assessment that we will include in their tracking, and is offered a waitlist
opt-in so we can notify them when expanded scanning is available.

## Out of scope here

No clinical claims, no SKUs, no dosages, and no specific timelines. Sequencing,
clinical sign-off, and any public communication of these modes are Gary's gate.
