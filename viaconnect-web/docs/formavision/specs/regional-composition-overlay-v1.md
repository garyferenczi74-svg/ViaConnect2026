# Regional Composition Overlay (v1)

ViaConnect Prompt #169e(a) Phase 1 deliverable (sex-only banding). This document
describes the regional composition overlay AS IMPLEMENTED, grounded in the
shipped code, not the idealized spec. Where the spec and the shipped reality
differ, the shipped reality governs and the difference is called out.

Branch: feat/prompt-169e-phase1. Date: 2026-05-31.

## Naming and path reality (read first)

169e(a) Section 9 listed paths under `src/modules/body-tracker/formavision/...`
and referred to `body_scans.smpl_params`. None of those exist in this codebase.
There is NO FormaVision module and there are NO SMPL / SMPL-X parameters. The
avatar is a CUSTOM primitive-parametric react-three-fiber mannequin. The overlay
was therefore built under the existing Body Scan paths:

- Ratios: `src/lib/body-tracker/regional-distribution-ratios.ts`
- Pure service: `src/lib/body-tracker/regional-fat-distribution.ts`
- Client persistence: `src/lib/body-tracker/regional-overlay-prefs.ts`
- Hook: `src/hooks/body-tracker/useRegionalOverlay.ts`
- Mount wrapper: `src/components/body-tracker/scanning/RegionalAvatarSection.tsx`
- Disclaimer: `src/components/body-tracker/scanning/RegionalDisclaimer.tsx`
- Tooltip: `src/components/body-tracker/scanning/RegionalOverlayTooltip.tsx`
- Pattern picker: `src/components/body-tracker/scanning/DistributionPatternPicker.tsx`
- Settings: `src/components/body-tracker/scanning/RegionalOverlaySettings.tsx`
- Avatar seam: `src/lib/arnold/scanning/avatarMeshGenerator.ts` (`segmentColor`),
  `src/components/body-tracker/scanning/AvatarThreeScene.tsx`,
  `src/components/body-tracker/scanning/AvatarViewer.tsx`
- Visible mount: `src/components/body-tracker/scanning/ScanResultsPanel.tsx`
  (Measurements tab, consumer Body Scan results).

## 1. What the overlay does

When the user turns it on, the overlay shades the existing 3D avatar by ESTIMATED
regional fat distribution instead of a single uniform whole-body tint. It is an
ADDITIVE layer on the existing per-segment heatmap seam: when off (the default),
the avatar renders exactly as before, and the Phase 2 SMPL-X avatar can later
supply true per-region values through the same seam without unwinding this work.

Pipeline (`computeRegionalOverlay` in `regional-fat-distribution.ts`):

1. Resolve the distribution PATTERN (male / female / averaged) from the user's
   biological sex or an explicit choice.
2. Sum per-REGION VOLUME from the avatar's own primitive segments.
3. Apportion the whole-body `fat_mass_kg` across the four regions by the
   sex-banded ratio set, giving per-region estimated fat mass.
4. Divide per-region fat mass by per-region volume to get adiposity DENSITY.
5. Color each region by interpolating Teal -> Orange against the USER'S OWN
   min/max region density.

## 2. Region volume comes from the primitive avatar segments (NOT SMPL)

There are no SMPL params. Region volume is derived analytically from the SAME
`AvatarSegmentSpec` primitives the viewer renders. Each segment is either an
ellipsoid (scaled sphere: head, torso, hands, feet, joints) or a cylinder (neck,
upper arm, forearm, thigh, calf), sized from the user's measurements.

- Ellipsoid volume: `(4/3) * pi * rx * ry * rz`.
- Cylinder volume: `pi * rAvg^2 * height`, where `height = halfLength * 2`. This
  mirrors `AvatarThreeScene` exactly, which feeds `CylinderGeometry` a height of
  `rz * 2` (the segment's third radius is a half-length), so the volume used here
  matches the mesh the user sees on screen.

Segment-to-region map (Section 4.4), identical in the pure service
(`regionForKind`) and the render seam (`regionForSegment`):

- `torso`, `joint` -> trunk
- `head`, `neck` -> head_neck
- `upper_arm`, `forearm`, `hand` -> arms
- `thigh`, `calf`, `foot` -> legs

This is an honest model: it apportions a single measured-ish whole-body fat mass
by demographic-typical SHARES and divides by a GEOMETRIC volume estimate. It is
not measured regional fat. The disclaimer (Section 5 below) makes that explicit.

## 3. Sex-banded ratios and cited references (Section 4.4 / 3.1)

The locked constants in `regional-distribution-ratios.ts`:

| Pattern  | trunk | arms  | legs  | head_neck | sum   |
|----------|-------|-------|-------|-----------|-------|
| male     | 0.525 | 0.160 | 0.225 | 0.090     | 1.000 |
| female   | 0.400 | 0.140 | 0.350 | 0.090     | 0.980 |
| averaged | 0.463 | 0.150 | 0.288 | 0.090     | 0.991 |

`averaged` is the per-region arithmetic mean of male and female (the spec's
sex-neutral recommended default). Each set sums to ~1.00. The numbers encode the
established sex difference: male trunk-dominant (android), female lower-body
dominant (gynoid).

References cited in the ratios file header:

1. Karastergiou K, Smith SR, Greenberg AS, Fried SK. Sex differences in human
   adipose tissues, the biology of pear shape. Biology of Sex Differences.
   2012;3:13.
2. Borga M, West J, Bell JD, et al. Advanced body composition assessment, from
   body mass index to body composition profiling. Journal of Investigative
   Medicine. 2018;66(5):1-9.
3. Schorr M, Dichtel LE, Gerweck AV, et al. Sex differences in body composition
   and association with cardiometabolic risk. Biology of Sex Differences.
   2018;9:28.

The percentages are a transparent, auditable consolidation chosen to reproduce
the sex difference and sum to 1.00 per sex; they live in one constant table so
they are easy to retune. They are not a verbatim quote of any single figure.

## 4. Color interpolation (user-own range)

`lerpTealToOrange(t)` interpolates Teal `#2DA5A0` (t=0, lowest density) to Orange
`#B75E18` (t=1, highest density) in HSL space (short-arc hue, linear S and L).
`normalizeToOwnRange(value, min, max)` maps a region's density to t in [0,1]
against the user's OWN observed min and max region density, so even a low overall
body fat user gets meaningful internal contrast. Degenerate range safety: when
`max <= min` (all regions equal, a single region, or zeroed volumes), every region
maps to the MIDPOINT color rather than slamming all to one anchor, reading as "no
meaningful regional difference detected". The lowest-density region is therefore
Teal, the highest Orange, and the middle regions blend.

## 5. Disclaimer copy (Section 4.3)

The LOCKED primary disclaimer is rendered verbatim (secondary text style, below /
adjacent to the avatar, with a "Learn more" expander):

> Regional distribution shown is an estimate from peer-reviewed sex-banded
> patterns, not a direct measurement. Direct per-segment composition comes with
> FormaVision Pro in a future release.

The "Learn more" expander renders the LOCKED Section 4.3 expanded copy verbatim
in `RegionalDisclaimer` (`REGIONAL_DISCLAIMER_EXPANDED`):

> FormaVision uses your whole-body composition along with sex-typical regional
> fat distribution patterns published in peer-reviewed research (Karastergiou et
> al. 2012, Borga et al. 2018, Schorr et al. 2018) to visualize how your body fat
> is likely distributed across regions. This is an estimate based on patterns
> observed in research populations, not a direct measurement of your body. Direct
> per-segment measurement requires depth-enhanced scanning combined with clinical
> validation, which is the focus of FormaVision Pro in a future release.

Both the primary locked sentence and this expanded block are now byte-for-byte
the canonical Section 4.3 text.

## 6. Persistence decision (Section 7): localStorage, no migration

169e(a) Section 7 said to use "the existing user preferences table" with NO
migration. The real per-user preference store in this codebase is typed COLUMNS on
`profiles` (e.g. `numbers_optional`, `cycle_phase_annotation_opt_in`). Adding two
new keys there would require a schema migration, which is forbidden for this work.
There is no flexible/jsonb preferences row or generic settings table to reuse (a
search found only typed `profiles` columns and the dedicated
`body_tracker_user_state` row, neither of which can take new keys without a
migration).

Therefore the two purely-visual, non-clinical preferences (the overlay on/off
toggle and the distribution-pattern choice, plus an opt-in-despite-suppression
flag) are persisted CLIENT-SIDE in `localStorage`, keyed by user id, via
`regional-overlay-prefs.ts`. These are cosmetic view state, not health data;
losing them on a new device simply reverts to the safe defaults (overlay off until
toggled; pattern derived from sex). NO migration was added.

## 7. Edge cases (Section 5)

The suppression decision is the pure `decideOverlaySuppression`, composed in
`RegionalAvatarSection`. Precedence, most protective first.

- 5.1 non-binary / intersex / prefer-not-to-say sex: on first overlay view, when
  the resolved sex source is ambiguous (`useUserBiologicalSex` source
  `caq_other`) and no pattern was chosen, the `DistributionPatternPicker` is
  offered (Male / Female / Averaged recommended / Skip). The choice is stored in
  the client pref and is never shown to practitioners. BUILT.
- 5.2 transgender on hormone therapy: a settings entry (in
  `RegionalOverlaySettings`) with the Section 5.2 note and the same pattern
  options. BUILT.
- 5.3 pregnancy / postpartum: the overlay is suppressed by default during a
  pregnancy window (pregnancy or <= 6 months postpartum) with an opt-in. The
  suppression is fully implemented (`isPregnancyWindow` -> `decideOverlaySuppression`
  -> opt-in path). HOWEVER, the codebase has NO user pregnancy/postpartum signal
  today (the cycle-phase opt-in is annotation-only, not pregnancy). The mount
  passes `isPregnancyWindow={false}` and this is REPORTED: wire the flag the day a
  pregnancy signal exists. HOOKED AND REPORTED.
- 5.4 body image safeguard: reuses the EXISTING disordered-eating safeguard
  (#169b, `profiles.body_scan_de_response` via `useDisorderedEatingSafeguard`).
  A CURRENT history hides the overlay by default (opt-in via the same settings
  panel); a PAST history shows it by default with a disable option (the normal
  shown state plus the always-available toggle). BUILT.
- 5.5 practitioner view: the practitioner Body Scan surface (`practitioner-scan.ts`)
  does NOT render the 3D avatar; the only avatar-rendering panel
  (`ScanResultsPanel`) is mounted solely in the consumer page
  (`app/(app)/(consumer)/body-tracker/photos/page.tsx`). Per the spec, the overlay
  is NOT forced into a surface that has no avatar. REPORTED, not forced in.
- 5.6 missing / low-confidence whole-body composition: the overlay is suppressed
  for that scan (no reliable `fat_mass_kg`, or a quality score below the
  `LOW_CONFIDENCE_QUALITY_FLOOR`), the avatar renders UNCOLORED, a brief
  non-blaming note is shown, and all other results are unaffected. BUILT.

## 8. UI surfaces

- Toggle "Show regional distribution" in the avatar viewer chrome (Section 6.1),
  also mirrored in settings.
- Region tap tooltip (Section 6.2): region name, estimated fat mass X.X kg,
  estimated share X.X percent, and "Based on sex-typical distribution". The 3D
  canvas does not emit picks in Phase 1, so a region legend acts as the accessible
  tap target. When numbers-optional (#169b) is on, the numeric lines are hidden.
- Settings entries (Section 6.3): toggle, pattern chooser (with the 5.2 note),
  and the opt-in row when a protective suppression is active.

## 9. Tests

Node-environment pure-logic tests (the project's vitest config runs node-env
`.test.ts`; the React layer is thin wrappers over tested pure modules):

- `tests/body-tracker/regional-fat-distribution.test.ts`: ratios sum to ~1 and
  encode the sex difference; segment volume (ellipsoid + cylinder height
  convention); region mapping; per-region fat-mass + density split; user-own-range
  color interpolation (lowest Teal, highest Orange, midpoints blend, degenerate /
  NaN safe); pattern selection (sex -> ratios, averaged, explicit choice);
  suppression decisions (missing composition, pregnancy, current/past safeguard).
- `tests/body-tracker/regional-overlay-prefs.test.ts`: serialization round-trip,
  malformed-input tolerance, per-user isolation, throwing-storage safety.
- `tests/body-tracker/avatar-region-color.test.ts`: the additive `segmentColor`
  seam (solid unchanged, no-map legacy tint, region override, partial-map
  fallback) and that the two duplicated region switches stay in sync.

`npx tsc --noEmit` holds at the pre-existing 151 errors (zero new). `npx vitest
run body-tracker` is fully green.

## 10. Provenance

- Spec: ViaConnect Prompt #169e(a), Sections 3.1, 4.3, 4.4, 5, 6, 7, 9.
- Inspection brief that gated this work: `docs/formavision/avatar-inspection-v1.md`.
- Shipped reality: the files listed in section "Naming and path reality" above.
- Where the spec and the shipped code diverge (no FormaVision module, no SMPL
  params, region volume from primitive segments, localStorage persistence in place
  of a migration, no pregnancy signal yet, practitioner surface has no avatar), the
  shipped reality governs and the divergence is stated above and in the delivery
  report.
