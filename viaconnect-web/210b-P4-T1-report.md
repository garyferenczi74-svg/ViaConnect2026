# Prompt 210b P4-T1 Report - GeneticsOverlay (Honest-Disabled)

## What Was Built

A `GeneticsOverlay` component implementing the honest-disabled genetics layer on the
Body Composition avatar surface. Two honest states only - no fabricated region bands,
no segment tints, no body-region coloring from genetics data.

## Files Created

- `src/components/formavision/GeneticsOverlay.tsx` - component with pure gate function and renderer
- `src/components/formavision/__tests__/GeneticsOverlay.test.ts` - 25 tests (written first, TDD)

## Files Modified

- `src/app/(app)/(consumer)/body-tracker/composition/page.tsx` - import + mount after JourneyTimeline

## Presence Gate Logic

`computeGeneticsPresence(data: GeneticsVariantsData): 'present' | 'absent'` (exported pure function):

- Iterates `data.variantsByPanel` (from shared `useGeneticsVariants` hook, not a second fetch)
- Returns `'present'` if ANY variant has `is_sample === false`
- Returns `'absent'` for empty data, sample-only data, or any fail-open result (hook already
  returns EMPTY_DATA on error, so the gate always receives a valid payload)

States:
- `isLoading === true` -> `'loading'` placeholder (static parity via `motion-safe:animate-pulse`)
- `'present'` -> body-positive invitation: "Your Genetics, Your Protocol", tendency-not-destiny copy,
  AI-estimate disclaimer (Info icon, mirrors BodyScanResults pattern). NO band, NO tint.
- `'absent'` -> honest CTA: link to `/genetics/upload` ("Get Your GENEX360 Panel"). No fabrication.

## Honesty Handling

- NEVER renders a fabricated region band, segment tint, or body-region coloring
- No medical/diagnostic language: banned terms `diagnosis`, `treatment`, `cure`, `prevent` all absent
- Copy framed as AI-derived tendencies only, not clinical findings
- Fail-open: any hook error -> EMPTY_DATA from hook -> `'absent'` state -> CTA shown, never throws
- No second data fetch: uses the existing shared `useGeneticsVariants` hook exclusively

## Mounting

Mounted in `CompositionPageInner` after the JourneyTimeline scrubber, guarded by
`section !== 'measurements'` (shows on Body Fat and Muscle sections, hidden on Measurements).
Placement is after the Time Machine scrubber, before the Measurements section content.

## Test Command and Full Output

```
npx vitest run src/components/formavision/__tests__/GeneticsOverlay.test.ts
```

```
 RUN  v4.1.4 C:/Users/garyf/ViaConnect2026/viaconnect-web

 Test Files  1 passed (1)
      Tests  25 passed (25)
   Start at  23:39:01
   Duration  382ms (transform 54ms, setup 0ms, import 129ms, tests 9ms, environment 0ms)
```

Test suites:
1. `computeGeneticsPresence: presence gate` - 8 tests covering all gate branches
2. `GeneticsOverlayPanel: loading state` - 2 tests
3. `GeneticsOverlayPanel: present state (invitation)` - 5 tests
4. `GeneticsOverlayPanel: absent state (CTA)` - 4 tests
5. `GeneticsOverlayPanel: honesty - no fabricated region band or tint` - 4 tests (all 3 states + present body-region check)
6. `GeneticsOverlayPanel: medical language compliance` - 2 tests (present + absent)

## Concerns / Carry-Forward

- Copy has been written with body-positive, tendency-not-destiny framing but has NOT had
  formal Hannah/compliance clearance yet. The tone is intentionally minimal and non-diagnostic.
  Reviewer should route the copy strings to Hannah before ship.
- The `GeneticsOverlay` client wrapper uses `useGeneticsVariants` which fetches on mount +
  focus/visibilitychange. No additional network load beyond what already exists on pages
  that use that hook (the genetics hub already calls it). The composition page does NOT
  currently import that hook elsewhere, so this is the first call on this surface.
- Visual placement (exact px alignment near the avatar) is a Gary localhost eyeball item per brief.
- The barrel (`src/components/formavision/index.ts`) was NOT updated because `GeneticsOverlay`
  is imported directly in page.tsx (matching the pattern used for `JourneyTimeline`,
  `BodyFatReadout`, `NotableChanges`). Add to barrel only if other surfaces need it.

## P4-T1 FIX (review findings)

Review (Jeffery + Hannah + Michelangelo) returned FIX with three Important findings, all in
`src/components/formavision/GeneticsOverlay.tsx`. Applied exactly these three, surgical:

1. Hannah (honest-disabled contract) - present-state body line at `GeneticsOverlay.tsx:75-78`.
   The old "informs your personalized wellness protocol..." asserted active SNP-to-protocol
   delivery. Replaced with: "Your genetic profile is on file and will help personalize your
   wellness protocol as new insights become available. Tendency, not destiny."

2. Hannah - present-state disclaimer at `GeneticsOverlay.tsx:83-86`. Replaced the
   "Genetic context reflects AI-derived tendencies..." line with: "Genetic insights, when
   available, reflect AI-derived tendency estimates. For informational context only. Not a
   clinical finding."

3. Michelangelo - CTA at `GeneticsOverlay.tsx:26` (import) and `GeneticsOverlay.tsx:106-113`.
   The raw `<a href="/genetics/upload">` forced a full-page hard reload and dropped React
   state in the App Router. Added `import Link from 'next/link'` and swapped the anchor for
   `<Link href="/genetics/upload" ...>` with all classNames/children unchanged.

No other changes. No em/en dashes, no emojis. Lucide strokeWidth 1.5 and tokens preserved.

Test file: no change needed. The existing assertions check lowercased substrings
(`tendency`, `not destiny`, `estimate`, `panel`) which all survive the new copy.

Test command and full output:

```
npx vitest run src/components/formavision/__tests__/GeneticsOverlay.test.ts
```

```
 RUN  v4.1.4 C:/Users/garyf/ViaConnect2026/viaconnect-web

 Test Files  1 passed (1)
      Tests  25 passed (25)
   Start at  00:01:16
   Duration  366ms (transform 49ms, setup 0ms, import 190ms, tests 11ms, environment 0ms)
```
