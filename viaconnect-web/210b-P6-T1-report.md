# 210b P6-T1 Report: RegionProtocolPanel (WHOLE-PROTOCOL)

## What was built

Added `RegionProtocolPanel` to the Body Composition page. When a body region is
selected on the avatar (`selectedBodyPart !== null`), an inline panel appears
beneath the FutureSelfPanel showing the user's full current Via Cura protocol.

### New files
- `src/components/formavision/RegionProtocolPanel.tsx` -- the component
- `src/components/formavision/__tests__/RegionProtocolPanel.test.ts` -- 36 TDD tests

### Modified file
- `src/app/(app)/(consumer)/body-tracker/composition/page.tsx` -- import + layer mount

---

## Read path (GET /api/protocol/synthesis)

The client wrapper (`RegionProtocolPanel`) fetches `GET /api/protocol/synthesis` on
mount with an `AbortController` timeout (5 s). The route is already fail-open
(200 `{ synthesis: null }` on any server-side read failure). The fetch maps to
three states:

| Fetch outcome | Panel state |
|---|---|
| In flight | `loading` (skeleton) |
| synthesis non-null | `data` (vitamins + flags from row) |
| synthesis null | `empty` (honest-disabled) |
| !res.ok | `empty` (honest-disabled) |
| thrown / aborted | `empty` (honest-disabled) |

`safeLog.warn` is called on any caught error before setting `empty`.

---

## Honest-disabled state

When `state.kind === 'empty'` (synthesis null OR any fetch failure):
- heading "Your Via Cura Protocol" is shown
- a calm invite to build the protocol is shown
- a CTA link to `/supplements` (existing route, not fabricated) is rendered
- no protocol items, no supplement names, no fabricated protocol
- no region-targeted language

---

## General framing copy

All non-empty states use "Your Via Cura Protocol" as the panel heading. The
subtitle in the data state reads "Your full personalized wellness protocol.
Consistent with your goals across all areas." No region-targeting language of
any form ("for your waist", "targets your chest", etc.) appears in any state.

---

## How same-content-across-regions is guaranteed

The pure content component `RegionProtocolPanelContent` has NO `selectedBodyPart`
prop at the TypeScript interface level. The component signature is:

```ts
export interface RegionProtocolPanelContentProps {
  state: RegionProtocolFetchState;
  reducedMotion?: boolean;
}
```

`selectedBodyPart` is used ONLY in `page.tsx` as a visibility gate
(`selectedBodyPart !== null && <RegionProtocolPanel ...>`). The content itself
is completely decoupled from which region is selected. This is verified in tests:
two renders with the same state produce byte-identical HTML regardless of what
`selectedBodyPart` is set to in the page.

---

## Test command and full output

```
npx vitest run src/components/formavision/__tests__/RegionProtocolPanel.test.ts
```

```
 RUN  v4.1.4 C:/Users/garyf/ViaConnect2026/viaconnect-web

 Test Files  1 passed (1)
       Tests  36 passed (36)
    Start at  10:39:30
    Duration  321ms (transform 58ms, setup 0ms, import 180ms, tests 17ms, environment 0ms)
```

36 tests in 6 suites:
1. Data state (synthesis present) -- 14 tests
2. Empty state (synthesis null) -- 7 tests
3. Fetch failure (fail-open to empty) -- 3 tests
4. Same content regardless of body part -- 3 tests
5. Reduced-motion parity -- 5 tests
6. No em/en dashes -- 4 tests (one per state)

---

## Self-review

- Scope: only RegionProtocolPanel.tsx (new), the test file (new), and page.tsx
  wiring. No other files touched.
- em/en dashes: none in component or copy (the test file contains the string
  literals only as assertion targets to verify absence in rendered output, same
  as FutureSelfPanel.test.ts and GeneticsOverlay.test.ts).
- No `any`: the `: any` the grep found is in a JSDoc comment ("Fail-open: any
  non-ok response"). No actual TypeScript `any` types.
- Honesty: no fabricated/region-targeted product, fail-open at every step.
- Tokens only: Teal #2DA5A0 / Navy #1E3054 only. Orange not used (no error
  accent needed; honest-disabled uses teal CTA per existing pattern).
- Responsive + 44px: CTA link has `min-h-[44px]`, panels use `p-4 sm:p-5`.
- Lucide strokeWidth 1.5: all icons (Pill, Info, ArrowRight) use 1.5.
- No unused imports: Loader2 was removed after draft; final file is clean.

---

## Concerns

None. The component is strictly additive (2D floor + avatar untouched), the
synthesis endpoint is read-only and already fail-open, and the
no-region-filtering guarantee is enforced at the type level.

---

## P6-T1 FIX (review: Jeffery + Hannah + Michelangelo)

Two Important review items addressed. No other changes (React key index suffix
left as-is; synthesis route and readSynthesis untouched). page.tsx wiring was
already committed in 8efbfdec and was not re-touched.

### Fix 1 (Hannah copy) - neutral empty-items sub-state string

`src/components/formavision/RegionProtocolPanel.tsx:153-156`
(the `!hasItems` sub-state of the data branch in `RegionProtocolPanelContent`).

The phrase "clinical guidance" implied clinical-grade authority and this
sub-state carries no disclaimer, so it stood unqualified against the panel's own
"not a clinical finding" framing. Changed the second sentence from:

"Recommendations appear once clinical guidance has been applied to your profile."

to EXACTLY:

"Recommendations appear once your wellness profile has been processed."

(The first sentence "Your protocol is being personalized." is unchanged.)

Locked with a new assertion in the data-state suite: the empty-items message
must NOT contain "clinical guidance" and MUST contain
"your wellness profile has been processed".

### Fix 2 (Michelangelo) - extract + test the fail-open fetch seam

The client wrapper's inline fetch (timeout + the three empty-state failure
paths) previously had zero test coverage. Closed it the codebase way (a pure,
node-testable seam, like `computeGeneticsPresence` / ghostBody):

- Added exported type `RegionProtocolResolvedState`
  (= `Exclude<RegionProtocolFetchState, { kind: 'loading' }>`).
- Added exported async function `fetchProtocolPanelState()`
  (`RegionProtocolPanel.tsx`): owns the request, the 5 s AbortController
  timeout, and the response->state mapping. FAIL-OPEN, never rejects:
    - `res ok + { synthesis: row }`  -> `{ kind: 'data', vitamins, flags }`
    - `res ok + { synthesis: null }` -> `{ kind: 'empty' }`
    - `!res.ok` (e.g. 401)           -> `{ kind: 'empty' }`
    - fetch rejects / timeout        -> `{ kind: 'empty' }` (logged via safeLog)
- The wrapper's `useEffect` now just calls the seam and sets the resolved state
  (guarded by a `cancelled` flag against setState-after-unmount).

Added 7 node tests (global.fetch via `vi.stubGlobal`, `vi.spyOn(safeLog,'warn')`,
no jsdom) asserting: fetch rejects -> empty (and never throws / resolves to a
value); res.ok false (401) -> empty; res ok + row -> data with the row arrays;
res ok + row missing arrays -> data with empty arrays; res ok + null -> empty;
and that the request targets `/api/protocol/synthesis` with an `AbortSignal`.

### Test command + full output

```
npx vitest run src/components/formavision/__tests__/RegionProtocolPanel.test.ts
```

```
 RUN  v4.1.4 C:/Users/garyf/ViaConnect2026/viaconnect-web

 Test Files  1 passed (1)
       Tests  44 passed (44)
    Start at  10:54:56
    Duration  345ms (transform 58ms, setup 0ms, import 162ms, tests 19ms, environment 0ms)
```

Test count: 36 -> 44 (+1 Hannah-copy assertion, +7 fetch-seam tests).

Self-review re-run: no em/en dashes, no literal `any` token (the seam uses
`catch (err: unknown)`), "clinical guidance" removed, neutral copy present.
