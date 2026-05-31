# Four View Capture Flow (v1)

Prompt #169e Phase 1 deliverable, per Section 3.1 and Section 9.1. This document
describes the four view capture flow AS IMPLEMENTED in Phase 1, grounded in the
shipped code, not the idealized spec. Where the spec and the shipped reality
differ, the shipped reality governs and the difference is called out.

Branch: feat/prompt-169e-phase1. Date: 2026-05-31.

## Naming and path reality (read first)

The spec named this capability under `src/modules/body-tracker/formavision` and
referred to FormaVision components and a `body_scans` table. None of those exist
in this codebase. Phase 1 was built under the existing Body Scan paths, and the
FormaVision rebrand (Prompt #169c) is not in the codebase.

- Capture component: `src/components/body-tracker/photos/PhotoSessionCapture.tsx`.
- Pose definitions: `src/components/body-tracker/photos/poseConstants.ts`.
- Cross view clothing decision: `src/lib/body-tracker/cross-view-clothing.ts`.
- Pose count source of truth: `src/lib/body-tracker/capture-pose-count.ts`.
- Schema: `body_photo_sessions` (NOT `body_scans`); the pose count column was
  added by migration `supabase/migrations/20260516000130_prompt_169e_capture_pose_count.sql`.
- A repository search for "FormaVision" returns a single match, a comment in
  `src/components/body-tracker/scanning/AsymmetryAnalysisPanel.tsx` that states
  the panel is neutral Body Scan naming and NOT a FormaVision module, "which
  does not exist in this codebase". There is no `src/modules/body-tracker`
  directory at all.

Read every reference below as Body Scan code. The FormaVision name is aspirational
and does not appear in any shipped path.

## 1. The discrete four pose sequence

Phase 1 captures four discrete, separately validated poses in one session, NOT a
continuous rotation. The session is a state machine
(`onboarding -> calibration -> capturing -> finishing`) and the `capturing` step
walks the four poses one at a time with Back / Next controls and a per pose dot
indicator.

The shipped pose order, from `PHOTO_POSES` in `poseConstants.ts`, is:

1. Front view. "Stand facing the camera with arms slightly away from your body,
   feet shoulder width apart." (This is the front A pose.)
2. Back view. "Turn around completely. Stand with arms slightly away from your
   body, same stance as front." (This is the back A pose.)
3. Left side. "Turn 90 degrees to your left. Stand naturally with arms at your
   sides. Look straight ahead." (Side neutral.)
4. Right side. "Turn 90 degrees to your right. Stand naturally with arms at your
   sides. Look straight ahead." (Side neutral.)

Honest note on ordering: Section 3.1 of the spec described the sequence as front
A pose, right side neutral, back A pose, left side neutral. The shipped order is
front, back, left, right (the side poses are taken last, left before right). The
four views captured are identical to the spec; only the order within the sequence
differs. The four canonical view ids used everywhere downstream are `front`,
`back`, `left`, `right` (`CaptureViewId` in `cross-view-clothing.ts`).

### Per pose validation indicators

Each pose is gated by live quality scoring before it can be accepted. While the
`capturing` step is active, a `requestAnimationFrame` loop samples the live camera
frame and calls `aggregateQualityScores` (from `scan-quality.ts`), and the result
is rendered by `QualityIndicators`. The capture is not a manual shutter press: the
overlay auto captures only after the overall pass holds for the hold window, then
fires `onAutoCapture`. Tier 1 is shown throughout (Tier badge plus the Award
icon), consistent with the tier resolver always returning Tier 1 in Phase 1.

If the pose that authorized a capture did not actually pass its blocking gates,
the burst is discarded and the pose's blocking issues are surfaced for a retake of
that single pose (see section 2). The scores read at the per pose gate are the
snapshot that authorized the capture, not the still ticking live scores, so a
frame that flips immediately after the trigger cannot cause a spurious rejection.

### Three frame fusion per pose

Each accepted pose is not a single still. On capture, the flow fires a three frame
burst at 100 ms intervals (`MULTI_FRAME_FUSION.intervalMs`, `frameCount` = 3), then
fuses the three frames with `fuseFrames` (from `multi-frame-fusion.ts`). Fusion
yields a consensus silhouette mask (encoded to a single JPEG and uploaded as that
pose's image) plus averaged keypoints. If exactly three frames are not collected,
or fusion throws, the flow falls back to the last captured frame so the pose still
produces an image. The averaged keypoints from every pose are accumulated into one
flat array that is sent to the analyze edge function at finish.

## 2. Per pose retake granularity

A failed pose reissues ONLY that pose; the other captured poses are preserved.
This is the explicit Phase 1 behavior (Section 3.1) and it holds in two places:

- Automatic gate failure: when the authorizing quality scores for the current pose
  do not pass, the flow does not upload, sets that pose's blocking issues, and
  returns without touching any other pose's stored image or recorded ratio. The UI
  renders a per pose retake card ("This <pose> needs another try", the blocking
  issue list, and "Only this photo needs retaking. Your other views are saved.")
  shown only while that pose has no stored image.
- Manual retake: `handleRetake` clears only the current pose's upload state and
  only the current pose's recorded clothing ratio (`delete next[pose.id]`), and
  clears the per pose blocking copy. The other three views are untouched.

Captured poses are tracked per view in `uploads` (front / back / left / right,
each holding `fullPath`, `thumbPath`, `previewUrl`) and mirrored in the
`body_photo_sessions.poses_completed` text array, so a preserved view is a real,
persisted view, not just in memory.

## 3. Cross view clothing tightness check

Before a session is submitted, the flow evaluates clothing tightness across all
captured views at once, in the pure, tested helper
`evaluateCrossViewClothing` (`cross-view-clothing.ts`).

### The rule and the boundary

If ANY single captured view exceeds the clothing tightness ceiling, the WHOLE scan
is rejected with a non alarming retake prompt that asks the user to put on snug,
close fitting clothing and retake all four photos. One baggy view fails the set.

The ceiling is 1.18 (`CLOTHING_TIGHTNESS_MAX_RATIO`, sourced from
`CLOTHING_TIGHTNESS_RANGE.max`). The boundary is a CLOSED upper bound: a view
exactly at 1.18 is acceptable; a view strictly above 1.18 (for example 1.1801)
fails. "Exceeds" is strict greater than 1.18. The helper is also defensive: a non
finite ratio is treated as a failing view (it cannot be confirmed in range), and
an empty input is treated as a pass, with callers gating on having actually
captured the views. Only views that were captured (and therefore already passed
their own per pose gate) are fed into the cross view check at finish.

On failure, `finish()` sets the retake message, returns the user to the
`capturing` step, and does not submit. On pass, the flow proceeds to persist and
analyze.

### Honest placeholder caveat

The live per view ratio is currently a placeholder proportional estimate, not a
true silhouette measurement. In `PhotoSessionCapture.tsx` the ratio is computed as
`scoreClothingTightness(frameAreaPx * 0.25, frameAreaPx * 0.23)`, that is, the
silhouette mask area and the expected body area are both approximated as fixed
fractions of the camera frame area (the same proportional approximation the live
quality loop uses). Because both inputs scale together, the placeholder ratio is
effectively constant and does not yet reflect how baggy a specific view actually
is.

The decision logic, the 1.18 closed boundary, and the whole scan reject behavior
are real, shipped, and unit tested. What is not yet real is the per view input
feeding them. The gate becomes fully live when the real silhouette segmentation
(Prompt #169 Section 7, track T7) supplies true per view mask areas to
`scoreClothingTightness` in place of the proportional approximation. The
segmentation module itself exists (`src/lib/arnold/scanning/silhouetteProcessor.ts`),
so closing this is a wiring task, replacing the two `frameAreaPx * k` arguments
with measured mask area and expected body area, not new research.

Until that wiring lands, treat the cross view clothing gate as plumbed and correct
but not yet discriminating on real data.

## 4. Schema: capture_pose_count, and the silhouette URL columns that were NOT added

Phase 1 added exactly one column,
`body_photo_sessions.capture_pose_count`, via
`supabase/migrations/20260516000130_prompt_169e_capture_pose_count.sql`:

- `INTEGER NOT NULL DEFAULT 4`, with `CHECK (capture_pose_count IS NULL OR
  capture_pose_count IN (2, 4))`. The "IS NULL" arm is defensive only; the column
  is NOT NULL.
- It records how many distinct poses a capture run used. The standard four view
  flow always writes 4. The value 2 is reserved for a future two view express
  flow and is not shipped as a user facing path in Phase 1.
- The value written never drifts from the allowed set because it comes from a
  single source of truth, `FOUR_VIEW_POSE_COUNT` (= `selectCapturePoseCount('four_view')`
  = 4) in `capture-pose-count.ts`. The persist path in `finish()` writes
  `capture_pose_count: FOUR_VIEW_POSE_COUNT` alongside `arnold_status: 'queued'`.
- The migration is append only and idempotent (ADD COLUMN IF NOT EXISTS, no DROP,
  no data edits), and its timestamp sits after the last #169 migration and below
  the live #170 range, per the placement constraint.

The `silhouette_*_url` columns named in the spec drafts (for example
`silhouette_back_url`, `silhouette_right_url`, `silhouette_left_url`) were
intentionally NOT added. `body_photo_sessions` already stores the four photos as
`front_full_path` / `back_full_path` / `left_full_path` / `right_full_path`
(each with a matching `_thumb_path`), plus a `silhouette_data` JSONB summary
(added by migration `20260416000100_body_scan_measurements.sql`). The capture flow
uploads each pose's fused frame to `{pose}_full_path` and does not produce separate
per pose silhouette image URLs that would need their own home, so adding those
columns would be unused, redundant schema. The existing `full_path` plus
`silhouette_data` model already covers all four views. This omission is documented
in the migration header itself.

## 5. What is deferred to Phase 2

The continuous rotation capture (the Tier 2 and Tier 3 capture experience) is
deferred to Phase 2 and is gated on native depth (Gate C). Phase 1 ships only the
discrete four pose flow described above, and the tier resolver
(`src/lib/body-tracker/scan-tier.ts`) returns Tier 1 unconditionally, so there is
no Tier 2 or Tier 3 capture path live today. See
`docs/formavision/phase-2-dependency-gates.md` for the full Phase 2 gate set and
the deferred capability list.

## Provenance

- Spec: Prompt #169e Phase 1, Section 3.1 (four view capture, per pose retake,
  cross view clothing, capture_pose_count) and Section 9.1.
- Shipped reality: `src/components/body-tracker/photos/PhotoSessionCapture.tsx`,
  `src/components/body-tracker/photos/poseConstants.ts`,
  `src/lib/body-tracker/cross-view-clothing.ts`,
  `src/lib/body-tracker/capture-pose-count.ts`,
  `src/lib/body-tracker/scan-quality.ts`,
  `supabase/migrations/20260516000130_prompt_169e_capture_pose_count.sql`,
  `supabase/migrations/20260416000090_body_photo_sessions.sql`.
- Where the spec and the shipped code diverge (pose order, FormaVision naming,
  silhouette URL columns, the live clothing ratio input), the shipped reality
  governs and the divergence is stated above.
