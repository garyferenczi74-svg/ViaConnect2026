# Prompt 170d Filed: NutriVision Multi-Photo Capture, Best-of-N Frame Ensemble

Date: 2026-05-29
Status: **Filed at spec level; ratified.** No code work in this turn.
Memorialized by: Jeffery (orchestrator) per Gary's "memorialize + Hannah UX dispatch" directive.
Wireframe author: Hannah (UX), filling Section 6 below.

## Mission (one line)

Add multi-photo capture (3 to 5 angles per meal) to the NutriVision pill, with frame quality scoring, streaming recognition, ensemble reconciliation across frames, and disagreement resolution. Estimated 5 to 12 percentage point lift over single-frame baseline.

## Activation posture

Opt-in by default. Three paths: (1) settings toggle, persistent. (2) per-meal rescue CTA when single-frame meal_confidence below 0.70. (3) long-press capture button for one-off.

## Why this is filed, not built

Per the spec's own §0 status line: "Sequenced after Prompt 170 ships and Prompts 170a + 170a-supplement are ratified."

Prerequisites that are structurally required but currently unmet:

### Hard structural blockers (170d cannot be built without these)

| 170d Section | Inherits From | Blocker State |
|---|---|---|
| §6.1, §6.2 streaming pipeline + per-frame job states | Supplement §13 nutrition_photo_jobs table + Realtime channel + (user_id, client_id) idempotency | **Deferred.** Real architectural shift. Synchronous POST works today; building §13 turns the analyze flow into a 2-call dance. |
| §3.3 per-meal rescue CTA on low confidence | Supplement §20 error_class taxonomy + Try-Again + Log-Manually | **Deferred.** Hannah tone pass needed per supplement §20.3. |
| §10.3 angle guide overlays | Reference object + plate selector treatment from supplement §17 | **Deferred.** Hannah UX pass needed per supplement §17.2. |
| §15.4 practitioner matrix extension (frame_coverage cols) | Supplement §19 meals_practitioner_view + meal_items_practitioner_view | **Deferred.** No practitioner portal shipped yet. |

### Soft blockers (170d should wait for confirmation)

- **Production verification of #170 Phase 1.** Pushed 2026-05-29 in commit 15b42ac8. No telemetry yet. No accuracy measurement against the supplement §4.2 baseline. 170d §12.1 lift targets are unverifiable until we measure.
- **Cost projection assumes LogMeal primary.** 170d §11 cost numbers ($7.2-10.8k/mo at 100k 3-frame meals) assume LogMeal is the active primary. Our current pipeline is Gemini-as-primary because no LOGMEAL_API_KEY is set. Cost reality is different until LogMeal lands.
- **Hannah's wireframes are the Blueprint longest-pole** per spec §21. Drafting them now (this turn) unblocks future Blueprint kickoff without writing application code.

## Ratification posture (2026-05-29)

Gary acknowledged 170d at spec level on 2026-05-29 by pasting the full spec into the session. Per the ViaConnect convention this counts as filed and ratified at the spec level. No code change is required to ratify a filed spec.

The next code action is dispatched when:
- (a) #170 Phase 1 has baked in production for at least 7 days with telemetry, AND
- (b) Supplement §13 + §17 + §19 + §20 have built or 170d has been rewritten to not depend on them, AND
- (c) Hannah's wireframes (Section 6 below) have been signed off by Gary, AND
- (d) `MULTI_PHOTO_ENABLED` kill switch defaulted to false for the first 24h smoke margin per §21.

## Independence notes

- **170b (depth sensors): orthogonal.** Multi-photo + Phase 1 ships independently. Combine multiplicatively when both are present (each frame gets a depth tile, ensemble weights depth-derived portions higher).
- **170c (PHI redaction + allergies crossover + ED safety): in either order.** Inherits per §2 if it lands first.

## Cost model (filed reference)

| Volume | Effective LogMeal calls (assuming 40 percent within-meal pHash hit rate at 3 frames) | LogMeal cost |
|---|---|---|
| 1k meals/mo | 1,800 calls | $72 to $108 |
| 10k meals/mo | 18,000 calls | $720 to $1,080 |
| 100k meals/mo | 180,000 calls | $7,200 to $10,800 |

Single-frame baseline at 100k/mo is $4-6k. Multi-photo at the same volume is approximately 1.8x. Actual cost depends on the multi_photo_adoption_rate which §17 telemetry surfaces in /admin/corpus.

## Helix events (filed for 170d build phase)

To be inserted into `helix_earning_event_types` when 170d builds:
- `nutrivision_multi_photo_meal_logged` (7 pt)
- `nutrivision_multi_photo_3plus_frames` (1 pt)
- `nutrivision_multi_photo_5_frames` (2 pt)
- `nutrivision_disagreement_resolved` (1 pt)
- `nutrivision_rescue_succeeded` (2 pt)

## Migrations (filed)

To be applied when 170d builds:
- `20260601_meal_frames.sql` (new table with `superseded` boolean + deferrable unique constraint for retake)
- `20260601_meal_items_multi_photo_cols.sql` (frame_coverage_n, frame_coverage_m, cluster_confidence, frame_coverage_low, disagreement_flag, disagreement_candidates_json, disagreement_resolved_by_user)
- `20260601_helix_multi_photo_events.sql`

Append-only per standing rules.

## Kill switch

`MULTI_PHOTO_ENABLED` env var. Defaults false at first launch for 24h smoke margin, then flipped true after monitoring confirms stability. When false: settings toggle hidden, long-press disabled, rescue CTA hidden, analyze endpoint rejects multi_photo_mode requests with 400.

## Section 6: Wireframes (Hannah)

Hannah fills the wireframes for each surface below in a follow-up edit pass. These are the Blueprint longest-pole deliverables per spec §21. Format: text wireframe + interaction notes + brand-token references.

### 6.1 Capture screen, multi-photo mode

**Mobile portrait wireframe (375 wide, viewport ~812 tall).**

```
+-------------------------------------------+ <- top safe area
|  [<]   Capture your meal                  |    44px header
|        Multi-photo mode                   |
+-------------------------------------------+
|                                           |
|              [ Frame 2 of 3 ]             | <- frame counter chip
|                                           |    (top-center, Card #1E3054 / 65 alpha)
|                                           |
|     +-------------------------------+     |
|     |                               |     |
|     |   .  .  .  .  .  .  .  .  .   |     | <- live camera preview
|     |   .                       .   |     |    (full-bleed within margin)
|     |   .   [angle guide        .   |     |
|     |   .    overlay; see 6.2]  .   |     |
|     |   .                       .   |     |
|     |   .  .  .  .  .  .  .  .  .   |     |
|     |                               |     |
|     |  [Reference object hint  i ]  |     | <- existing ReferenceObjectOverlay
|     +-------------------------------+     |    top-right of preview
|                                           |
|     [ tilt chip 42deg | in range ]        | <- gyroscope readout chip
|                                           |    (see 6.2 for color coding)
|                                           |
|  +-------------------------------------+  |
|  | [F1*][F2*]                          |  | <- thumbnail strip (see 6.3)
|  +-------------------------------------+  |    Card chips, scrolls horizontally
|                                           |
|     [ gallery ]    (O)    [ done ]        | <- bottom action row
|                                           |    capture button is the big circle
+-------------------------------------------+ <- bottom safe area (8px gap)
```

**Action row state machine:**

- Frames 0 to 2 captured: `[gallery]  (O)  [Done with 2]` disabled until frame 1 exists; `Done with N` visible once N >= 1 to let users bail early but actively discouraged with subtle copy.
- Frame 3 captured: action row reshuffles to `[Take another angle]  (O)  [Done with 3]`, Teal `Done with 3` is primary, neutral `Take another angle` is secondary text-button.
- Frames 4 and 5: same shape; capture button (O) disabled with helper text once 5 reached: "Five angles is the cap. Tap Done to review."

**Desktop responsive variant** (when `navigator.mediaDevices.getUserMedia` returns a stream, viewport >= md):

- Camera preview becomes a 16:9 inset card centered in a 720 wide stage rather than full-bleed.
- Thumbnail strip lives in a right-rail panel (240 wide) instead of overlaying the preview.
- Action row sits below the preview, not pinned to viewport bottom (no mobile safe area).
- Frame counter chip persists center-top of the preview frame, not viewport.
- Long-press is unavailable on desktop; desktop entry into multi-photo is settings-toggle only (per 6.9 posture).

**Interaction notes:**

- Tap targets: capture button (O) 72px diameter, gallery + Done buttons 48px minimum touch area each.
- Capture button haptic on press (light impact) + 180ms zoom-out scale on the just-captured frame as it migrates into the thumbnail strip.
- Frame counter chip animates a 0.6s gentle pulse (Teal ring) when incrementing.
- Done button transitions from `Done with 1` to `Done with 2` etc. with a 200ms label crossfade, no layout shift.
- Pinch-to-zoom on the preview is intentionally disabled to avoid the user thinking they have framing control they do not.
- Cancel back-chevron prompts a confirm modal once frame 1 exists: "Discard your captured angles? They have not been analyzed yet."

**Copy strings:**

- Header title: `Capture your meal`
- Header subtitle: `Multi-photo mode`
- Frame counter (variable): `Frame 1 of 3`, `Frame 2 of 3`, `Frame 3 of 3`, `Frame 4 of 5`, `Frame 5 of 5`
- Capture button aria: `Capture frame {n}`
- Done button: `Done with {n}`
- Secondary CTA (post-frame-3): `Take another angle`
- Five-frame cap helper: `Five angles is the cap. Tap Done to review.`
- Discard confirm title: `Discard your captured angles?`
- Discard confirm body: `They have not been analyzed yet.`
- Discard confirm CTAs: `Keep capturing`, `Discard`

**Brand tokens:**

- Surface background: Navy `#1A2744` viewport, Card `#1E3054` at 45 to 65 alpha for chips and frame counter pill.
- Capture button: Teal `#2DA5A0` fill, white ring at 8% alpha for the outer halo.
- Done CTA: Teal `#2DA5A0`, white text.
- Take another angle: transparent with white at 80% alpha text.
- Typography: Instrument Sans, header 16px semibold, body 12px regular, chip 11px medium.
- Icons: Lucide `Camera`, `ImageIcon`, `Check`, `ChevronLeft` at strokeWidth 1.5.

**Accessibility:**

- Frame counter chip: `role="status"` with `aria-live="polite"`, label `Frame {n} of {total}, capturing`.
- Capture button: `aria-label="Capture frame {n}"`, `aria-disabled` mirrors the disabled state at frame 5.
- Done button: `aria-label="Done capturing, review {n} angles"`.
- Focus order: back-chevron, frame counter (read-only), gyroscope chip (read-only), thumbnail strip items, gallery, capture, Done.
- Screen reader users get an announcement after each capture: `Frame {n} captured. Quality: good.` (or matching 6.4 string).

### 6.2 Angle guides (per frame)

Each angle guide is an overlay rendered above the live camera preview at roughly 60% opacity so the user can still see the plate underneath. The guide is purely instructional; the capture proceeds whether or not the user follows it.

**Frame 1, top-down (overhead).**

```
        +---------------------------+
        |                           |
        |       __________          |
        |      |   plate  |         |
        |      |  __  __  |         |  <- abstract plate icon, centered
        |      | |  ||  | |         |     concentric circles, dotted
        |      | |__||__| |         |
        |      |__________|         |
        |                           |
        |    [icon] Hold phone      |  <- helper line under the icon
        |          flat overhead    |
        |                           |
        +---------------------------+
```

Frame 1 helper copy: `Hold your phone flat above the plate.`

Frame 1 secondary copy when gyroscope reads >15deg off horizontal: `Tilt your phone a bit flatter for a true top-down view.`

**Frame 2, 45-degree perspective.**

```
        +---------------------------+
        |                           |
        |                           |
        |          ____             |
        |        /      \           |  <- plate icon drawn in perspective
        |       / oval   \          |
        |       \plate__ /          |
        |        \____ /            |
        |                           |
        |       v   <-- animated    |  <- chevron pulses downward,
        |       v       chevron     |     suggesting the tilt direction
        |       v                   |
        |                           |
        |    [icon] Tilt the phone  |
        |          to about 45      |
        |          degrees          |
        |                           |
        +---------------------------+
```

Frame 2 helper copy: `Tilt to about 45 degrees. Catch the height of taller items.`

Animated chevron: 3 stacked Lucide `ChevronDown` glyphs, Teal `#2DA5A0` at 60% alpha, 1.2s loop, each pulses sequentially top to bottom. Animation pauses when gyroscope reads in-range.

**Frame 3, side view (plate level).**

```
        +---------------------------+
        |                           |
        |                           |
        |   _________________       |
        |  |                 |      |  <- horizontal slab plate icon,
        |  | side profile    |      |     viewed edge-on
        |  |_________________|      |
        |                           |
        |     >>>                   |  <- chevron points horizontal
        |                           |     (3 stacked ChevronRight at 90deg)
        |                           |
        |    [icon] Hold the phone  |
        |          level with the   |
        |          plate edge       |
        |                           |
        +---------------------------+
```

Frame 3 helper copy: `Hold level with the plate edge. Helps us see layers and stacks.`

**Frames 4 and 5, free angle.**

```
        +---------------------------+
        |                           |
        |                           |
        |       [free-form icon]    |  <- Lucide `Sparkles`, soft Teal
        |                           |
        |    Any angle that shows   |
        |    something the others   |
        |    might miss             |
        |                           |
        |    Examples: a stack you  |
        |    saw on the side, a     |
        |    garnish hidden under   |
        |    the rim                |
        |                           |
        +---------------------------+
```

Frames 4 and 5 helper copy: `Any angle that shows something the others might miss.`

**Gyroscope readout chip.**

Single chip just below the preview, left-aligned within the capture stage. Three states keyed off `DeviceOrientationEvent.beta` and `gamma`:

- **In range** (green dot, Teal `#2DA5A0`, Card `#1E3054` background at 55 alpha): `Tilt: 44deg, in range for frame 2`
- **Slightly off** (neutral white at 60% alpha, no dot): `Tilt: 30deg, aim closer to 45`
- **Off target** (Orange `#B75E18` dot at 70% alpha, no Orange text; text stays white): `Tilt: 12deg, try angling the phone more`

Chip text updates on a 250ms throttle to avoid jitter. The chip is purely informational; capture is never blocked by gyroscope.

**Per-frame target tilt ranges:**

| Frame | Target beta (front-back) | Target gamma (left-right) |
|---|---|---|
| 1 top-down | 0 to 15 deg | -10 to 10 deg |
| 2 45-degree | 40 to 55 deg | -15 to 15 deg |
| 3 side | 75 to 95 deg | -15 to 15 deg |
| 4 to 5 free | any | any |

**Interaction notes:**

- Angle guide overlay fades in over 220ms when the user advances to the next frame.
- Tapping anywhere on the overlay dismisses it for that capture only; the gyroscope chip remains visible.
- A tiny `Show guide` link sits in the action row gutter (8px text, white at 55% alpha) to re-summon a dismissed overlay.
- No haptic feedback on gyroscope chip state changes; that would be noise.

**Copy strings:**

- Frame 1: `Hold your phone flat above the plate.`
- Frame 1 secondary: `Tilt your phone a bit flatter for a true top-down view.`
- Frame 2: `Tilt to about 45 degrees. Catch the height of taller items.`
- Frame 3: `Hold level with the plate edge. Helps us see layers and stacks.`
- Frames 4 to 5: `Any angle that shows something the others might miss.`
- Gyroscope chip in-range: `Tilt: {n}deg, in range for frame {k}`
- Gyroscope chip slightly off: `Tilt: {n}deg, aim closer to {target}`
- Gyroscope chip off target: `Tilt: {n}deg, try angling the phone more`
- Show guide link: `Show guide`

**Brand tokens:**

- Overlay background: Navy `#1A2744` at 35% alpha, blurred backdrop.
- Plate icon strokes: white at 65% alpha, strokeWidth 1.5.
- Chevron animation: Teal `#2DA5A0` at 60% alpha.
- Gyroscope chip dot: Teal `#2DA5A0` (in range), Orange `#B75E18` (off target).
- Typography: Instrument Sans, 12px regular for helper copy, 11px medium for chip.

**Accessibility:**

- Each angle guide overlay has `role="img"` with a descriptive `aria-label`, e.g. `Diagram: hold phone overhead, parallel to the plate`.
- The animated chevron has `aria-hidden="true"` since the helper copy already conveys the direction.
- Gyroscope chip: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`. Screen reader announcement throttled to once every 2 seconds so the user is not spammed.
- Helper copy strings are translated to screen-reader-only text for users who have the visual overlay dismissed.
- Reduced-motion preference (`prefers-reduced-motion: reduce`) freezes the animated chevron at the first frame; gyroscope chip text still updates because it is not motion-coded.

### 6.3 Thumbnail strip

A horizontal strip rendered above the bottom action row. Each captured frame becomes a 56x56 rounded-square chip with the live thumbnail, a frame label, and a quality dot.

**Empty + populated states.**

```
Empty (frame 0 captured):
+-----------------------------------------+
|  (no strip rendered; gap collapses)     |
+-----------------------------------------+

After frame 1:
+-----------------------------------------+
|  [F1*]                                  |
+-----------------------------------------+

After frame 3:
+-----------------------------------------+
|  [F1*] [F2*] [F3!]                      |
+-----------------------------------------+

After frame 5:
+-----------------------------------------+
|  [F1*] [F2*] [F3!] [F4*] [F5*]          |   <- scrolls if needed
+-----------------------------------------+
```

**Single chip anatomy.**

```
+----------+
| _______  |  <- 56x56 rounded square
||thumb  | |     Card #1E3054 border at 8% white,
||image  | |     thumbnail at full opacity
||_______| |
|  F2  *   |  <- frame label + quality dot
+----------+     11px label, dot 6px diameter
```

Quality dot color mapping:

- Teal `#2DA5A0`: frame passed all 6.4 quality checks.
- Neutral white at 60% alpha: frame has a soft caution (yellow-flag blur or borderline brightness).
- Orange `#B75E18`: frame is a retake recommendation (red-flag blur, severe brightness, or hard redundancy).

The currently selected frame in the strip (the one the user just captured, or one they tapped to preview) gets a Teal `#2DA5A0` outer ring at 60% alpha, 2px stroke.

**Tap-to-preview interaction.**

Tapping any chip opens a preview overlay:

```
+-------------------------------------------+
|                                           |
|         [          ]                      |
|         |  thumb   |   <- larger preview
|         |  larger  |      (240x240)
|         |__________|                      |
|                                           |
|         Quality: Looks good               |  <- 6.4 quality string
|         Angle: Top-down                   |  <- frame label
|                                           |
|     [ Retake ]      [ Keep ]              |
|                                           |
+-------------------------------------------+
```

- Retake CTA: replaces this frame in the array, returns the user to capture mode for the same frame number (frame counter shows `Frame {n} of {total}` with the same n).
- Keep CTA: dismisses the preview overlay back to capture mode at the next frame.
- Tapping outside the overlay also dismisses (same as Keep).

**Behavior when 5 frames exceed visible width.**

The strip becomes horizontally scrollable with `overflow-x: auto` and `scroll-snap-type: x mandatory`. Each chip is a snap stop. A subtle Card-colored fade mask on the right edge signals more content. The newly captured frame auto-scrolls into view with `scrollIntoView({ behavior: 'smooth', inline: 'end' })`. On viewports below 360 wide (corner case for small Android devices) the chips shrink to 48x48 to keep 4 visible at once.

**Interaction notes:**

- Tap target: 56x56 chip itself is the touch zone; no extra padding needed.
- Long-press on a chip (450ms) triggers a tooltip with the full quality string from 6.4, without opening the preview overlay.
- Reordering frames is intentionally disallowed; frames have semantic meaning per their angle.
- Chips fade in over 180ms when a new frame is captured.

**Copy strings:**

- Frame label format: `F1`, `F2`, `F3`, `F4`, `F5` (compact for the chip, accessible aria expands to full).
- Preview overlay quality lines: see 6.4.
- Preview overlay angle lines: `Top-down`, `45 degrees`, `Side view`, `Free angle`.
- Preview CTAs: `Retake`, `Keep`.
- Long-press tooltip example: `Frame 2, 45 degrees. Looks good.` (quality + angle combined).

**Brand tokens:**

- Chip background: Card `#1E3054` at 65% alpha when not selected, 75% when selected.
- Chip border: white at 8% alpha.
- Selected chip ring: Teal `#2DA5A0` at 60% alpha, 2px stroke.
- Quality dot: Teal `#2DA5A0`, neutral white at 60% alpha, or Orange `#B75E18` per state.
- Preview overlay backdrop: Navy `#1A2744` at 85% alpha + 20px blur.
- Retake CTA: Orange `#B75E18` background, white text.
- Keep CTA: Teal `#2DA5A0` background, white text.
- Typography: Instrument Sans, chip label 11px medium, preview heading 14px semibold.

**Accessibility:**

- Each chip is a `<button>` with `aria-label="Frame {n}, {angle name}, quality {state}. Tap to preview."`.
- Quality dot has `aria-hidden="true"` since the chip aria-label conveys it.
- Preview overlay is a focus-trapped dialog with `role="dialog"` and `aria-modal="true"`.
- Focus returns to the originating chip when the preview overlay closes.
- Screen-reader-only text describes the strip on first render: `Captured angles. You have {n} of {total}. Each chip can be tapped to retake or preview.`

### 6.4 Frame quality indicator copy

Five canonical copy strings cover the four quality dimensions in §5 (blur, brightness, framing, redundancy). Each string has a severity (red / yellow / neutral) that maps to the thumbnail dot color in 6.3 and the post-capture inline banner shown for ~1.8 seconds above the capture button after each shot.

**Inline post-capture banner anatomy.**

```
+-----------------------------------------+
|  [icon]  Looks good. Tap to take frame 2|   <- happy path, neutral
+-----------------------------------------+

+-----------------------------------------+
|  [icon]  Looks a bit blurry. Steady your|   <- yellow flag
|          hand and try again, or keep it.|
+-----------------------------------------+

+-----------------------------------------+
|  [icon]  Retake recommended, this frame |   <- red flag
|          came out blurry.               |
+-----------------------------------------+
```

The banner inherits the existing nutrition page surface treatment: Card `#1E3054` at 55% alpha with a 1px white at 8% alpha hairline. Icon is Lucide `AlertCircle` (red flag), `Circle` (yellow), or `CheckCircle2` (neutral good), strokeWidth 1.5.

**Five canonical strings.**

1. **Red flag, blur** (severity: red, dot Orange `#B75E18`, banner has Orange left-stripe at 60% alpha)
   - Inline: `Retake recommended, this frame came out blurry.`
   - Tooltip on chip long-press: `Blurry. Retake recommended.`
   - Aria announcement: `Frame {n} captured. Quality: blurry, retake recommended.`

2. **Yellow flag, slight blur** (severity: caution, dot neutral white at 60% alpha)
   - Inline: `Looks a bit blurry. Steady your hand and try again, or keep it.`
   - Tooltip: `Slight blur. Acceptable but a retake might help.`
   - Aria: `Frame {n} captured. Quality: slight blur.`

3. **Brightness too dark** (severity: caution, dot neutral; promote to red if histogram is severely clipped)
   - Inline (caution): `Looks a bit dark. More light would help recognition.`
   - Inline (severe): `Too dark to read. Try better lighting and retake.`
   - Tooltip (caution): `Dim lighting. Could be better.`
   - Tooltip (severe): `Underexposed. Retake in better light.`
   - Aria (caution): `Frame {n} captured. Quality: dim.`
   - Aria (severe): `Frame {n} captured. Quality: too dark, retake recommended.`

4. **Brightness too bright** (severity: caution, dot neutral; promote to red if histogram is hard-clipped)
   - Inline (caution): `Looks a bit washed out. Try moving out of direct sun.`
   - Inline (severe): `Too bright to read. Avoid direct sun or flash and retake.`
   - Tooltip (caution): `Bright lighting. Glare may hide detail.`
   - Tooltip (severe): `Overexposed. Retake without direct sun.`
   - Aria (caution): `Frame {n} captured. Quality: bright.`
   - Aria (severe): `Frame {n} captured. Quality: too bright, retake recommended.`

5. **Redundancy** (severity: caution, dot neutral; this is informational, never red)
   - Inline: `This angle looks the same as frame {k}. Try a different angle for more coverage.`
   - Tooltip: `Similar to frame {k}.`
   - Aria: `Frame {n} captured. Quality: similar to frame {k}.`

**Neutral pass-through (happy path)** (severity: good, dot Teal `#2DA5A0`)
   - Inline: `Looks good. Tap to take frame {n+1}.` (or `Looks good. Tap Done when ready.` at frame >= 3)
   - Tooltip: `Looks good.`
   - Aria: `Frame {n} captured. Quality: good.`

**Tone posture.**

Existing NutriVision copy (see CameraCapture and AnalysisProgress) leans gentle and instructional, not punitive. The quality copy follows the same posture: a red flag is a recommendation, never a forced retake. The capture flow always lets the user keep the frame even if quality is poor; the ensemble in §7 just weights it lower. Copy never says "bad photo" or "you should" or "you must."

**Brand tokens:**

- Banner background: Card `#1E3054` at 55% alpha.
- Banner left-stripe (red flag only): Orange `#B75E18` at 60% alpha, 3px wide.
- Banner left-stripe (yellow flag): white at 30% alpha, 3px wide.
- Banner icon: Lucide `AlertCircle` (red), `Circle` (yellow), `CheckCircle2` (good), strokeWidth 1.5.
- Typography: Instrument Sans, banner body 12px regular, tooltip 11px medium.

**Accessibility:**

- Inline banner: `role="status"` `aria-live="polite"`, replaces text on each capture so the screen reader gets exactly one announcement per frame.
- Aria announcement strings (listed above) are deliberately compact (under 80 chars each) so VoiceOver and TalkBack do not truncate.
- Quality dot has `aria-hidden="true"`; the wrapping chip aria-label conveys the state.
- Reduced-motion: the banner does not animate in or out; it fades over 80ms only.

### 6.5 Result review augmentations

The existing AnalysisResult view (see `MealItemCard` + `AnalysisResult.tsx`) renders the meal totals header at top, then a list of per-item cards. Multi-photo mode adds three new visual elements without restructuring the existing layout: a meal-totals angle tag, per-item frame-coverage chips, and an item-level disagreement banner that triggers the bottom sheet in 6.6.

**Meal totals header augmentation.**

```
+-------------------------------------------+
|  Meal totals                  [HC 86%]    |  <- existing ConfidenceBadge
|  Tap an item to adjust the portion or     |     (high confidence shown)
|  swap the food.                  3 angles |  <- NEW: angles tag
|                                           |     11px white at 70% alpha,
|  [Cal] [Pro] [Carb] [Fat]                 |     placed below the badge,
|   620   38g   72g    21g                  |     right-aligned
+-------------------------------------------+
```

The `3 angles` tag is a flat label, not a pill, set in Instrument Sans 11px regular with a small Lucide `Layers` icon at strokeWidth 1.5 immediately before the number. No background, no border. Lives in the existing header card, right-aligned beneath the confidence badge.

Variants:

- `3 angles` (typical)
- `5 angles` (full ensemble)
- `2 angles` (rare: user bailed early at frame 2 after confirming Done)

If only 1 angle is in play (single-photo mode), no tag is rendered. The tag is multi-photo specific.

**Per-item card augmentation: frame coverage chip.**

Added inline next to the existing ConfidenceBadge on each `MealItemCard`. Three states tied to §5 ensemble math:

```
Card example, item card with frame coverage chip:

+-------------------------------------------+
|  [thumb]  Grilled chicken breast          |
|           Portion: 4.0 oz                 |
|                                           |
|           [HC 91%]  [3 of 3 angles]       |  <- both inline, gap-1.5
|                                           |
|           Sliders: portion, swap, oil     |
+-------------------------------------------+
```

State 1, full coverage (item seen in every frame):

- Chip background: Card `#1E3054` at 45% alpha; no border accent.
- Copy: `3 of 3 angles` (variable n of m).
- Icon: Lucide `Layers` at strokeWidth 1.5, white at 70% alpha.
- Tone: informational, no warning.

State 2, low coverage (item seen in 1 of 3 or 1 of 5, flagged in §7 as `frame_coverage_low`):

- Chip background: Card `#1E3054` at 45% alpha with a 1px Orange `#B75E18` at 30% alpha border.
- Copy: `Only in 1 of 3 angles`
- Icon: Lucide `Layers` strokeWidth 1.5, Orange `#B75E18`.
- Tone: caution. The card itself gets a subtle Orange left-stripe (3px wide, 25% alpha) to match the banner pattern from 6.4.

State 3, occluded recovery (item appeared only after frame N because of occlusion):

- Chip background: Teal `#2DA5A0` at 12% alpha (positive framing; this is a feature win).
- Copy: `Found from a different angle`
- Icon: Lucide `Sparkles` strokeWidth 1.5, Teal `#2DA5A0`.
- Tone: a small celebration; multi-photo earned this find.

**Per-item card augmentation: disagreement banner.**

When §7 reconciliation surfaces a disagreement (two or more frames produced different labels with similar confidence), the affected item card gets a banner above the existing item content. The banner is the entry point for the bottom sheet in 6.6.

```
+-------------------------------------------+
|  [icon] Verify this item                  |  <- disagreement banner
|         We saw it as different things     |     Orange left-stripe
|         from different angles.            |     tappable surface
|                                  [Review] |
+-------------------------------------------+
|  [thumb]  Grilled chicken breast          |  <- standard item card
|           Portion: 4.0 oz                 |     beneath the banner
|           ...                             |
+-------------------------------------------+
```

Banner copy:

- Title: `Verify this item`
- Body: `We saw it as different things from different angles.`
- CTA: `Review`

The banner is a `<button>` so the whole thing is tappable, not just the Review label. Tapping opens the 6.6 bottom sheet for this specific item. After the user confirms in the sheet, the banner is removed with a 240ms slide-up + fade and the chip beneath updates to `Verified` in Teal `#2DA5A0`.

**Placement summary.**

- Meal totals header: existing card, add `3 angles` tag below the confidence badge, right-aligned.
- Each item card: chip rendered inline with the existing `ConfidenceBadge` in the card header row.
- Disagreement: banner stacked above the item card with `gap-1.5` between banner and card.

**Copy strings (canonical list).**

- Angle tag (meal totals): `{n} angles`
- Frame coverage, full: `{n} of {m} angles`
- Frame coverage, low: `Only in 1 of {m} angles`
- Frame coverage, occluded recovery: `Found from a different angle`
- Disagreement banner title: `Verify this item`
- Disagreement banner body: `We saw it as different things from different angles.`
- Disagreement banner CTA: `Review`
- Post-confirm chip: `Verified`

**Brand tokens:**

- Coverage chip background: Card `#1E3054` at 45% alpha.
- Low-coverage border + icon: Orange `#B75E18`.
- Occluded-recovery chip background: Teal `#2DA5A0` at 12% alpha, icon Teal `#2DA5A0`.
- Disagreement banner background: Card `#1E3054` at 55% alpha with Orange `#B75E18` at 40% alpha 3px left-stripe.
- Disagreement banner icon: Lucide `AlertCircle` strokeWidth 1.5, Orange `#B75E18`.
- Review CTA inside banner: text-only, Teal `#2DA5A0`, 12px semibold.
- Typography: Instrument Sans throughout, chip 11px medium, banner title 13px semibold, banner body 11px regular.

**Accessibility:**

- Coverage chip: `role="status"` with `aria-label="Item seen in {n} of {m} angles"`.
- Occluded-recovery variant: `aria-label="This item was found from a different angle"`.
- Disagreement banner: `<button aria-label="Verify this item. We identified it differently across angles. Tap to review.">`.
- After confirmation, the chip update fires an `aria-live="polite"` announcement: `Item verified.`
- Reading order: meal totals header (including the angles tag), then each item card top-to-bottom with banner-before-card when disagreement exists.

**Handoff note (Gordon):** Gordon should ingest `frame_coverage_n`, `frame_coverage_m`, and `disagreement_flag` from the per-item rows for the Nutritional Log to surface "this item had low angle coverage" hints in the historical view. Consistent unit conventions: `frame_coverage` is always whole integers (count of frames), never a percentage.

### 6.6 Disagreement resolver bottom sheet

Triggered from the disagreement banner in 6.5. A bottom sheet rises from the viewport bottom, dimming the meal review screen behind it.

**Bottom sheet anatomy.**

```
+-------------------------------------------+
|  (meal review screen dimmed, scrim 60%)   |
+-------------------------------------------+
|  +---------------------------------------+
|  |       _____                           |  <- grabber handle, 36x4
|  |                                       |
|  |  Help us pick the right item          |  <- title, 16px semibold
|  |  We saw this differently across       |  <- body, 12px regular
|  |  angles. Which one matches your meal? |
|  |                                       |
|  |  +-------+ +-------+ +-------+        |  <- frame thumbnails row
|  |  |frame  | |frame  | |frame  |        |     ~84x84 each, gap-2
|  |  |  1    | |  2    | |  3    |        |     show the cropped region
|  |  +-------+ +-------+ +-------+        |     where the item was detected
|  |                                       |
|  |  Candidates                           |  <- section label, 11px uppercase
|  |                                       |     white at 55% alpha
|  |  +-----------------------------------+|
|  |  | (o)  Grilled chicken breast       ||  <- radio chip rows,
|  |  |      [Our best guess]    Frames 1,3|     stacked vertically
|  |  +-----------------------------------+|
|  |  | ( )  Turkey breast, sliced        ||
|  |  |                          Frame 2  ||
|  |  +-----------------------------------+|
|  |                                       |
|  |  [ Not sure ]          [ Confirm ]    |  <- action row
|  |                                       |
|  +---------------------------------------+
+-------------------------------------------+
```

**Frame thumbnails row.**

Up to 3 thumbnails fit side by side at 84x84 in the 343 wide content column. If 4 or 5 frames contributed to the disagreement, the row scrolls horizontally with the same scroll-snap pattern as 6.3. Each thumbnail shows the cropped bounding box where this item was detected, not the full frame; this keeps the user focused on the item under discussion. A 11px label sits below each thumbnail: `Angle 1`, `Angle 2`, etc. The label is the angle name (top-down / 45 degrees / side / free) for frames 1 to 3, and `Angle 4` / `Angle 5` for frames 4 to 5.

**Candidate label radio chips.**

One row per distinct label from §7's `disagreement_candidates_json`. Each row contains:

- A radio control (Lucide `Circle` unselected, `CheckCircle2` selected, strokeWidth 1.5).
- The label text (12px medium).
- The `Our best guess` badge on the row whose label was the prior winner (the one we would have picked without the disagreement flag).
- A right-aligned `Frames {list}` annotation in 10px white at 55% alpha showing which frames voted for this label.

The `Our best guess` badge is a 9px uppercase pill, Teal `#2DA5A0` at 18% alpha background, Teal text. Conveys "this is the safer default if you Confirm without changing the selection."

**Edge case: 3 or more candidates.**

Up to 4 candidates render normally in the stacked list. At 5+ candidates (rare; happens when frames produce widely different labels), the list scrolls vertically within the sheet with a max-height of 60% of viewport. A small `Show more candidates` link is unnecessary; the scroll itself is the affordance.

**Action row.**

- `Confirm`: primary Teal `#2DA5A0` CTA, applies the selected radio choice to the item, fires the resolution telemetry event, closes the sheet.
- `Not sure`: secondary text button. Closes the sheet WITHOUT applying a change. The disagreement banner in 6.5 remains visible so the user can come back later, or save the meal with the item marked unresolved (which Gordon will surface in the Nutritional Log with the `Verify this item` hint preserved).

**Animations and motion.**

- Sheet rise: 280ms ease-out from `translateY(100%)` to `translateY(0)`.
- Scrim fade: 220ms from 0 to 60% opacity, concurrent with sheet rise.
- Confirm haptic: light impact on iOS, equivalent on Android via Capacitor Haptics plugin.
- Post-confirm: the bottom sheet dismisses with a 220ms slide-down, then the banner in 6.5 morphs into the `Verified` chip with a 240ms crossfade. No layout jump.
- Reduced-motion: replace slide-up + slide-down with a 120ms opacity fade.

**Interaction notes:**

- Grabber handle is decorative; the sheet can be drag-dismissed by swiping down on its top 80px.
- Tapping the scrim dismisses the sheet (treats as `Not sure`).
- Radio chip rows are entirely tappable, not just the radio control.
- Selecting a different candidate updates the `Confirm` button label tense from `Confirm` to `Confirm: turkey breast` only when the selection differs from the prior winner; this signals "you are about to overrule our best guess."

**Copy strings:**

- Title: `Help us pick the right item`
- Body: `We saw this differently across angles. Which one matches your meal?`
- Section label: `Candidates`
- Prior winner badge: `Our best guess`
- Confirm CTA (no change): `Confirm`
- Confirm CTA (overriding): `Confirm: {label}`
- Secondary CTA: `Not sure`
- Frame label format: `Angle {n}` or `Angle {n}: {angle name}` when tapped for tooltip
- Post-confirm announcement (aria-live): `Item updated. {final label}.`
- Post-not-sure announcement: `No change. You can come back to verify later.`

**Brand tokens:**

- Sheet background: Card `#1E3054` solid, with a top inner border at white 8% alpha.
- Scrim: Navy `#1A2744` at 60% alpha.
- Grabber handle: white at 25% alpha, 36x4 rounded.
- Radio chip background: Card `#1E3054` at 35% alpha, border white at 8% alpha.
- Selected radio chip background: Teal `#2DA5A0` at 12% alpha, border Teal at 30% alpha.
- `Our best guess` badge: Teal `#2DA5A0` at 18% alpha background, Teal text, 9px uppercase semibold.
- Confirm CTA: Teal `#2DA5A0` fill, white text.
- Not sure CTA: text-only, white at 80% alpha.
- Typography: Instrument Sans, title 16px semibold, body 12px regular, candidate label 12px medium, frame annotation 10px regular.

**Accessibility:**

- Sheet: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` points to the title, focus traps within the sheet, returns to the originating banner on close.
- Focus order: grabber (skipped, decorative), title (heading), body, first thumbnail, second thumbnail, third thumbnail, first radio chip, subsequent radio chips, Not sure, Confirm.
- Radio chips form a `role="radiogroup"` with `aria-labelledby` pointing to the `Candidates` section label; each chip is `role="radio"` with `aria-checked` mirroring state.
- Frame thumbnails: each is a `<button>` (tap for cropped-region zoom in a sub-overlay) with `aria-label="Angle {n}, {angle name}, this is what we saw"`.
- Confirm + Not sure announcements are wired to a single `aria-live="polite"` region rendered just below the action row.
- Drag-dismiss is supported but ALSO works via an explicit close button (Lucide `X`, strokeWidth 1.5, top-right of the sheet) for users who cannot perform a drag gesture.

### 6.7 Rescue CTA card

The rescue card appears at the top of the result review screen (above the meal totals header and item list) when the single-frame analyze returned a `meal_confidence` below 0.70. It is a gentle invitation, not an error state.

**Tone posture.**

I read the existing AnalysisProgress slow-path copy (`Still working. This can take a moment on slow connections.`) and the CorpusOptInBanner copy (`Share your saved meals to help improve recognition for everyone. You can opt out anytime.`) as the canonical references. Both are warm, low-pressure, and put the user in charge.

The rescue card follows the same posture:

- **Not** failure-coded. We do not say "low confidence", "could not identify", "try again", or "error". Those framings cue self-blame.
- **Names the cause as the photo, not the user.** A single angle "didn't show us enough" rather than "your photo was bad."
- **Offers a path, not a demand.** Adding angles is a suggestion; keeping the result as-is is also fine.
- **Optimistic about the upside.** Multi-photo is positioned as "see your meal more completely" rather than "rescue a broken result."

This matches supplement §20.3 tone direction (gentle invitation, not failure-coded).

**Card wireframe.**

```
+-------------------------------------------+
|  [icon]  See your meal more clearly       |  <- title, 14px semibold
|                                           |
|  One angle didn't show us everything.     |  <- body, 12px regular
|  Adding 2 or 3 more angles can help us    |     white at 80% alpha
|  catch items that are hidden, stacked,    |
|  or off to the side.                      |
|                                           |
|  [ Take more angles ]                     |  <- primary Teal CTA,
|  Keep what we have                        |     full-width on mobile
|                                           |  <- secondary text CTA below,
+-------------------------------------------+     centered, white at 70%
```

Icon: Lucide `Layers` at strokeWidth 1.5, rendered in a 32x32 Teal `#2DA5A0` at 15% alpha rounded square, Teal icon stroke.

**Interaction notes:**

- The card is dismissable. Tapping `Keep what we have` removes the card with a 220ms slide-up + fade; the meal review screen reflows up to take the space.
- Tapping `Take more angles` opens the capture screen (6.1) PRE-LOADED with the original frame as frame 1 of the new ensemble; the user picks up at frame 2. This is the rescue path: we do not throw away the user's original capture.
- The card is shown at most once per meal. If the user dismisses it and the new ensemble still has low confidence, we do not re-prompt; the standard low-confidence ConfidenceBadge already conveys the state on the totals header.
- On the second appearance (across separate meals), we do not show the icon's intro pulse animation; this is a quiet UI element after the first impression.

**Card position relative to other review elements.**

```
+-------------------------------------------+
|  [rescue card]              <- 6.7        |
|                                           |
|  Meal type picker                         |
|                                           |
|  Meal totals header         <- 6.5        |
|                                           |
|  Whole-meal chips                         |
|                                           |
|  [item card 1]                            |
|  [item card 2]                            |
|  ...                                      |
+-------------------------------------------+
```

Stays above the meal type picker so it is the first thing the user sees. Spacing: 12px gap to whatever is beneath.

**Copy strings:**

- Title: `See your meal more clearly`
- Body: `One angle didn't show us everything. Adding 2 or 3 more angles can help us catch items that are hidden, stacked, or off to the side.`
- Primary CTA: `Take more angles`
- Secondary CTA: `Keep what we have`
- Aria-live announcement on appearance: `Suggestion available. Adding more angles may show your meal more completely.`

**Brand tokens:**

- Card background: Teal `#2DA5A0` at 8% alpha (lighter than the disagreement banner; this is a gentle invitation, not a warning).
- Card border: Teal `#2DA5A0` at 25% alpha, 1px.
- Icon container: Teal `#2DA5A0` at 15% alpha, 32x32 rounded.
- Icon stroke: Teal `#2DA5A0`, Lucide `Layers`, strokeWidth 1.5.
- Primary CTA: Teal `#2DA5A0` fill, white text, 13px semibold, 44px tall.
- Secondary CTA: text-only, white at 70% alpha, 12px medium, 36px tall touch area.
- Typography: Instrument Sans throughout.

**Accessibility:**

- Card: `role="region"` with `aria-label="Optional: take more angles for better results"`.
- Aria-live announcement fires once on first render, polite, so it does not interrupt the totals announcement.
- Focus order: primary CTA, secondary CTA (the icon and body are read but not focusable).
- Reduced-motion: no slide animation on dismissal; opacity fade only.

**Handoff note (Gordon):** When the user takes the rescue path and the new ensemble succeeds, log a `nutrivision_rescue_succeeded` Helix event (per §5 of this filing doc). Gordon should treat rescued meals identically to native multi-photo meals for the Nutritional Log; the rescue origin is internal telemetry only.

### 6.8 Settings toggle

Lives in `Settings > NutriVision`, directly below the existing privacy retention setting. The retention setting is already in the flow; the multi-photo toggle is the new addition below it.

**Settings section layout.**

```
+-------------------------------------------+
|  NutriVision                              |  <- section header
+-------------------------------------------+
|                                           |
|  Save meal photos                  [on]   |  <- existing retention setting
|  Keep meal photos for 30 days,            |     (privacy retention)
|  then auto-delete.                        |
|                                           |
|  -- divider, 1px white at 6% alpha --     |
|                                           |
|  Multi-photo capture              [off]   |  <- NEW: this toggle
|  Take 3 to 5 angles of each meal for      |
|  more accurate recognition. Takes a       |
|  few extra seconds per meal.              |
|                                           |
|  -- divider --                            |
|                                           |
|  Contribute to accuracy research   [off]  |  <- existing corpus opt-in
|  ...                                      |
+-------------------------------------------+
```

**Toggle row anatomy.**

- Title left-aligned, 13px semibold, white.
- Switch right-aligned, 44x24 standard iOS-style: white at 8% alpha track when off, Teal `#2DA5A0` track when on, white thumb.
- Subtitle on a new line below the title, 11px regular, white at 65% alpha. Subtitle copy is honest about the tradeoff (per §11 cost model: do not promise infinite frames or hide the time cost).
- Whole row is the tap target (vertical padding 14px); the switch is mirrored from the row tap so the user does not have to hit the switch precisely.

**Toggle state.**

The state mirrors `user_nutrivision_settings.multi_photo_default` (new column added with 170d build, default false). Optimistic UI: the switch animates immediately on tap; failure to persist is rare and surfaces as a toast (`Could not save your preference. Try again.`) with the switch reverting.

**Confirmation banner after toggle on.**

The first time the user flips the toggle on (per-session, not per-account), a confirmation banner slides down from below the toggle row, visible for 4 seconds before auto-dismissing. Subsequent toggle-ons within the same session do not re-show the banner.

```
+-------------------------------------------+
|  Multi-photo capture               [on]   |
|  Take 3 to 5 angles of each meal...       |
+-------------------------------------------+
|                                           |
|  +---------------------------------------+
|  | [icon]  Multi-photo capture is on.    |  <- banner
|  |         Your next NutriVision photo   |     Teal background tint
|  |         will start in multi-photo     |     auto-dismisses in 4s
|  |         mode.                  [x]    |
|  +---------------------------------------+
|                                           |
+-------------------------------------------+
```

Banner copy: `Multi-photo capture is on. Your next NutriVision photo will start in multi-photo mode.`

Icon: Lucide `CheckCircle2`, strokeWidth 1.5, Teal `#2DA5A0`.

A close `[x]` button (Lucide `X` strokeWidth 1.5) lets the user dismiss the banner manually before the 4s timer elapses.

**Toggle off behavior.**

Turning the toggle off does NOT show a confirmation banner; absence of a banner is signal enough that the setting saved. The capture path returns to single-photo, but long-press in 6.9 still works as an ad-hoc multi-photo entry point even with this setting off.

**Interaction notes:**

- Tap target: the whole row is tappable (not just the switch).
- Toggle animation: 180ms ease-out for the thumb translation.
- Banner slide-in: 240ms from `translateY(-6px)` + opacity 0 to settled.
- Banner auto-dismiss: 220ms slide-up + fade after the 4s timer.
- Banner can be redisplayed by toggling off then back on within the same session; this is intentional, in case the user dismissed it too fast.

**Copy strings:**

- Title: `Multi-photo capture`
- Subtitle: `Take 3 to 5 angles of each meal for more accurate recognition. Takes a few extra seconds per meal.`
- Confirmation banner: `Multi-photo capture is on. Your next NutriVision photo will start in multi-photo mode.`
- Toggle save failure toast: `Could not save your preference. Try again.`
- Aria-label on switch: `Multi-photo capture, currently {on|off}. Tap to toggle.`
- Aria-live banner announcement: `Multi-photo capture is now on. Future meals will start in multi-photo mode.`

**Brand tokens:**

- Section header background: same as the existing Settings section pattern (Card `#1E3054` at 35% alpha).
- Toggle switch on-track: Teal `#2DA5A0`.
- Toggle switch off-track: white at 8% alpha.
- Toggle thumb: white.
- Confirmation banner background: Teal `#2DA5A0` at 12% alpha.
- Confirmation banner border: Teal `#2DA5A0` at 30% alpha, 1px.
- Confirmation banner icon + body color hierarchy: Teal icon, white body text.
- Divider: white at 6% alpha, 1px.
- Typography: Instrument Sans, title 13px semibold, subtitle 11px regular, banner body 12px regular.

**Accessibility:**

- Switch is a native `<input type="checkbox" role="switch">` with `aria-checked` and `aria-labelledby` pointing to the title.
- Subtitle is associated via `aria-describedby` so screen readers read it after the title and state.
- Whole row tap is wired via a `<label>` so click-on-text-toggles-switch is free (no JS bridging).
- Banner is `role="status"` with `aria-live="polite"` for the announcement; the `[x]` close button is `aria-label="Dismiss"`.
- Focus order: previous setting's switch, this row, next setting's switch.
- The close button on the banner is independently focusable for keyboard users who want to dismiss before the timer.

### 6.9 Long-press affordance

**Tone posture and recommendation.**

Long-press is a power-user shortcut. I recommend a layered discovery approach: a one-time first-capture tutorial card, a subtle persistent visual hint on the capture button, and a discoverability mention in the rescue card copy. This balances three concerns:

1. **Accessibility.** Long-press is gesturally awkward for users with motor impairments, arthritis, tremor, or non-dominant-hand use. We cannot make multi-photo discoverable ONLY via long-press; the settings toggle in 6.8 and the rescue path in 6.7 must remain first-class entry points.
2. **Don't paper over the feature.** Hiding long-press entirely (no surfacing at all) means users who would benefit never find it. The first-capture tutorial card surfaces it once, then trusts the user.
3. **Don't beat them over the head.** A persistent "long press for multi-photo" banner cluttering every capture screen is noisy. The hint must be subtle.

**Tutorial card on first capture.**

Renders ABOVE the single-photo CameraCapture surface the very first time a user reaches `/nutrition/photo-ai` after 170d ships. Stored in `user_nutrivision_settings.long_press_hint_seen` (new boolean column, default false; set true on first dismissal or after 7 seconds auto-dismiss).

```
+-------------------------------------------+
|  [icon]  Try multi-photo for tough meals  |  <- title, 13px semibold
|                                           |
|  Long-press the capture button to take    |  <- body, 11px regular
|  3 to 5 angles of one meal. Good for      |     white at 75% alpha
|  stacked plates and bowls where things    |
|  can hide.                                |
|                                           |
|  Got it                                   |  <- inline text-button,
+-------------------------------------------+     Teal, 12px medium
```

Auto-dismisses after 7 seconds if not interacted with. The `Got it` button is also dismissable, both set the flag to true.

**Persistent visual hint on the capture button.**

The capture button (the big circle in the action row from 6.1) gets a tiny dotted ring around its outer edge: 1px Teal `#2DA5A0` at 35% alpha, 4px dash and 4px gap pattern. This is a visual signal "this button has a long-press affordance" without spelling it out. The ring is decorative; screen readers ignore it.

```
+-----------+
|           |
|    O      |   <- standard capture button
|           |
+-----------+

Becomes:

+-----------+
|  . . . .  |
|  .   O .  |   <- dotted ring outer edge,
|  .   . .  |      4px dash + 4px gap
|  . . . .  |      Teal at 35% alpha
+-----------+
```

The dotted ring renders only when `user_nutrivision_settings.multi_photo_default` is FALSE; when the toggle is on, the user is always already in multi-photo and the long-press shortcut is redundant.

**Rescue card cross-reference.**

The rescue card copy in 6.7 already mentions "more angles" as the path. If the user discovers multi-photo via the rescue card, that is also a valid discovery moment; we do not need to surface long-press separately there.

**Long-press gesture mechanics.**

- Hold duration to trigger: 500ms (matches the standard touch-and-hold threshold used elsewhere in the codebase, e.g. thumbnail strip tooltip).
- Visual feedback during hold: the capture button's Teal fill brightens from `#2DA5A0` to a 110% lightness variant over the 500ms hold, with a concentric ring radiating outward.
- Haptic feedback: medium impact at the 500ms mark when the long-press is registered.
- On release after the threshold: transition to multi-photo capture mode (6.1), pre-capturing frame 1 with whatever the camera was already framing. So a long-press IS a frame-1 capture; users do not need to long-press AND then tap.
- On release before the threshold (regular tap): standard single-photo capture, unchanged.

**Accessibility considerations and alternatives.**

For users who cannot perform a long-press (motor accessibility):

- The settings toggle in 6.8 is the canonical alternative. Once enabled, every capture starts in multi-photo mode without any gestural input.
- The rescue card in 6.7 is a tap-only alternative once a single-photo result is in hand.
- A long-press is NEVER required to access multi-photo. It is a convenience, not a gate.
- For screen reader users, the dotted ring is invisible (not announced). The settings toggle is the discoverable entry point. The tutorial card on first capture still appears with full screen-reader support but does NOT mention "long-press the capture button" as the primary CTA; instead it says: `Multi-photo mode is available for tough meals. You can turn it on in Settings, or use it just once by long-pressing the capture button.` Screen-reader users get both paths described.

**Copy strings:**

- Tutorial card title: `Try multi-photo for tough meals`
- Tutorial card body (default): `Long-press the capture button to take 3 to 5 angles of one meal. Good for stacked plates and bowls where things can hide.`
- Tutorial card body (screen reader variant): `Multi-photo mode is available for tough meals. You can turn it on in Settings, or use it just once by long-pressing the capture button.`
- Tutorial card dismiss: `Got it`
- Aria-label on capture button (when dotted ring present): `Capture photo. Long-press for multi-photo mode.`
- Haptic confirmation aria-live (optional, fires when long-press registers): `Multi-photo mode starting.`

**Brand tokens:**

- Tutorial card background: Card `#1E3054` at 45% alpha, border white at 8% alpha.
- Tutorial card icon: Lucide `Layers` strokeWidth 1.5, in a 28x28 Teal `#2DA5A0` at 15% alpha rounded square.
- Tutorial card `Got it`: Teal `#2DA5A0`, 12px medium, text-only.
- Capture button dotted ring: Teal `#2DA5A0` at 35% alpha, 1px stroke, 4-4 dash pattern.
- Capture button hold animation: Teal fill brightens; ring radiates from `scale(1)` to `scale(1.3)` opacity 0 over 500ms.
- Typography: Instrument Sans throughout.

**Accessibility:**

- Tutorial card: `role="region"` `aria-label="Tip: multi-photo mode is available"`. Auto-dismiss after 7 seconds is announced via `aria-live="polite"`: `Tip dismissed. You can find this in Settings.`
- Capture button aria-label: changes based on whether the dotted ring is rendered; screen-reader users get the same information as visual users.
- Long-press alternative for keyboard users: a hidden `Multi-photo mode` button rendered after the capture button in tab order, visible only when focused. Tab to it, press Enter, enters multi-photo mode without any gesture. Label: `Use multi-photo mode for this capture`. This makes the feature reachable for switch-control and external-keyboard users on iOS/Android shells.
- The dotted ring decoration has `aria-hidden="true"` so it does not pollute the screen reader stream.

**Concern flagged for Gary:** I recommend the layered approach above (tutorial + dotted ring + keyboard-accessible alternative button), but the dotted ring around the capture button is a visual change to the existing capture screen even in single-photo mode. If Gary prefers the capture button to remain visually identical in single-photo mode, drop the dotted ring; the tutorial card on first capture is enough discoverability. This is a subjective UX call.

### 6.10 Brand tokens enforced

**Token list (canonical).**

| Token | Hex | Common use in 170d surfaces |
|---|---|---|
| Navy | `#1A2744` | Page background, scrim overlays at 60% alpha, frame counter chip at 65% alpha |
| Card | `#1E3054` | Card surfaces (capture screen, totals header, item cards, bottom sheets) typically at 35 to 65% alpha |
| Teal | `#2DA5A0` | Primary CTAs, confirmation states, success indicators, "good" quality dot, capture button fill |
| Orange | `#B75E18` | Caution accents (retake recommended, low coverage, disagreement banner left-stripe) |
| White (text + strokes) | `#FFFFFF` at varying alpha | 100% for primary text, 80% for secondary, 65% for tertiary, 55% for helper, 25% for grabber handles |

**Typography (canonical).**

- Family: Instrument Sans (existing site font).
- Size scale used in 170d:
  - 16px semibold: dialog and section titles.
  - 14px semibold: card titles.
  - 13px semibold: settings row titles, button labels.
  - 12px regular and medium: body copy, button labels, chip labels.
  - 11px regular and medium: subtitles, helper copy, chip labels, frame labels.
  - 10px regular: frame annotations in disagreement sheet, frame-list annotations.
  - 9px uppercase semibold: badges (e.g. `Our best guess`).

**Iconography (canonical).**

- Library: Lucide React.
- Stroke width: 1.5 for all icons across 170d surfaces (matches existing NutriVision components).
- Icons used in 170d:
  - `Camera`, `ImageIcon` (capture screen, gallery)
  - `Layers` (multi-photo identity icon: tutorial card, rescue card, coverage chips)
  - `ChevronDown`, `ChevronLeft`, `ChevronRight` (back nav, animated angle guide chevrons)
  - `Circle`, `CheckCircle2`, `AlertCircle` (confidence, quality, status indicators)
  - `Sparkles` (occluded-recovery chip, free-angle indicator)
  - `Info` (reference object overlay, existing)
  - `X` (dismiss buttons)
  - `Loader2` (analyzing state, existing)

**Mini style guide for new component patterns.**

The 170d build introduces the following patterns; each is reusable across the four surfaces (capture, review, settings, tutorial).

1. **Frame counter chip pattern.**
   - Use: capture screen top, post-capture banner inline mentions, thumbnail strip labels.
   - Background: Card `#1E3054` at 65% alpha, 1px white at 8% border, rounded-full.
   - Content: 11px medium white text, optional Teal dot prefix when active.
   - Example variants: `Frame 1 of 3`, `3 of 3 angles`, `Only in 1 of 3 angles`.

2. **Quality dot pattern.**
   - Use: thumbnail strip, item card coverage chips.
   - Size: 6px diameter.
   - Colors: Teal `#2DA5A0` (good), white at 60% alpha (caution), Orange `#B75E18` (retake recommended).
   - Always paired with a text label; never used alone (accessibility).

3. **Rescue invitation card pattern.**
   - Use: 6.7 rescue card, 6.9 tutorial card.
   - Background: Teal `#2DA5A0` at 8 to 12% alpha (lighter than warnings), Teal at 25% alpha 1px border.
   - Icon container: 28 to 32px Teal at 15% alpha rounded square, Teal stroke icon.
   - Primary CTA: solid Teal fill, white text.
   - Secondary CTA: text-only, white at 70% alpha, centered or left-aligned.

4. **Disagreement banner pattern.**
   - Use: 6.5 item disagreement banner.
   - Background: Card `#1E3054` at 55% alpha, Orange `#B75E18` at 40% alpha 3px LEFT-stripe.
   - Icon: Lucide `AlertCircle` strokeWidth 1.5, Orange.
   - CTA: inline text-only, Teal `#2DA5A0`, 12px semibold.
   - Tone: investigative, not punitive.

5. **Inline confirmation banner pattern.**
   - Use: 6.8 settings confirmation, post-resolution announcements.
   - Background: Teal `#2DA5A0` at 12% alpha, Teal at 30% alpha 1px border.
   - Icon: Lucide `CheckCircle2` strokeWidth 1.5, Teal.
   - Auto-dismiss: 4 seconds with optional manual dismiss.

**Hard rules enforced across all of Section 6.**

- No em (U+2014) or en (U+2013) dashes anywhere in copy. Standard hyphens in compound words (e.g. `45-degree`, `top-down`, `low-confidence`) are fine.
- No emojis in any copy or icons.
- All icons rendered at strokeWidth 1.5.
- Brand tokens above only; no other colors introduced.
- Instrument Sans only; no font swaps.
- All `prefers-reduced-motion` user preferences honored: animations either swap to opacity fades or are removed.
- All `role`, `aria-label`, `aria-live`, `aria-modal`, `aria-checked` attributes specified for new interactive elements.
- "Bio Optimization" verbatim if it appears in any copy (does not appear in current 6.1 through 6.9 copy; flagged here for downstream Blueprint compliance).
- "10x to 28x" verbatim if bioavailability appears (does not appear in current scope).
- No references to Semaglutide, Retatrutide, Tesofensine (none appear; flagged here for downstream Blueprint compliance).
- Gordon spelling canonical, not Gordan (referenced in 6.5 and 6.7 handoff notes).

## Acceptance for filed status

This document is the filing artifact. Ratification at spec level is acknowledged 2026-05-29. Code work is not in scope until prerequisites in the "Hard structural blockers" table above are resolved or 170d is rewritten to skip them.

## Related

- Prompt 170 spec (shipped Phase 1, commit 15b42ac8 on 2026-05-29).
- Prompt 170a + 170a-supplement (ratified 2026-05-29; safe set §15+§16+§18 shipped).
- Prompt 170b (filed, not built).
- Prompt 170c (placeholder, not built).
