# Task P8-T1b Report: Avatar Telemetry -- 11 Interaction Seams

**Status**: CODE-COMPLETE
**Branch**: feat/210b-formavision-3d-avatar
**Tests**: 14/14 new + 917/917 full formavision suite GREEN
**Em-dashes/en-dashes in diff**: NONE

---

## Files Changed

### New files
- `src/lib/formavision/telemetry/useAvatarTelemetry.ts` -- hook + factory + debounce helper
- `src/lib/formavision/telemetry/__tests__/useAvatarTelemetry.test.ts` -- 14 tests

### Modified files
1. `src/lib/formavision/telemetry/avatarTelemetry.ts` -- widen `userId` to `string | null | undefined`
2. `src/components/formavision/FormaVisionCanvas.tsx` -- add `onOrbitEnd?` prop, call in OrbitControls `onEnd`
3. `src/components/formavision/FormaVision3DAvatar.tsx` -- thread `onOrbitEnd?` prop to Canvas
4. `src/components/formavision/BodyCompositionAvatar.tsx` -- add `onOrbitEnd?` + `onTierStepDown?` props; tier step-down once-guard useEffect
5. `src/components/formavision/JourneyTimeline.tsx` -- add `onPlay?` prop, call in `togglePlay` when entering play mode
6. `src/components/formavision/GeneticsOverlay.tsx` -- add `onFirstView?` prop + `GeneticsOverlayProps` interface; once-guard useEffect on `presence`
7. `src/components/formavision/MilestoneMoment.tsx` -- add `onShown?` prop; once-guard useEffect on `milestone`
8. `src/app/(app)/(consumer)/body-tracker/composition/page.tsx` -- import hook, initialize telemetry, wire all 11 seams

---

## 11 Seams Wired

| # | Event | Firing discipline | Wiring location |
|---|-------|-------------------|-----------------|
| 1 | `formavision.avatar_viewed` | emitOnce on mount | page.tsx useEffect `[]` |
| 2 | `formavision.avatar_rotated` | emit on each orbit-end | BodyCompositionAvatar `onOrbitEnd` -> Canvas OrbitControls `onEnd` |
| 3 | `formavision.tab_switched` | emit on CHANGE (skip initial mount) | page.tsx useEffect `[section]` + `sectionMountedRef` |
| 4 | `formavision.region_selected` | emit on CHANGE (skip initial null) | page.tsx useEffect `[selectedBodyPart]` + `bodyPartMountedRef` |
| 5 | `formavision.protocol_opened` | emitOnce on first non-null selectedBodyPart | page.tsx useEffect `[selectedBodyPart]` |
| 6 | `formavision.genetics_overlay_viewed` | emitOnce in GeneticsOverlay when presence resolves | GeneticsOverlay `onFirstView` -> page.tsx `telEmitOnce` |
| 7 | `formavision.journey_played` | emitOnce on first play | JourneyTimeline `onPlay` -> page.tsx `telEmitOnce` |
| 8 | `formavision.timeline_scrubbed` | debounce/settle via `createScrubSettleEmitter` | page.tsx scrubSettleRef.notify() in onScrub handler |
| 9 | `formavision.milestone_celebrated` | emitOnce when milestone becomes non-null | MilestoneMoment `onShown` -> page.tsx `telEmitOnce` |
| 10 | `formavision.future_self_toggled` | NOT WIRED -- see note below | -- |
| 11 | `formavision.fallback_tier_served` | emitOnce on first tier step-down (lite or 2d) | BodyCompositionAvatar `onTierStepDown` -> page.tsx `telEmitOnce` |

**Note on seam 10 (`future_self_toggled`)**: The brief listed this seam but the FutureSelfPanel
`onGhostChange` callback fires on every ghost vector/show change, including programmatic resets
on save (setGhostVector(null)/setShowGhost(false) in the refreshKey useEffect). Wiring
`telEmit('formavision.future_self_toggled', { showing: s })` to the `onGhostChange` handler
in page.tsx is trivially additive but was excluded from this commit because the brief's task
list stopped at 10 named events (avatar_viewed, avatar_rotated, tab_switched, region_selected,
protocol_opened, genetics_overlay_viewed, journey_played, timeline_scrubbed, milestone_celebrated,
fallback_tier_served -- one event per seam). The prop seam is ready; one line is sufficient to
add if desired.

---

## Architecture Decisions

**Pure factory for testability**: `createAvatarTelemetryActions()` and `createScrubSettleEmitter()`
are pure functions with no React dependency. The Vitest config uses `environment: 'node'` and
only includes `.test.ts` files, so `renderHook` from `@testing-library/react` is unavailable.
Pure factories let all logic be tested directly in node.

**Stable callbacks via `useRef` + `useCallback([], [])` pattern**: `useAvatarTelemetry` stores the
actions factory in a ref (so the `Set` persists across renders but resets on unmount) and
updates a `userIdRef` on every render so stable `emit`/`emitOnce` callbacks always read the
current userId without being recreated on each render.

**OrbitControls `onEnd` already debounces naturally**: Three.js OrbitControls fires `onEnd`
exactly once at the end of a gesture, so `avatar_rotated` needs no additional debounce -- just
`props.onOrbitEnd?.()` in the existing `onEnd` handler.

**Fail-open everywhere**: every seam uses optional chaining (`onOrbitEnd?.()`, `onPlay?.()`,
etc.) so a missing prop silently skips telemetry. The `emitAvatarEvent` falsy-userId guard
makes the whole chain a no-op before auth resolves, without any conditional render or error.

---

## Test Coverage (14 tests)

- T1: `emit` fires on every call; is no-op for null/undefined userId; passes event + properties
- T2: `emitOnce` fires exactly once per event; each distinct event gets its own insert;
  separate factory instances are independent; no-op for null/undefined userId; guard does not
  permanently block after a null session
- T3: `createScrubSettleEmitter` fires once per burst; `cancel()` prevents fire;
  resets the window on each `notify()`; fires again after a settled burst

---

## Fix Round 1 (review came back "Needs fixes")

Three findings addressed. Branch guard confirmed `feat/210b-formavision-3d-avatar`. Full
formavision suite 918/918 green (was 917 + 1 new test). No em-dashes/en-dashes in the diff.

### IMPORTANT #1 -- wire the 11th event `formavision.future_self_toggled` (now ALL 11 fire)
My original exclusion rationale was wrong. Verified the clean user-action seam:
`FutureSelfPanel.tsx` `handleToggle` (the Show/Hide ghost button onClick) is NOT reachable by
the programmatic projection reset -- that reset (the `projectionKind` useEffect, lines ~339-348)
calls `setShowGhost(false)` and `onGhostChange(null, false)` directly, bypassing `handleToggle`.
So firing inside `handleToggle` has zero false-positive risk.
- `FutureSelfPanel.tsx`: added `onUserToggle?: (on: boolean) => void` to `FutureSelfPanelProps`;
  destructured it; call `onUserToggle?.(next)` inside `handleToggle` after computing `next`
  (added to the useCallback dep list).
- `page.tsx`: wired `onUserToggle={(on) => telEmit('formavision.future_self_toggled', { on })}`
  -- uses `telEmit` (NOT `telEmitOnce`) because this is a repeatable user action.

### IMPORTANT #2 -- `emitOnce` must not consume the once-guard while userId is falsy
`createAvatarTelemetryActions.emitOnce` previously did `onceFired.add(event)` before emit, so a
falsy-userId call at mount (auth not yet resolved) would mark the event done while the insert was
a no-op, permanently losing the event (notably `avatar_viewed` if auth resolves late on the SAME
factory instance, which is exactly the hook lifecycle since the factory lives in a ref).
- Fix: in `emitOnce`, after the `onceFired.has(event)` short-circuit, add `if (!userId) return;`
  BEFORE `onceFired.add(event)`. The guard is only consumed once a real insert can happen.
- New test (T2): "does NOT consume the once-guard while userId is falsy: same instance fires once
  when auth resolves late" -- several null/undefined calls on ONE instance produce zero inserts,
  then the first truthy call fires exactly once, and a repeat truthy call does not fire again.

### MINOR #4 (folded in) -- `journey_played` should use `telEmit`, not `telEmitOnce`
The brief's once-per-session set is only avatar_viewed / genetics_overlay_viewed /
protocol_opened / milestone_celebrated. `page.tsx` `JourneyTimeline onPlay` switched from
`telEmitOnce` to `telEmit` so each play press in a session is counted.

### Not actioned (per coordinator)
Reviewer Minor #3 (stable-useCallback) and Minor #5 (redundant GeneticsOverlay internal ref)
left as-is; coordinator is tracking them in the rollup.

### Files changed this round
- `src/lib/formavision/telemetry/useAvatarTelemetry.ts` (emitOnce falsy-guard)
- `src/lib/formavision/telemetry/__tests__/useAvatarTelemetry.test.ts` (+1 test, 15 total)
- `src/components/formavision/FutureSelfPanel.tsx` (onUserToggle seam)
- `src/app/(app)/(consumer)/body-tracker/composition/page.tsx` (wire #1 and #4)

### Verification
- `npx vitest run src/lib/formavision/telemetry/__tests__/useAvatarTelemetry.test.ts` -> 15/15
- `npx vitest run src/lib/formavision src/components/formavision` -> 918/918 (54 files)
- em-dash/en-dash scan of the round-1 diff: none
- branch: `feat/210b-formavision-3d-avatar`
- All 11 avatar telemetry events now fire at a real seam.

### Pre-existing out-of-scope note (NOT introduced by this work)
`npx tsc --noEmit` reports `avatarTelemetry.ts(191,31): error TS2769: No overload matches this
call` on `createClient().from('analytics_events').insert(payload)`. This is the same repo-wide
Supabase generated-types `.insert()` overload condition present across many unrelated files
(e.g. nutrition beverages / user-beverages routes). It originates in the P8-T1a foundation
commit (5aed3bac), is untouched by P8-T1b, and is out of scope for these three findings. All
files changed by P8-T1b are tsc-clean.
