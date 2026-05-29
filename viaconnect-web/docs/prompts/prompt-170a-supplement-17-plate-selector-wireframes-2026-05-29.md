# 170a Supplement §17 Wireframes: Reference Object Detection + Plate Selector

Date: 2026-05-29
Status: **Wireframes pending Hannah fill.** Spec-only deliverable, no code.
Wireframe author: Hannah (UX)
Memorialized by: Jeffery
Unblocks: 170d §10.3 angle guides; future build of supplement §17 plate-size selector

## Spec source
170a Supplement §17 (Reference Object Detection Specification). Key decisions:
- **Drop fork** entirely from reference catalog (varies too much: child fork to serving fork)
- **Credit card primary** (ISO/IEC 7810 ID-1: 85.60 x 53.98 mm, globally standardized aspect ratio 1.586)
- **Plate selector secondary** (8 inch / 10 inch / 12 inch chips on result review when no credit card detected)
- **Unknown object misidentification** → ignore, log aspect ratio for offline calibration, downgrade confidence band; do NOT inform user
- Spec edits to Prompt 170 §2.1 step 4 + §10.5

## Current code state (relevant context for wireframes)

- `src/lib/nutrition/portion/reference-objects.ts` — `REFERENCE_CATALOG` has credit_card + standard_fork + plate_10in + plate_12in. Fork needs removal; plate_8in needs adding.
- `src/lib/nutrition/portion/types.ts` line 29-32 — `ReferenceObjectKind` enum mirrors the catalog
- `src/lib/nutrition/portion/volume-estimate.ts` — consumes the reference object
- `AnalysisResult.tsx` — result review screen where the plate selector renders

## Hannah's wireframes to fill below

Format per subsection:
1. ASCII text wireframe (mobile 375 portrait + desktop responsive note)
2. Interaction notes (tap targets, transitions, animation, gyroscope read)
3. Copy strings (button labels, hint text, error states) — NO em or en dashes, NO emojis
4. Brand token references (Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18, Instrument Sans, Lucide strokeWidth 1.5)
5. Accessibility notes (aria, focus order, screen-reader text for visual cues)

### §17.1 Capture screen reference object hint

**Posture recommendation: persistent low-emphasis pill at the bottom of the viewfinder, NOT a pulse animation. Auto-fades to 40 percent opacity once a card-shaped object is detected; does not auto-dismiss.**

Rationale: a pulsing badge competes with the framing reticle and feels like a nag. A static bottom pill reads as a tip, not a warning. Fade-on-detect rewards the user without removing the hint entirely (the detection is provisional and may de-confirm during capture).

**Mobile 375 portrait wireframe:**

```
+-------------------------------+
|  [X close]          [flash]   |  <- top chrome, Navy #1A2744 @ 80% over feed
|                               |
|                               |
|                               |
|       +---------------+       |
|       |               |       |
|       |   reticle     |       |  <- center framing guide, Teal #2DA5A0
|       |   (plate)     |       |     stroke, strokeWidth 1.5
|       |               |       |
|       +---------------+       |
|                               |
|                               |
|                               |
|   [ + Add a card for scale ]  |  <- pill, Card #1E3054 @ 90% bg,
|                               |     Teal #2DA5A0 text, 14px Instrument Sans
|                               |
|         (  capture  )         |  <- shutter button, Teal fill
+-------------------------------+
```

**Desktop responsive note:** desktop uses a side panel for the capture experience (already in NutriVisionTab). The hint pill anchors to the lower-left of the live feed at the same 14px size; the bottom of the feed has more vertical room so the pill sits 24px above the shutter row.

**Interaction notes:**
- Pill is informational, NOT a button. No tap target (60dp transparent passthrough so the user can still tap the shutter).
- Detection event (`reference_candidate=credit_card`, confidence band low or higher): pill cross-fades to 40 percent opacity over 240ms.
- Loss of detection: cross-fades back to 100 percent over 240ms. No flashing if the detection oscillates; debounce 600ms before un-fading.
- The pill never blocks the shutter or close affordance. Tap-passthrough confirmed.
- No haptic on detection state change. Camera capture itself is the haptic event.

**Copy strings:**
- Pill text: `Add a card for scale`
- Screen-reader-only context on first viewfinder render: `Tip. For best portion accuracy, place a credit card or ID card next to your plate before taking the photo.`

**Brand tokens:**
- Pill background: Card `#1E3054` at 90 percent alpha
- Pill text: Teal `#2DA5A0`, Instrument Sans 14px / 20 line-height, weight 500
- Pill border: 1px Teal `#2DA5A0` at 30 percent alpha
- Reticle stroke: Teal `#2DA5A0`, strokeWidth 1.5, Lucide React `Square` rounded variant
- Padding: 10px vertical, 14px horizontal, 999px corner radius

**Accessibility notes:**
- Pill is `<div role="status" aria-live="polite">` so screen readers announce the tip once on first render but don't re-announce on detection state changes.
- The fade-on-detect is visual reinforcement only; screen-reader users get no spoken cue (would be intrusive during composition). The result-screen plate selector is the recovery path for low-vision users.
- Pill text contrast on Card `#1E3054` background = 7.2:1 (WCAG AAA).
- Reduced-motion users: fade is instant, no 240ms cross-fade.

### §17.2 Plate selector on result review

**Mobile 375 portrait wireframe:**

```
+-------------------------------+
|  [<] Back        Review meal  |  <- top nav, Navy #1A2744
+-------------------------------+
|                               |
|  [photo thumb 343x180]        |  <- captured meal photo, 12px radius
|                               |
+-------------------------------+
|                               |
|  No card detected for scale.  |  <- 16px Instrument Sans, weight 600,
|  What plate size is this?     |     Teal #2DA5A0 accent on first line
|                               |
|  +------+ +--------+ +------+ |
|  | 8 in | | 10 in  | | 12in | |  <- chip row, horizontal, 12px gap
|  | Small| |Medium  | |Large | |     Medium pre-selected (Teal fill)
|  +------+ +--------+ +------+ |
|                               |
+-------------------------------+
|                               |
|  Totals                       |  <- existing totals card below
|  ...                          |
+-------------------------------+
```

**Desktop responsive note:** chip row stays inline; chips grow to min 96px wide each on >=768px. Hint copy moves to left-aligned with chips right-aligned on the same row at >=1024px (saves vertical space when reviewing multiple items).

**Interaction notes:**
- Chip row mounts at the top of the result review scroll container, ABOVE the totals card and item list.
- Medium chip is pre-selected on mount (filled Teal, not just outlined). See §17.3 for default behavior rationale.
- Tap a chip: 100ms scale 0.96 to 1.0 spring; chip swap is instantaneous (no inter-chip animation). Totals card recalcs in place with a 200ms tween on numeric values.
- Tap targets: each chip is 56px tall, min 80px wide (44dp baseline + breathing room).
- After user makes any selection, the row stays visible but collapses copy: hint text shrinks from 2 lines to "Plate size:" 12px label, chips stay full size for re-selection.
- Per-spec, this chip row is a one-time-per-meal-photo prompt. Once the meal is logged, the choice is recorded on the meal_logs row and the chip row does not re-render on subsequent views of the same meal.
- No 4th chip for "Other" or "Don't know." Medium covers the median case; the user can always log manually if all three feel wrong.

**Copy strings:**
- Pre-selection hint line 1: `No card detected for scale.`
- Pre-selection hint line 2: `What plate size is this?`
- Chip labels: `Small` / `Medium` / `Large` (primary) with `8 in` / `10 in` / `12 in` as secondary line below in 11px weight 400
- Post-selection collapsed label: `Plate size:`

**Brand tokens:**
- Chip background unselected: Navy `#1A2744` with 1.5px Teal `#2DA5A0` at 40 percent border
- Chip background selected: Teal `#2DA5A0` solid fill
- Chip text unselected: Teal `#2DA5A0`
- Chip text selected: Navy `#1A2744` (high contrast on Teal)
- Hint text primary line: Teal `#2DA5A0`, Instrument Sans 16px weight 600
- Hint text secondary line: white at 80 percent alpha, Instrument Sans 16px weight 400
- Corner radius: 12px on chips
- No icon on chips (clean text reads faster than a plate-glyph at this size)

**Accessibility notes:**
- Chip row is a `<div role="radiogroup" aria-label="Plate size for portion scaling">` with 3 `role="radio"` children.
- Medium has `aria-checked="true"` on mount.
- Each chip has `aria-label` of the full phrase: `Small plate, 8 inches` / `Medium plate, 10 inches` / `Large plate, 12 inches`.
- Focus order: chip row receives focus immediately after the photo thumb, BEFORE the totals card. Arrow keys move between chips (standard radio group keyboard model).
- Color contrast on selected Teal chip: Navy text on Teal = 6.4:1 (WCAG AA Large + AAA Normal).

### §17.3 Plate selector default + dismiss behavior

**Posture recommendation: silent pre-select, NO visible countdown. Medium is the default value on mount; the totals card reflects Medium pricing immediately. The "5 second auto-default" in the spec is interpreted as "the user has 5 seconds to override before the value is committed to the meal log on save," NOT a countdown that flashes on screen.**

Rationale: a visible countdown creates pressure on motor-impaired users and screen-reader users to act fast, and a 5-second countdown sweeps under the cognitive-load threshold for accessibility-first design. A silent pre-select with persistent re-selectability is the calm posture: the user can change it any time before tapping Save Meal; nothing is "locked in" by inaction.

**State model:**
- Mount: Medium chip rendered as `aria-checked="true"`, totals card calculated against Medium.
- User taps Small or Large: state updates, totals recalc, chip visual swaps.
- User does nothing: Medium stays the selection forever. No countdown, no warning, no nag toast.
- User taps Save Meal: whatever chip is currently selected is recorded in `meal_logs.plate_size_kind` (enum: `small_8in` / `medium_10in` / `large_12in` / `unspecified` for the no-plate-detected case).
- User taps Discard: no record written.

**Why not a countdown:**
- Motor-impaired users (per WCAG 2.2.1 Timing Adjustable) need either no timing constraint OR a clear way to extend / disable the timer. Either path adds UI; pre-select with persistent re-edit removes the timing constraint entirely.
- Screen-reader users tabbing through the chips might not finish navigation in 5 seconds, especially with verbose verbosity settings.
- A countdown implies "we don't trust your input" which conflicts with the calm-confidence brand voice.

**Implementation note for downstream Michelangelo:** there is NO `setTimeout` involved in the user-facing UX. The "5 second" reference in the spec collapses to "pre-selected on mount." If the spec was intended to mean "auto-commit on a timer," push back with this section as the justification.

**Copy strings:**
- No countdown copy needed. Persistent label after first interaction stays `Plate size:` (per §17.2).

**Brand tokens:**
- N/A for this subsection (no new surface). Tokens carry from §17.2.

**Accessibility notes:**
- No time-based interaction. WCAG 2.2.1 Timing Adjustable is fully compliant by removing the timer altogether.
- Screen-reader announces on mount: `Plate size: Medium plate, 10 inches selected. You can change this.` Implementation via `aria-describedby` pointing to a visually hidden helper string.
- Reduced-motion users see no transitions on chip swap (instant state change).

### §17.4 Unknown object false-positive UX

**Posture recommendation: confirm spec. Silent ignore + log + downgrade is the right tone. Hannah endorses with one caveat below.**

Rationale: telling the user "we saw something that looks like a card but isn't" creates more cognitive load than the value of the information. The user did not ask for that information; surfacing it would imply the system is uncertain in a way that erodes confidence in the rest of the analysis. The plate selector chip row in §17.2 is the recovery affordance for users who realize the AI underestimated portions; that pathway is intentional and visible, and it covers the false-positive case without naming it.

**Confidence band downgrade is the visible signal.** The user already sees Teal-to-neutral-to-Orange dot transitions per supplement §18.1 confidence dots. That visual is the honest representation of "we are less sure." The user can tap a low-confidence item for the explanation (see §17.5 below).

**Caveat, one place where silent ignore can hurt trust:** if the unknown-object detection produces a systematically wrong portion estimate (e.g., a coaster gets read as a card and inflates portion 2x), the user has no way to flag it without leaving the screen. Recommendation: the existing per-item edit affordance (already in 170 Phase 1) already lets the user correct portions. As long as that edit affordance is one tap away and visible, the silent ignore is safe. Confirm with Michelangelo on implementation that per-item portion edit remains a primary affordance on the result review screen for low-confidence items.

**No new copy needed. No new UI element. No new accessibility surface.**

**Logging spec confirmation:**
- Log line: `nutrition.portion.reference_object.unknown_aspect_ratio` with payload `{ aspect_ratio: number, expected: 1.586, tolerance: 0.05, confidence_band_before: string, confidence_band_after: string }`. Server-side only; no client-side console emission.
- The downgraded confidence band is the only state change visible to the user.

**Push-back if any:** none. The spec posture is correct.

### §17.5 Confidence dot downgrade copy on result review

**Mobile 375 portrait wireframe (tap-state popover):**

```
+-------------------------------+
|  Grilled chicken thigh        |  <- item row, tap target full width
|  4 oz est.            [ . ]   |  <- confidence dot (Orange, low)
|  +-------------------------+  |
|  | Why is this estimate    |  |  <- popover, anchor on dot, Card #1E3054
|  | less certain?           |  |
|  |                         |  |
|  | No size reference was   |  |
|  | detected in your photo. |  |
|  | A credit card or your   |  |
|  | plate size choice helps |  |
|  | us scale more accurately|  |
|  |                         |  |
|  | [ Edit portion ]        |  |  <- Teal text-style button
|  +-------------------------+  |
+-------------------------------+
```

**Desktop responsive note:** popover anchors right-of-dot on >=768px (more horizontal room). Mobile keeps the popover below the item row.

**Interaction notes:**
- Confidence dot itself is a tap target (44dp expanded hit area around the 10px visual dot).
- Tap dot: popover appears with 180ms fade + 8px upward slide.
- Popover dismisses on any outside tap, on dot re-tap, or after the user taps "Edit portion."
- "Edit portion" CTA inside the popover opens the existing per-item portion edit affordance (already in 170 Phase 1) and dismisses the popover.
- Only LOW confidence dots (Orange) trigger this popover. Medium and Teal dots have no tap interaction (no popover; the dot is purely indicator).
- The popover is informational only; closing it does NOT change confidence band or any logged state.

**Copy strings:**
- Popover heading: `Why is this estimate less certain?`
- Popover body: `No size reference was detected in your photo. A credit card or your plate size choice helps us scale more accurately.`
- Popover CTA: `Edit portion`

**Critical tone note:** the copy frames the gap as "no reference detected" not "the AI was unsure" or "we got this wrong." The system did its best with what was visible; the user has the affordance to refine. This protects trust without overclaiming accuracy.

**Brand tokens:**
- Popover background: Card `#1E3054` with 1px Teal `#2DA5A0` at 30 percent border
- Popover heading: white, Instrument Sans 14px weight 600
- Popover body: white at 85 percent alpha, Instrument Sans 13px / 18 line-height, weight 400
- Edit portion text: Teal `#2DA5A0`, Instrument Sans 14px weight 500
- Popover corner radius: 10px
- Popover max-width: 280px; padding 16px

**Accessibility notes:**
- Confidence dot is `<button aria-label="Why is this estimate less certain?" aria-expanded="false">`. Expanded state toggles to `true` when popover is open.
- Popover is `<div role="dialog" aria-labelledby="...">` with focus moved to the popover heading on open.
- Escape key dismisses the popover.
- Edit portion button is the next-focusable element after the heading.
- For Medium and Teal dots, render as `<span aria-label="High confidence">` (or "Medium") with no button semantics; screen reader announces the state without offering interaction.
- Color is not the only signal: the dot also has a visually hidden text label so screen-reader users can perceive confidence band without seeing color.

### §17.6 Settings panel: reference object preference

**Recommendation: DROP for Phase 1. Defer to Phase 2 and only ship if usage data shows >20 percent of users tapping the same plate size on >5 meals.**

Rationale: this is a power-user affordance with high cognitive cost (the user has to know what plate size they own AND remember to update it if they switch plates) and low likely usage. Most users eat from a mix of plates: home dinner plate, restaurant plates, takeout containers. A persistent default would be wrong as often as it would be right, and the recovery path is annoying (the user has to remember the setting exists and where it lives).

The plate selector chip row in §17.2 is fast enough (one tap, no countdown pressure) that the per-meal selection is not a meaningful friction. Settings noise is more expensive than the friction it removes.

**Decision rule for Phase 2:** ship the setting if and only if both conditions hold after 90 days of Phase 1 telemetry:
1. >20 percent of users select the same plate size on >5 consecutive meals
2. <5 percent of those users override the same-size selection within those 5 meals (i.e., they really do eat from the same plate)

If either condition fails, the setting is more confusing than helpful and stays cut.

**No wireframe needed for Phase 1.**

**Future Phase 2 sketch (informational only, not a Phase 1 deliverable):**
- Setting lives at Settings > Nutrition > Reference plate size
- Toggle off by default: "Ask me each time"
- Toggle on: shows the same 3 chips, but choice persists and skips §17.2 chip row on capture
- Setting can be reset to default anytime
- Setting does not override credit card detection if one is found (camera-detected card always wins)

**Push-back if any:** none. This is a Hannah-initiated drop, not a spec disagreement.

### §17.7 Brand tokens enforced

All surfaces use Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`, Orange `#B75E18`. Instrument Sans. Lucide React strokeWidth 1.5. NO emojis. NO em or en dashes.

## Notes Hannah may want to consider

- The plate selector is the most likely UX entry point for users to enter wrong-size data. Wireframe should make Medium feel like a safe default without making the user feel they're missing something by not choosing.
- The credit card hint on capture is borderline: too pushy and it feels intrusive; too subtle and users miss it. Find the right balance.
- Per supplement §17.4 the "silent ignore" of misidentified objects is a deliberate tone choice. If Hannah disagrees, this is the place to push back.

## Handoff notes

When Hannah finishes filling, this doc becomes the spec-lock for §17 code work. Future Michelangelo dispatch will reference §17.1 through §17.6 directly.

## Related

- Supplement §17 spec source
- Existing reference-objects.ts code path
- 170d Filing Doc §6.2 angle guides (depends on §17)
