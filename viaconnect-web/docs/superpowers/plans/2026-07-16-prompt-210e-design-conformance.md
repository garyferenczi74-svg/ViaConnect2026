# Prompt 210e FormaVision Design Conformance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. This is a design-conformance build: the acceptance gate for visual/motion tasks is Sherlock side-by-side against the canonical assets (Section 6), not only unit tests. Pure helpers are still built test-first.

**Goal:** Restyle the (now-rendering, post-210h) FormaVision Body Composition surface to Gary's canonical Via Cura design (two PNGs = layout/look, four `.mp4`/`.mov` = motion), same measurement calculations underneath, new skin on top.

**Architecture:** Presentation-layer only. The Three.js scene material and framing are restyled (tri-mesh + rim glow, avatar reduced ~15% to fit frame); the surrounding DOM (header tabs, 4-card row, callouts, Time Machine bar) is restyled and re-set with framer-motion for count-ups/transitions/entrances; new interactions (bidirectional rotation, region zoom with circled highlight, ghost materialize, tab-open motion, units toggle) wrap existing V1 systems. Zero changes to measurement calculations, the scan pipeline, data contracts, or the `body_tracker` schema. Every value equals the cards and the stored vector (one-source rule).

**Tech Stack:** Next.js 14.2.35, React 18.3.1, TypeScript strict, Tailwind, `@react-three/fiber` 8.18.0 + `@react-three/drei` 9.122.0 + three 0.184.0 (per 210h; do NOT change), framer-motion 12.38.0 (already installed), Vitest.

## Binding precondition

210h has merged and the 3D avatar renders on production (verified 2026-07-16). This plan restyles that rendering surface.

## Global Constraints (verbatim from Section 0 + standing rules)

- Lucide React icons at strokeWidth 1.5 only. No emojis. No em dashes or en dashes anywhere (grep the diff before shipping).
- Design tokens only: Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18, Instrument Sans. Status via `severityToken`. The one delta-accent decision (Section 5.4) is Gary's: build proceeds with Orange #B75E18 for decrease deltas until Gary says otherwise.
- Desktop and mobile in synchronism from the first line of markup. 44px touch targets, text-base inputs, no horizontal overflow.
- No migrations. Never touch email templates. `package.json` is limited to the already-present framer-motion; NO other dependency may be added (gsap and @react-three/postprocessing remain unapproved). Do not change the r3f/drei/three/react/next versions (210h constraint).
- Resilience, fail-open with reason tags, the fallback ladder (cinematic, lite, 2D floor), and the one-source-of-truth rule all survive the restyle intact.
- UNKNOWN and estimated stay honest, never 0, never fabricated. Honest disabled states are never flipped to look finished. Pixels only; never touch a stored value, a computation, a date, a delta, or a count.
- framer-motion is DOM/React motion only (card count-ups, callout/panel/toggle transitions, tab entrances) with interruption handling for rapid Time Machine scrubbing and full prefers-reduced-motion respect. NOT used inside the Three.js scene; the avatar materialize/sweep/idle/morph stay in the r3f render loop.

## Assets (the contract)

Checked into `viaconnect-web/docs/design-refs/formavision-210e/` in Task 1:
- `Forma_vision_3d_avatar_male.png`, `Forma_vision_3d_avatar_female.png` (layout/look, pixel canon).
- `Formnavision_3d_avatar_Male.mp4`, `Formnavision_3d_avatar_female.mp4` (main motion: intro materialize ~2.5s, sweep zoom-into-a-ring ~4-6.5s, calm idle; card count-ups; units toggle).
- Behavior refs (reference only, not checked in unless small): IMG_9291 rotation, IMG_9294 region zoom, IMG_9295 ghost, IMG_9297 tab-open.

## Human gates
- Kelsey re-clears any changed rendered string (Time Machine descriptor polish by Hannah). Sherlock produces the side-by-side conformance stills + motion recordings (Section 6). Gary confirms on his own production devices (non-delegable).

## Existing V1 files this plan restyles (do not rebuild the geometry/data)

- Surface: `src/app/(app)/(consumer)/body-tracker/composition/page.tsx`.
- 3D: `src/components/formavision/{BodyCompositionAvatar,FormaVision3DAvatar,FormaVisionCanvas,GhostMesh,MeasurementCallouts,MeasurementRing,EmphasisParticles}.tsx`.
- Mesh material: `src/lib/formavision/materials/{bodyWireframeMaterial,cellTexture,formaVisionTokens}.ts`; geometry `src/lib/formavision/geometry/buildBodyGeometry.ts`.
- Region selection: `SelectBodyPartControl.tsx`, `src/components/body-tracker/HoverSystem/*`.
- Cards: `src/components/body-tracker/FloatingMetricCard.tsx`, `src/lib/body-tracker/composition/metricCards.ts`.
- Time Machine: `src/components/formavision/JourneyTimeline.tsx`.
- Units source: `src/lib/body-tracker/circumference.ts` (MeasurementUnit), `UnitToggle.tsx`.

---

### Task 1: Discovery, asset check-in, conformance scaffold

**Files:** create `docs/design-refs/formavision-210e/` (assets), `docs/formavision/210e-conformance.md` (scaffold), `docs/formavision/210e-discovery.md`.

- [ ] Watch the four behavior videos and confirm the mapping (rotation/zoom/ghost/tab) and the main `.mp4` motion beats; record per-interaction feel notes.
- [ ] Check the two PNGs and two `.mp4`s into `docs/design-refs/formavision-210e/`.
- [ ] Record exact interfaces: `FormaVisionCanvas` Canvas props + camera framing constant (for the ~15% fit); `bodyWireframeMaterial` current material (quad-grid vs tri) and the geometry's triangle availability; `MeasurementCallouts`/`MeasurementRing` prop shape; `GhostMesh` prop seam (`ghostVector`,`showGhost` already wired in `page.tsx`); the card data path (`buildMetricCards`) and the `FloatingMetricCard` props; the 13 region keys (`BODY_PARTS` in page.tsx) and their callout source; the `MeasurementUnit` type + where display conversion happens.
- [ ] Create `210e-conformance.md` with empty side-by-side + motion-recording + deviation-list + delta-color sections.
- [ ] Commit.

### Task 2: Units conversion + value-format helpers (pure, test-first)

The units toggle (Imperial lbs/in/ft <-> Metric kg/cm) and card/callout formatting are pure. Storage is unchanged; conversion is display-time only.

**Files:** create `src/lib/formavision/format/units.ts`, `format/deltaFormat.ts`; tests alongside.

- [ ] Test-first: `toDisplayWeight(lb, unit)`, `toDisplayLength(inches, unit)`, `toDisplayHeight(inches, unit)` -> {value, unitLabel}; round-trip and boundary tests (0, negative guarded, non-finite -> honest UNKNOWN passthrough). `formatDelta(deltaSigned, unit)` -> {text, direction:'up'|'down'|'flat', arrow}. `deltaColor(direction)` -> Orange #B75E18 for decrease per Section 5.4.
- [ ] Implement minimal; every animated number lands exactly on the canonical value (animation is presentation, endpoint is data).
- [ ] Commit.

### Task 3: Mesh restyle (tri-mesh + rim glow) in the r3f loop

Restyle `bodyWireframeMaterial` from the quad-grid look to the canonical fine triangular mesh with a bright silhouette rim and meshed (not blacked-out) face. Keep the parametric geometry from the user's numbers.

**Files:** modify `src/lib/formavision/materials/bodyWireframeMaterial.ts` (+ `cellTexture.ts`, `formaVisionTokens.ts`); possibly `buildBodyGeometry.ts` triangle wireframe; `FormaVisionCanvas.tsx` material wiring.

- [ ] Match the PNG mesh: dense tri-mesh teal wireframe (#2DA5A0 family), bright rim/fresnel silhouette glow, subtle face mesh. Shader/material only; geometry vertices unchanged. Reduced-motion and lite-tier variants preserved.
- [ ] Conformance: side-by-side the rendered mesh vs the PNG mesh detail; Sherlock note. Commit.

### Task 4: Avatar framing (reduce ~15% to fit the frame)

Per Gary: the avatar overflows and must shrink ~15% to fit the frame completely.

**Files:** modify `FormaVisionCanvas.tsx` (camera distance/fov or scene scale) and/or the `BodyCompositionAvatar` sizing container.

- [ ] Adjust the single framing constant so the full body (head to feet) sits inside the frame with the canonical margin from the PNGs, at desktop and mobile. Do not distort proportions; change framing/scale only.
- [ ] Conformance: avatar fits frame like the PNG at 375px and 1440px. Commit.

### Task 5: The four-card row (new card set + honest states)

Replace the current top pills (Total Body Fat / BMI / Visceral Fat / Body Water) on THIS surface with the four canonical cards: BODY FAT (% + since-first delta), MUSCLE MASS (value + delta), WEIGHT (value + HEIGHT beneath), TOTAL MEASUREMENTS (count + arrow). BMI/Visceral/Body Water stay available in the segmental panel and Measurements tab (removed from this row only, never the data).

**Files:** modify `metricCards.ts` (re-set the four cards from existing snapshot values, no rewiring), `FloatingMetricCard.tsx` (canonical card style: rounded Card #1E3054, uppercase small-cap labels, large bold values, small delta lines, Instrument Sans), `page.tsx` card row.

- [ ] Values come from the existing canonical snapshot (`buildMetricCards`), converted via Task 2. Honest No-data state styled to the new design. Every value responds to the units toggle.
- [ ] Conformance vs PNG card row. Commit.

### Task 6: Card motion + Time Machine progress on the cards (framer-motion)

Per Section 2 + Gary's July 16 instruction: the Time Machine's progress lives ON the cards (no separate progress card). Cards count up on first load and count smoothly between scan states as the Time Machine scrubs/plays; deltas and arrows update live in the same beat; units toggle transitions smoothly; reduced motion updates instantly with full parity.

**Files:** modify `FloatingMetricCard.tsx` (framer-motion count-up + transition), wire the Time Machine scrub/play state to the card values in `page.tsx`.

- [ ] framer-motion count-up with interruption handling for rapid scrubbing (a new scrub retargets, never queues stale animations); every animation lands exactly on the canonical value. `prefers-reduced-motion` -> instant. Not inside the r3f scene.
- [ ] Conformance vs the `.mp4` card motion feel. Commit.

### Task 7: Header tabs + Measurements navigation + units tab

Four header controls: Body Fat (active, teal underline), Muscle Mass, Measurements (real navigation to the manual measurement input surface, not a dead tab), and the Imperial/Metric units tab at top right (instant, complete, bidirectional conversion of cards, callouts, zoom panel, and ghost values).

**Files:** modify `page.tsx` header row; reuse `CompositionSectionToggle`/`UnitToggle`; wire units through Task 2 everywhere; Measurements tab routes to the existing manual-input surface.

- [ ] Units toggle converts every displayed value both directions instantly. Measurements tab is a real navigation. Commit.

### Task 8: Thirteen-region callout system

Every current region as a callout on the 3D body: Neck, Shoulders, Chest, L/R Bicep, L/R Forearm, Waist, Hips, L/R Quadricep, L/R Calf (13). Each: label, current value, subheading with up/down arrow + numeric change vs FIRST, canonical style (leader line + dot anchored to a glowing ring). Paired left/right stagger; legible non-overlapping at desktop and mobile; if a breakpoint cannot fit all 13 legibly, collapse to the hero set with one-tap expand-to-all (never overlap or truncate). Every region selectable (feeds Task 10 zoom).

**Files:** modify `MeasurementCallouts.tsx` (13-region layout + collapse), `MeasurementRing.tsx` (ring style), values via Task 2. Region list from `BODY_PARTS` (page.tsx).

- [ ] Values are existing canonical per-region values (UNKNOWN stays honest). Conformance vs PNG callouts. Commit.

### Task 9: Ghost overlay materialize (per IMG_9295)

The FIRST-scan ghost = the parametric mesh from the first scan's stored vector, dim + offset behind the current body, labeled FIRST SCAN + real date. Toggling Show Comparison Overlay materializes it (brightening in as a translucent teal figure); toggling off dissolves it with the same character. Honest-disabled (toggle disabled + short explanation) when no distinct first scan.

**Files:** modify `GhostMesh.tsx` (materialize/dissolve in the r3f loop) and the Time Machine bar toggle in `page.tsx` (`showGhost`/`ghostVector` already wired). Real first-scan date from `composHistory.first.recordedAt`.

- [ ] No fabricated body/date. Conformance vs IMG_9295 + the PNG ghost. Commit.

### Task 10: Region zoom with circled highlight (per IMG_9294)

Selecting any of the 13 regions (tap body, tap callout, or Select Body Part control) zooms and frames that area with a circled highlight (the glowing ring emphasized) and surfaces that region's data (current value, change vs FIRST + arrow, status in the active tab's terms). Exit returns to full-body with the same eased character.

**Files:** modify `FormaVisionCanvas.tsx` (camera push-in framing per region; reuse the existing `framingForRegion`/selectedBodyPart seam), `MeasurementRing.tsx`/a zoom panel for the circled highlight + region data. Selection already flows through `selectedBodyPart`.

- [ ] Camera push-in feel matches IMG_9294. Region data via Task 2, one-source. Commit.

### Task 11: Bidirectional rotation (per IMG_9291) + tab-open motion (per IMG_9297)

Rotation: drag-orbit either direction with inertia; any idle auto-rotation supports both directions incl. a graceful reversal; callout leader lines re-anchor or fade elegantly as a region turns away (never break). Tab-open: switching Body Fat/Muscle Mass/Measurements animates the incoming content in (underline + content move together), via framer-motion.

**Files:** modify `FormaVisionCanvas.tsx` OrbitControls (enable both directions + inertia/auto-rotate reversal; drei `OrbitControls` `enableDamping`), callout re-anchor/fade logic in `MeasurementCallouts.tsx`; tab-open motion in `page.tsx` section switch (framer-motion).

- [ ] Rotation never breaks leader lines. Tab content animates in, not snaps. Reduced-motion parity. Commit.

### Task 12: Copy polish, honesty + a11y sweep, dash audit

**Files:** Time Machine descriptor (Hannah polish, same length/position, Kelsey re-clear); reduced-motion/keyboard/screen-reader parity across all new motion; the 2D floor still serves every number (unchanged).

- [ ] Reduced motion removes motion with full information parity everywhere. Keyboard + SR parity on tabs, units, ghost toggle, region select, Time Machine. Dash audit (`rg -n $'[–—]'` on the diff) clean; Lucide 1.5; no emojis. Suites + 210d guardrails green. Commit.

### Task 13: Conformance proof + final review + deploy

- [ ] Sherlock side-by-side stills: built male vs `Forma_vision_3d_avatar_male.png`, female vs female PNG (layout, mesh, ghost, callouts, cards, tabs, units, Time Machine). Deviation list -> fix or Gary accepts line by line, recorded in `210e-conformance.md`.
- [ ] Motion recordings vs each reference video (intro, sweep, idle, rotation, zoom, ghost, tab). Every value equals canonical in both unit systems; deltas signed; first-scan date real.
- [ ] Final whole-branch review (most capable model): pixels-only confirmed (no calc/pipeline/contract/value touched), one-source rule holds, ladder + 2D floor + reduced-motion + honesty intact, dash/emoji/Lucide clean, no non-token colors beyond the Orange delta decision.
- [ ] Deploy to prod; Gary confirms on his own desktop + phone (non-delegable Definition of Done).

---

## Self-Review

Spec coverage (Rev B): tri-mesh + rim glow (T3), ~15% fit (T4), 4-card row (T5) + card motion & Time-Machine-on-cards (T6), header tabs + Measurements nav + units toggle (T7), 13 callouts w/ mobile collapse (T8), ghost (T9), region zoom + circled highlight (T10), bidirectional rotation + tab-open motion (T11), copy/a11y/reduced-motion/2D-floor (T12), conformance + deploy (T13), units/format pure helpers (T2), asset check-in + conformance scaffold (T1). All Section 2/3 items map to a task.

Boundaries honored: pixels only (no calc/pipeline/contract change), framer-motion DOM-only (already installed, no package.json change), r3f/drei/three/react/next pinned per 210h, one-source rule verified in T13, honest UNKNOWN throughout, delta color Orange per 5.4 until Gary changes it.
