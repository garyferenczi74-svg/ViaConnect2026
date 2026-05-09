# Body Tracker Current State (post-revert) for Prompt #154 Step 2

This document is the diagnosis artifact required by Prompt #154 §4 / GATE-A3.
It describes the post-revert state of the Segmental Body Fat Analysis panel
on the Body Tracker page, captured after commit `62d710b` reverted #153.

## 1. Component path

`src/components/body-tracker/BodyAvatarWithIndicators.tsx`

This is the component the fat tab and the muscle tab BOTH render. Prompt #153
created a parallel `SegmentalBodyFatAnalysis.tsx` which has been removed by the
revert. There is no `SegmentalBodyFatAnalysis` component on the post-revert
branch; the heat map indicators live entirely inside
`BodyAvatarWithIndicators.tsx`.

Mounting site: `src/app/(app)/(consumer)/body-tracker/composition/page.tsx`,
both inside `section === 'fat'` and `section === 'muscle'`.

## 2. Figure assets

Both assets are SVG, hosted on the public Supabase bucket `Body Tracker`:

| Asset  | URL                                                                                          | Intrinsic dimensions | Aspect ratio (w:h) |
|--------|----------------------------------------------------------------------------------------------|----------------------|--------------------|
| Male   | `https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Male%20Avatar.svg` | 720 x 1152          | 0.625 (5:8)       |
| Female | `https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Female.svg`        | 720 x 1008          | 0.7142 (~5:7)     |

The male SVG embeds a base64 PNG behind feColorMatrix filters. Re-authoring
either asset is forbidden by the standing rules.

## 3. Container layout

Set on the `BodyAvatarWithIndicators` root div:

```tsx
className="relative mx-auto flex w-full max-w-[200px] items-center
           justify-center md:max-w-[240px] lg:h-full lg:w-auto lg:max-w-none"
```

Behavior by breakpoint:

- mobile: `w-full max-w-[200px]`, container width tracks img width
- tablet (md): `w-full max-w-[240px]`, container width tracks img width
- desktop (lg): `lg:h-full lg:w-auto lg:max-w-none`, container width auto so it
  hugs the avatar img's intrinsic width (no horizontal gutters around the img)

There is NO aspect-ratio class on this container. The container's height is
content-driven by the img on mobile/tablet and parent-driven (`lg:h-full`) on
desktop. `lg:w-auto` is what keeps percentage-positioned pills aligned with the
avatar img on desktop.

## 4. Existing pill component

There is no separate pill component. Pills are rendered inline in
`BodyAvatarWithIndicators.tsx` as absolutely-positioned `<div>` elements:

```tsx
<div
  data-region={regionId}
  className="pointer-events-none absolute h-5 w-8 rounded-full
             border-2 border-white/30 shadow-lg shadow-black/20 bg-{color}-500"
  style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
/>
```

Positioning is via percentage strings on `top` + `left`, with the pill centered
on the coordinate via `transform: translate(-50%, -50%)`.

Per #154 §5.1: this approach is preserved as-is. No SVG overlay refactor.

## 5. Existing positioning method

Absolute-positioned divs over the `<img>`, percentage-based `top` / `left`,
center-anchor via `transform: translate(-50%, -50%)`. Pills are rendered
inside the same container as the img so the percentages reference the img's
rendered bounding box (matched by the `lg:w-auto` desktop container).

## 6. Authoritative segment ID list

The data layer's BODY_PARTS keys (snake_case, defined in
`composition/page.tsx`):

- `neck`
- `shoulders`
- `chest`
- `waist`
- `l_bicep`
- `r_bicep`
- `l_forearm`
- `r_forearm`
- `l_quad`
- `r_quad`
- `l_calf`
- `r_calf`

That is 12 IDs. The data layer does NOT carry `head`, `face`, or `abdomen` as
distinct keys; #153's introduction of those was the schema mismatch §1.1.
`waist` is the existing data layer's stand-in for what #153 called `abdomen`.

The `r_` / `l_` prefix is anatomical at the data layer (`r_bicep` reads from
`right_arm_lbs` in the muscle hook, `l_bicep` from `left_arm_lbs`). Display
labels are "R. Bicep" / "L. Bicep" etc., set in `BODY_PARTS[].label`. The
labels are not used as lookup keys anywhere in the rendering layer; only the
snake_case `key` field is.

The new `heatMapPositions.ts` table per §5.2 is keyed by these snake_case
BODY_PARTS keys, NOT by display labels.

## 7. Sex toggle mechanism

Two-button group inside `composition/page.tsx`:

```tsx
<button data-testid="gender-toggle-male"   onClick={... setGender('male') ...}>Male</button>
<button data-testid="gender-toggle-female" onClick={... setGender('female') ...}>Female</button>
```

The `gender: 'male' | 'female'` state is passed as the `gender` prop to
`BodyAvatarWithIndicators`. The default value comes from the user's CAQ
biological sex via `useUserBiologicalSex`; manual toggle overrides and persists
via `setGenderOverride`.

## 8. Status enum

The avatar oval color comes from `OvalColor` defined in
`src/lib/body-tracker/heatmap-colors.ts`:

```ts
export type OvalColor = 'green' | 'yellow' | 'red';
```

The fat side maps to OvalColor via `getOvalColorFromStatus` (uses each card's
SegmentStatus from `calculations.ts`: Very Low and Low map to green, Standard
maps to yellow, High and Very High map to red). The muscle side maps via
`getOvalColorFromChange` (week-over-week change direction with fat/muscle
inversion).

Per #154 §5.1: the rendering color logic and the OvalColor enum are NOT being
changed in #154. Only the position table is being lifted into a new module.

## 9. Notes on #153 root cause (for the post-mortem record)

The four failures from #154 §1 reconciled against the actual diff in commit
`e6b141a`:

1. **Schema mismatch.** #153 introduced canonical IDs `head`, `face`,
   `left_upper_arm`, `left_thigh`, etc. The adapter `toCanonicalSegmentId`
   was implemented and a `buildFatSegmentStatuses` helper was lifted into
   `segments.ts`, but the helper only routed 11 of the 13 ID slots from data
   (`head` and `face` had no source key and inherited the trunk source via
   `data['neck']` as a fan-out). Confirms the diagnosis: at most 11 pills
   could carry real data; the actual visual outcome of "only 2 pills" likely
   came from the aspect-ratio coercion below shifting most pills off-screen,
   not from data loss alone.

2. **Aspect ratio coercion.** Confirmed. #153 used `aspect-[1/2]` on the
   wrapper plus `viewBox="0 0 400 800"` on the SVG plus
   `preserveAspectRatio="none"` on the avatar image. The wrapper locked at
   1:2, but the avatar's natural aspects (0.625, 0.71) are wider than 1:2
   (0.5). Stretching the avatar inside the 1:2 container compressed the
   figure horizontally by 20% (male) and 30% (female), producing the skinny
   elongated appearance.

3. **Coordinate origin.** Confirmed. Pill y values (`head: y=48`,
   `face: y=96`, etc.) were authored against a 400x800 reference grid that
   assumed the avatar fills 0-800 vertically. With the stretched image
   filling the viewBox, the head should have rendered at y=48; that
   interaction with the wrapper's `aspect-[1/2]` plus `xMidYMid meet` on the
   outer SVG, the avatar's relative "top of head" landed lower than 48 in
   viewBox space, putting the head pill above the actual head pixels.

4. **Soft audit gate.** Confirmed. The Jeffery + Michelangelo + Arnold gate
   on commit `e6b141a` checked "renders without crashing" but did not
   require pre-merge visual verification at all four breakpoints with an
   explicit pill-count check. #154 §6 hard gates correct this with explicit
   counted assertions and screenshot-based sign-off.
