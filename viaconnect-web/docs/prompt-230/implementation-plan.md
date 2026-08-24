# Wearables Connections Three-Column Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/body-tracker/connections` surface into the three-column, selectable-source layout with real vendor logos, a 7-MetricKey contributor column, six source tiles, and the upload/honesty fixes — without regressing the shipped honesty invariants.

**Architecture:** The surface is a single client component (`ConnectionsSurface`) that fetches `GET /api/integrations/wearable-tiles` and renders child components. This plan adds card-selection state and a persistent center detail panel (promoting the Apple/Hume import from a modal into an inline flow via an extracted hook), splits the merged `ScoreDetailPanel` into a BOS block plus a contributor column, adds Google Health + Garmin as honest "Coming soon" device tiles, migrates inline hex to Tailwind tokens, and wraps each column in a `219i` error boundary.

**Tech Stack:** Next.js App Router (client components), React 18, TypeScript strict, Tailwind (NativeWind-style tokens), Vitest 4 (node env, `renderToStaticMarkup` + source-string tests), lucide-react, react-hot-toast.

**Spec:** `viaconnect-web/docs/prompt-230/design.md` (and `phase-0-audit.md`). The plan argues from the spec; read both.

## Global Constraints

Every task's requirements implicitly include this section.

- **Test runner:** `npx vitest run <path>` from `viaconnect-web/`. There is **NO `test` or `typecheck` npm script** and **`package.json`/`package-lock` are LOCKED (CLAUDE.md Permanent Protection #2)** — never add a script or dependency. Type-check ad hoc with `npx tsc --noEmit` if needed.
- **Test env is `node`** (no jsdom, no @testing-library render). Component tests use `renderToStaticMarkup(createElement(Comp, props))` from `react-dom/server` and/or `readFileSync` source-string assertions. Mock client deps at top of file: `vi.mock('react-hot-toast', ...)`, `vi.mock('@/lib/supabase/client', ...)` (and `next/link`, `next/navigation` if the tree uses them).
- **Prefer `.test.ts`** (auto-discovered by `src/**/__tests__/**/*.test.ts`). A new `.test.tsx` is NOT globbed — it must be added by exact path to the `include` array in `vitest.config.ts`. Use `createElement`, not JSX, so tests stay `.test.ts`.
- **Two distinct surfaces — do not conflate.** `/body-tracker/connections` = wearable **device tiles** (`src/lib/body-tracker/wearable-tiles.ts`, `FIRST_CLASS_TILE_IDS`/`FORBIDDEN_FIRST_CLASS_TILE_IDS`, `TileStatus`). `/plugins` = **app cards** (`pluginAppRegistry.ts` + `connectionState.ts`, `ConnectionCardState`).
- **Honesty invariants (keep green):** `UNKNOWN` never rendered as 0/placeholder; disconnected tiles keep `lastSyncAt: null`; `statusLabel` never contains "Active"; JSON never contains a fabricated relative like "5 min ago"; `Coming soon` is a display overlay (`oauthDisplayLabel`), never a 5th `LastSyncKind`; no fake "Manage" cross-link for Google.
- **House style:** NO em-dashes or en-dashes anywhere; no emojis; no `as any`; every interactive target responsive with a 44px touch size; Lucide at `strokeWidth={1.5}` (vendor logos are the only exception).
- **Forbidden strings on the surface (asserted by tests):** `#224852`, `#4ADE80`, `font-serif`, `Apple Watch`, `Connected Watch`, `/Vitality|Stability|Symmetry|Helix/`, `/Arnold|Thanos/`, a `truncate` className. Keep required strings: `whitespace-normal break-words`, `{tile.statusLabel}`, `CONNECTIONS_LEAD`, `CONNECTIONS_FOOTER`, `Missing stays UNKNOWN, never 0.`, `data-apple-dropzone`.
- **Brand marks (D2) are Lex-gated (G78, blocking).** Ship representative local placeholder assets behind a `pending-lex` flag with a Lucide fallback; production ship is blocked until Lex clears each official asset. New copy goes through Marshall (and Hannah for assistant-facing copy).
- **Commit** after each task with a descriptive message; end with the repo's Co-Authored-By trailer.

---

### Task 1: Add Google Health + Garmin as honest "Coming soon" device tiles

Deliberately supersedes the test-locked 4-tile lock. Google Health and Garmin become `oauth` tiles that are unconfigured by default, so the existing `oauthDisplayLabel` machinery renders them "Coming soon" with no action button. They are NOT connectable (no `*Configured` flag is ever set true here); the Garmin connector is out of scope (spec §12).

**Files:**
- Modify: `src/lib/body-tracker/wearable-tiles.ts` (`FIRST_CLASS_TILE_IDS` L21, `FORBIDDEN_FIRST_CLASS_TILE_IDS` L37-46, `WEARABLE_TILE_SPECS` L61-94, `WearableTileInput` L117-130, `buildWearableTiles` branch L189-265)
- Modify: `src/lib/body-tracker/wearable-snapshot.ts` (the `buildWearableTiles(...)` call inside `assembleWearableSnapshot` — pass `googleHealthConfigured: false, garminConfigured: false`)
- Modify tests: `src/components/body-tracker/connections/__tests__/connections-ia.test.ts` (L118-122), `brief-25-honesty.test.ts` (L90), `brief-26-wearable-lock.test.ts` (L63-66)
- Test: `src/lib/body-tracker/__tests__/wearable-tiles.test.ts` (add cases)

**Interfaces:**
- Produces: `FIRST_CLASS_TILE_IDS = ['whoop','hume','apple_health','oura','google_health','garmin']`; `WearableTileInput` gains `googleHealthConfigured: boolean; garminConfigured: boolean`. Consumers (`emptyTiles`, `assembleWearableSnapshot`) must pass both (default `false`).

- [ ] **Step 1: Write the failing test** — add to `wearable-tiles.test.ts`:

```ts
it('renders Google Health and Garmin as non-interactive Coming soon tiles', () => {
  const tiles = buildWearableTiles(baseInput());
  expect(tiles.map((t) => t.id)).toEqual(['whoop', 'hume', 'apple_health', 'oura', 'google_health', 'garmin']);
  const google = tiles.find((t) => t.id === 'google_health');
  const garmin = tiles.find((t) => t.id === 'garmin');
  expect(google?.statusLabel).toBe('Coming soon');
  expect(garmin?.statusLabel).toBe('Coming soon');
  expect(google?.action).toEqual({ kind: 'oauth', configured: false });
  expect(garmin?.action).toEqual({ kind: 'oauth', configured: false });
  expect(google?.status).toBe('disconnected');
});
it('keeps google_health and garmin out of the FORBIDDEN device-tile set now that they are Coming soon tiles', () => {
  expect(FORBIDDEN_FIRST_CLASS_TILE_IDS).not.toContain('google_health');
  expect(FORBIDDEN_FIRST_CLASS_TILE_IDS).not.toContain('garmin');
  expect(FORBIDDEN_FIRST_CLASS_TILE_IDS).toContain('apple_watch');
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/body-tracker/__tests__/wearable-tiles.test.ts -t "Coming soon tiles"` → FAIL (only 4 ids; `google_health` in FORBIDDEN).

- [ ] **Step 3: Edit `wearable-tiles.ts`.**
  - `FIRST_CLASS_TILE_IDS` → `['whoop', 'hume', 'apple_health', 'oura', 'google_health', 'garmin'] as const;`
  - Remove `'google_health'` and `'garmin'` from `FORBIDDEN_FIRST_CLASS_TILE_IDS` (keep `'fitbit'`, `'google_health_connect'`, `'apple_watch'`, `'watch'`, `'phone_health'`, `'manual_entry'`).
  - Append two `WEARABLE_TILE_SPECS` entries:

```ts
  {
    id: 'google_health',
    name: 'Google Health',
    icon: 'HeartPulse',
    advertisedDimensions: ['sleep', 'recovery'],
    action: 'oauth',
    notes: 'Android aggregator for Fitbit and Pixel. Coming soon.',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: 'Watch',
    advertisedDimensions: ['recovery', 'sleep', 'strain'],
    action: 'oauth',
    notes: 'Recovery, sleep, and workouts. Coming soon.',
  },
```
  - Add to `WearableTileInput`: `googleHealthConfigured: boolean;` and `garminConfigured: boolean;`
  - In `buildWearableTiles`, add branches BEFORE the `else` (Apple) fallback:

```ts
    } else if (spec.id === 'google_health') {
      action = { kind: 'oauth', configured: input.googleHealthConfigured };
    } else if (spec.id === 'garmin') {
      action = { kind: 'oauth', configured: input.garminConfigured };
```
  - Extend the `configured` ternary so these route through `oauthDisplayLabel`:

```ts
    const configured =
      spec.id === 'whoop' ? input.whoopConfigured
      : spec.id === 'oura' ? input.ouraConfigured
      : spec.id === 'google_health' ? input.googleHealthConfigured
      : spec.id === 'garmin' ? input.garminConfigured
      : true;
```
  (Their `linked` stays `false` and `lastSyncAt` stays `null` from the default init, so `resolveLastSyncState` yields `not_connected` and `oauthDisplayLabel` overlays "Coming soon".)

- [ ] **Step 4: Fix the two callers that build `WearableTileInput`.**
  - `wearable-snapshot.ts` `assembleWearableSnapshot`: add `googleHealthConfigured: false, garminConfigured: false,` to its `buildWearableTiles({...})` call.
  - `ConnectionsSurface.tsx` `emptyTiles()` (L47-62): add `googleHealthConfigured: false, garminConfigured: false,`.

- [ ] **Step 5: Update the locked test assertions to the 6-tile set.**
  - `connections-ia.test.ts:118` → `expect(model).toContain("FIRST_CLASS_TILE_IDS = ['whoop', 'hume', 'apple_health', 'oura', 'google_health', 'garmin']")`. Remove the `expect(model).toContain("'garmin'")` FORBIDDEN assertion at L121 (garmin no longer forbidden); keep `'fitbit'` and `'apple_watch'`.
  - `brief-25-honesty.test.ts:90` → `expect(FIRST_CLASS_TILE_IDS).toEqual(['whoop', 'hume', 'apple_health', 'oura', 'google_health', 'garmin']);`. The `expect(tiles).toContain("'google_health'")` at L91 still passes (the string appears in the specs). Keep `expect(surface).not.toMatch(/id: 'google_health'/)` — the surface still has no literal tile object.
  - `brief-26-wearable-lock.test.ts:63-66` → update both `toEqual` arrays to the 6 ids and `['Whoop', 'Hume Body Pod', 'Apple Health', 'Oura', 'Google Health', 'Garmin']`. **Change L66** `expect(tiles.some((t) => /google|watch/i.test(t.name))).toBe(false)` to assert the two new tiles are Coming soon instead: `expect(tiles.find((t) => t.id === 'google_health')?.statusLabel).toBe('Coming soon');`. Also update `expect(surface + tile).not.toContain('google_health')` (brief-26 L76 / connections-ia) — the surface+tile source still must not hardcode `google_health` (it comes from specs in the lib), so this stays true; verify.

- [ ] **Step 6: Run tests to verify they pass** — `npx vitest run src/lib/body-tracker/__tests__/wearable-tiles.test.ts src/components/body-tracker/connections/__tests__` → PASS.

- [ ] **Step 7: Commit** — `feat(230): add Google Health + Garmin as Coming soon device tiles`.

---

### Task 2: Design tokens — add a Card utility, register Instrument Sans, migrate inline hex

**Files:**
- Modify: `tailwind.config.ts` (`colors` L21+, `fontFamily` L99-102)
- Modify: `src/components/body-tracker/connections/WearableTileCard.tsx` (hex at L21,39,46,49,106,124,126)
- Modify: `src/components/body-tracker/connections/ScoreDetailPanel.tsx` (hex at L78,125,137,142,165,188)
- Test: `src/components/body-tracker/connections/__tests__/token-migration.test.ts` (new)

**Interfaces:**
- Produces: Tailwind utilities `bg-card` / `text-card` / `border-card` (`#1E3054`), `font-instrument` via `fontFamily.instrument`. Existing `navy-700`/`teal`/`copper` utilities are reused.

- [ ] **Step 1: Write the failing test** (`token-migration.test.ts`):

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
const root = process.cwd();
const src = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('Prompt 230 token migration', () => {
  it('the connections card + panel carry no connections-palette inline hex', () => {
    const files = [
      src('src/components/body-tracker/connections/WearableTileCard.tsx'),
      src('src/components/body-tracker/connections/ScoreDetailPanel.tsx'),
    ].join('\n');
    for (const hex of ['#2DA5A0', '#B75E18', '#1A2744', '#1E3054']) {
      expect(files).not.toContain(hex);
    }
    expect(files).toContain('bg-card');
    expect(files).toContain('text-teal');
    expect(files).toContain('text-copper');
  });
  it('tailwind config exposes a Card color and Instrument font', () => {
    const cfg = src('tailwind.config.ts');
    expect(cfg).toContain('#1E3054');
    expect(cfg).toContain('instrument');
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/components/body-tracker/connections/__tests__/token-migration.test.ts` → FAIL.

- [ ] **Step 3: Add tokens to `tailwind.config.ts`.** Under `colors`, add `card: "#1E3054",`. Under `fontFamily`, add `instrument: ["Instrument Sans", "Inter", "sans-serif"],`.

- [ ] **Step 4: Migrate `WearableTileCard.tsx` hex → tokens** (static full class strings only — no template literals for the generated classes):
  - `outlineBtn`: `border-[#2DA5A0]`→`border-teal`, `text-[#2DA5A0]`→`text-teal`, `hover:bg-[#2DA5A0]/10`→`hover:bg-teal/10`, `focus-visible:ring-[#2DA5A0]/50`→`focus-visible:ring-teal/50`.
  - `liveDot`: `bg-[#2DA5A0]`→`bg-teal`, `bg-[#B75E18]`→`bg-copper` (keep the `? :` structure so each branch is a full literal).
  - `<article>` `bg-[#1E3054]`→`bg-card`; icon well `bg-[#1A2744]`→`bg-navy-700`; connected-xml link `text-[#2DA5A0]`→`text-teal`; dropzone `bg-[#1A2744]/60`→`bg-navy-700/60`; CloudUpload `text-[#2DA5A0]`→`text-teal`.

- [ ] **Step 5: Migrate `ScoreDetailPanel.tsx` hex → tokens:**
  - section `bg-[#1E3054]`→`bg-card`; per-dim `bg-[#1A2744]/80`→`bg-navy-700/80`; DISAGREE + Manual chips `bg-[#B75E18]/15 text-[#B75E18] ring-[#B75E18]/30`→`bg-copper/15 text-copper ring-copper/30`; Active chip `#2DA5A0`→`teal`; footer `text-[#2DA5A0]`→`text-teal`. Leave `rgba(255,255,255,0.12)` (not a brand hex).

- [ ] **Step 6: Run migration + regression tests** — `npx vitest run src/components/body-tracker/connections/__tests__` → PASS (also confirms `connections-ia`'s `not.toContain('#224852'|'#4ADE80')` still holds and required strings survive).

- [ ] **Step 7: Commit** — `refactor(230): migrate connections inline hex to Tailwind tokens`.

---

### Task 3: Fix the three Apple/Hume XML import bugs

**Files:**
- Create: `src/lib/body-tracker/connected-sources/import-summary.ts` (pure JSON→ImportResult mapper)
- Modify: `src/components/body-tracker/connected-sources/AppleHealthImportModal.tsx` (mapping L208-215, success gate L194-223, fetch L197-201)
- Test: `src/lib/body-tracker/connected-sources/__tests__/import-summary.test.ts` (new) + additions to `brief-25-honesty.test.ts`

**Interfaces:**
- Produces: `export interface ImportSummary { recordsSeen, recordsIngested, recordsDeduped, recordsAttributedHume: number; dateRangeStart, dateRangeEnd: string | null }` and `export function parseImportSummary(json: unknown): ImportSummary` and `export function isImportComplete(json: unknown): boolean`.

- [ ] **Step 1: Write the failing test** (`import-summary.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { parseImportSummary, isImportComplete } from '../import-summary';

const serverSuccess = {
  status: 'complete', records_seen: 200, records_ingested: 142,
  records_deduped: 12, records_attributed_hume: 4,
  date_range_start: '2026-01-01', date_range_end: '2026-08-01',
};

describe('parseImportSummary', () => {
  it('reads the server snake_case count keys (not 0)', () => {
    const s = parseImportSummary(serverSuccess);
    expect(s.recordsIngested).toBe(142);
    expect(s.recordsDeduped).toBe(12);
    expect(s.recordsAttributedHume).toBe(4);
    expect(s.recordsSeen).toBe(200);
    expect(s.dateRangeStart).toBe('2026-01-01');
  });
  it('treats a non-complete status as not complete (fail-open guard)', () => {
    expect(isImportComplete(serverSuccess)).toBe(true);
    expect(isImportComplete({ status: 'error', error: 'parse failed' })).toBe(false);
    expect(isImportComplete(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npx vitest run src/lib/body-tracker/connected-sources/__tests__/import-summary.test.ts` → FAIL (module missing).

- [ ] **Step 3: Create `import-summary.ts`:**

```ts
export interface ImportSummary {
  recordsSeen: number;
  recordsIngested: number;
  recordsDeduped: number;
  recordsAttributedHume: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
}
type J = Record<string, unknown>;
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
export function parseImportSummary(json: unknown): ImportSummary {
  const j = (json ?? {}) as J;
  return {
    recordsSeen: num(j.records_seen ?? j.recordsSeen),
    recordsIngested: num(j.records_ingested ?? j.recordsIngested),
    recordsDeduped: num(j.records_deduped ?? j.recordsDeduped),
    recordsAttributedHume: num(j.records_attributed_hume ?? j.recordsAttributedHume),
    dateRangeStart: (j.date_range_start ?? j.dateRangeStart ?? null) as string | null,
    dateRangeEnd: (j.date_range_end ?? j.dateRangeEnd ?? null) as string | null,
  };
}
export function isImportComplete(json: unknown): boolean {
  return !!json && (json as J).status === 'complete';
}
```

- [ ] **Step 4: Run to verify pass** — same command → PASS.

- [ ] **Step 5: Wire the modal to the mapper + fail-closed gate + timeout.** In `AppleHealthImportModal.tsx`:
  - Import at top: `import { parseImportSummary, isImportComplete } from '@/lib/body-tracker/connected-sources/import-summary';` and `import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';`.
  - Replace the Step-4 fetch block (L196-223) so it (a) uses `withAbortTimeout`, (b) fails when `!res.ok || !isImportComplete(json)`, (c) maps via `parseImportSummary`:

```ts
        const res = await withAbortTimeout(
          (signal) => fetch(PARSE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ importId, storagePath, fileKind: ext }),
            signal,
          }),
          60000,
          'apple-health-parse',
        );
        const json = res.ok ? await res.json().catch(() => null) : null;
        if (!res.ok || !isImportComplete(json)) {
          setPhase('error');
          setErrorMsg('We uploaded your file but could not finish reading it. Please try again.');
          return;
        }
        setResult(parseImportSummary(json));
        setPhase('done');
        toast.success(copy.toast);
        onImported?.();
```
  - Keep the existing `catch` (it already sets `phase='error'`); optionally use `isTimeoutError(err)` to set a "timed out" message. Delete the now-unused local `ImportResult` count mapping if `ImportResult` is replaced by `ImportSummary` (align the `result` state type to `ImportSummary`; the summary render at L341+ reads `result.recordsIngested` etc., unchanged).

- [ ] **Step 6: Add source-guard tests** to `brief-25-honesty.test.ts` (keeps the suite's no-`as any` + `recordsAttributedHume` guards):

```ts
it('the XML import fails closed on a non-complete server status and reads real counts', () => {
  const modal = src('src/components/body-tracker/connected-sources/AppleHealthImportModal.tsx');
  expect(modal).toContain('isImportComplete');
  expect(modal).toContain('parseImportSummary');
  expect(modal).toContain('withAbortTimeout');
  expect(modal).toMatch(/!res\.ok \|\| !isImportComplete/);
});
```

- [ ] **Step 7: Run** — `npx vitest run src/components/body-tracker/connections/__tests__/brief-25-honesty.test.ts src/lib/body-tracker/connected-sources/__tests__/import-summary.test.ts` → PASS.

- [ ] **Step 8: Commit** — `fix(230): apple/hume import fails closed, real counts, parse timeout`.

---

### Task 4: Card selection state on `WearableTileCard` + `ConnectionsSurface`

**Files:**
- Modify: `src/components/body-tracker/connections/WearableTileCard.tsx` (props + root `<article>`)
- Modify: `src/components/body-tracker/connections/ConnectionsSurface.tsx` (state + `tiles.map`)
- Test: additions to a new `selection.test.ts`

**Interfaces:**
- Produces: `WearableTileCardProps` gains `selected?: boolean; onSelect?: (tile: WearableTileView) => void;`. `ConnectionsSurface` owns `selectedId: FirstClassTileId` state (default `'apple_health'`).

- [ ] **Step 1: Write the failing test** (`selection.test.ts`, node render):

```ts
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('react-hot-toast', () => ({ default: { success: () => undefined, error: () => undefined } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
import { WearableTileCard } from '@/components/body-tracker/connections/WearableTileCard';
import { buildWearableTiles, type WearableTileInput } from '@/lib/body-tracker/wearable-tiles';
const NOW = Date.parse('2026-08-24T10:00:00.000Z');
const base = (o: Partial<WearableTileInput> = {}): WearableTileInput => ({ oauth: [], humeIngestCount: 0, humeLastPersistAt: null, appleXmlIngested: 0, appleXmlLastPersistAt: null, healthKitPersisted: false, healthKitLastPersistAt: null, dimensionsFed: {}, whoopConfigured: false, ouraConfigured: false, googleHealthConfigured: false, garminConfigured: false, platform: 'web', now: NOW, ...o });
const apple = () => buildWearableTiles(base()).find((t) => t.id === 'apple_health')!;

describe('tile selection state', () => {
  it('marks the selected tile with data-selected and aria-selected and a non-opacity signal', () => {
    const sel = renderToStaticMarkup(createElement(WearableTileCard, { tile: apple(), onPrimary: () => undefined, onSelect: () => undefined, selected: true }));
    const unsel = renderToStaticMarkup(createElement(WearableTileCard, { tile: apple(), onPrimary: () => undefined, onSelect: () => undefined, selected: false }));
    expect(sel).toContain('data-selected="true"');
    expect(sel).toContain('aria-selected="true"');
    expect(sel).toContain('border-teal'); // greyscale-distinguishable border, not opacity alone
    expect(unsel).toContain('data-selected="false"');
    expect(unsel).not.toContain('aria-selected="true"');
  });
});
```
Register nothing extra (this is `.test.ts`). Run: `npx vitest run src/components/body-tracker/connections/__tests__/selection.test.ts` → FAIL.

- [ ] **Step 2: Add selection to `WearableTileCard`.** Extend `WearableTileCardProps` with `selected?: boolean; onSelect?: (tile: WearableTileView) => void;`. On the root `<article>`, add `role="button"`, `tabIndex={0}`, `aria-selected={selected ? 'true' : undefined}`, `data-selected={selected ? 'true' : 'false'}`, `onClick={() => onSelect?.(tile)}`, and an `onKeyDown` that calls `onSelect` on Enter/Space. Append four selected-state signals to the className via a static conditional (full literals): when `selected`, add `border-teal bg-card ring-1 ring-teal` and a left accent bar; when not, keep the existing border. Keep the inner action buttons calling `onPrimary` and stop their click from bubbling to select (`onClick={(e) => { e.stopPropagation(); onPrimary(tile); }}`).

- [ ] **Step 3: Run to verify pass** — same command → PASS.

- [ ] **Step 4: Thread selection through `ConnectionsSurface`.** Add `const [selectedId, setSelectedId] = useState<WearableTileView['id']>('apple_health');`. In the `tiles.map`, pass `selected={tile.id === selectedId}` and `onSelect={(t) => setSelectedId(t.id)}`. (The detail panel in Task 6 consumes `selectedId`.)

- [ ] **Step 5: Commit** — `feat(230): selectable source cards with 4-signal selected state`.

---

### Task 5: Extract the XML import engine into `useHealthXmlImport`

Enables the import flow to render inline in the detail panel (Task 6) and in the existing modal, with the Task-3 fixes centralized.

**Files:**
- Create: `src/components/body-tracker/connected-sources/useHealthXmlImport.ts`
- Modify: `src/components/body-tracker/connected-sources/AppleHealthImportModal.tsx` (consume the hook)
- Test: `src/components/body-tracker/connected-sources/__tests__/useHealthXmlImport.test.ts` (source-guard, node)

**Interfaces:**
- Produces: `export function useHealthXmlImport(intent: HealthXmlImportIntent, onImported?: () => void): { phase; errorMsg; result: ImportSummary | null; runImport: (file: File) => Promise<void>; reset: () => void }`. The hook owns all state and the four steps (auth, insert, upload, parse) with `withTimeout`/`withAbortTimeout` and the Task-3 fail-closed gate.

- [ ] **Step 1: Write the failing source-guard test** (a hook cannot be rendered in node env; assert the extracted shape and that the modal delegates):

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
const src = (r: string) => readFileSync(join(process.cwd(), r), 'utf8');
describe('useHealthXmlImport extraction', () => {
  it('the hook owns the parse gate and timeout, and the modal delegates to it', () => {
    const hook = src('src/components/body-tracker/connected-sources/useHealthXmlImport.ts');
    expect(hook).toContain('isImportComplete');
    expect(hook).toContain('withAbortTimeout');
    expect(hook).toContain('parseImportSummary');
    const modal = src('src/components/body-tracker/connected-sources/AppleHealthImportModal.tsx');
    expect(modal).toContain('useHealthXmlImport');
  });
});
```
Run → FAIL.

- [ ] **Step 2: Create `useHealthXmlImport.ts`** by moving the modal's state (`phase`, `errorMsg`, `result`) and its `runImport` body (Steps 1-4, including the Task-3 fixed parse block, `supabase.auth.getUser` / insert / `storage.upload` each wrapped with `withTimeout(..., 5000|30000, ...)`) into a hook that returns `{ phase, errorMsg, result, runImport, reset }`. Keep `PARSE_ENDPOINT`, `BUCKET`, and `HEALTH_XML_IMPORT_COPY` where the modal can still import them (re-export from the hook or keep in the modal file and import into the hook — pick one and keep `brief-25`'s `HEALTH_XML_IMPORT_COPY` import path valid).

- [ ] **Step 3: Rewire `AppleHealthImportModal.tsx`** to call `const { phase, errorMsg, result, runImport, reset } = useHealthXmlImport(intent, onImported);` and delete the now-moved inline state/steps. Keep the modal's JSX (dropzone, progress, summary render) reading the hook's values. Preserve `data-import-intent`, the copy split, and `recordsAttributedHume` in the summary render (brief-25 guards).

- [ ] **Step 4: Run** — `npx vitest run src/components/body-tracker/connected-sources/__tests__ src/components/body-tracker/connections/__tests__/brief-25-honesty.test.ts` (run the hook test + brief-25) → PASS. Manually `npx tsc --noEmit` to catch signature drift.

- [ ] **Step 5: Commit** — `refactor(230): extract useHealthXmlImport hook from the modal`.

---

### Task 6: `ActiveSourceDetailPanel` — the center column

**Files:**
- Create: `src/components/body-tracker/connections/ActiveSourceDetailPanel.tsx`
- Modify: `ConnectionsSurface.tsx` (render the panel keyed to `selectedId`; the panel hosts the inline dropzone via the hook)
- Test: `src/components/body-tracker/connections/__tests__/detail-panel.test.ts` (node render)

**Interfaces:**
- Consumes: `WearableTileView`, `useHealthXmlImport` (Task 5), `HEALTH_XML_IMPORT_COPY`.
- Produces: `export function ActiveSourceDetailPanel({ tile }: { tile: WearableTileView | null }): JSX.Element`. Renders, by `tile.action.kind` and `tile.statusLabel`: file source → provides + export instructions + inline dropzone/browse (calls `runImport`); oauth Coming-soon → what it provides + a non-interactive "Coming soon" note (NO connect button); `tile === null` → a designed "Pick a source" prompt.

- [ ] **Step 1: Write the failing test:**

```ts
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('react-hot-toast', () => ({ default: { success: () => undefined, error: () => undefined } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
import { ActiveSourceDetailPanel } from '@/components/body-tracker/connections/ActiveSourceDetailPanel';
import { buildWearableTiles, type WearableTileInput } from '@/lib/body-tracker/wearable-tiles';
const NOW = Date.parse('2026-08-24T10:00:00.000Z');
const base = (o: Partial<WearableTileInput> = {}): WearableTileInput => ({ oauth: [], humeIngestCount: 0, humeLastPersistAt: null, appleXmlIngested: 0, appleXmlLastPersistAt: null, healthKitPersisted: false, healthKitLastPersistAt: null, dimensionsFed: {}, whoopConfigured: false, ouraConfigured: false, googleHealthConfigured: false, garminConfigured: false, platform: 'web', now: NOW, ...o });
const tile = (id: string) => buildWearableTiles(base()).find((t) => t.id === id)!;

describe('ActiveSourceDetailPanel', () => {
  it('shows the export dropzone for Apple Health', () => {
    const m = renderToStaticMarkup(createElement(ActiveSourceDetailPanel, { tile: tile('apple_health') }));
    expect(m).toContain('data-detail-source="apple_health"');
    expect(m).toContain('Export All Health Data');
    expect(m).toContain('data-inline-dropzone');
  });
  it('shows a non-interactive Coming soon detail for Google Health with no Connect', () => {
    const m = renderToStaticMarkup(createElement(ActiveSourceDetailPanel, { tile: tile('google_health') }));
    expect(m).toContain('Coming soon');
    expect(m).not.toContain('>Connect<');
  });
  it('prompts to pick a source when nothing is selected', () => {
    const m = renderToStaticMarkup(createElement(ActiveSourceDetailPanel, { tile: null }));
    expect(m).toContain('data-detail-source="none"');
  });
});
```
Run → FAIL.

- [ ] **Step 2: Build `ActiveSourceDetailPanel.tsx`** as a `'use client'` component. Root `<section data-detail-source={tile?.id ?? 'none'}>`. Branch: `tile === null` → heading + "Select a source to see how to connect it." For `tile.action.kind === 'xml_upload'` → render the copy (`HEALTH_XML_IMPORT_COPY[tile.id === 'hume' ? 'hume' : 'apple']`), the iOS export steps, and an inline dropzone `<div data-inline-dropzone ...>` that wires `onDrop`/browse to `useHealthXmlImport(intent).runImport`, plus the hook's phase/error/summary render. For `tile.action.kind === 'oauth'` with `statusLabel === 'Coming soon'` → provides list + a plain "Coming soon" line, NO button. Use tokens (`bg-card`, `text-teal`, etc.), `strokeWidth={1.5}`, no em-dashes.

- [ ] **Step 3: Run to verify pass** — `npx vitest run src/components/body-tracker/connections/__tests__/detail-panel.test.ts` → PASS.

- [ ] **Step 4: Mount in `ConnectionsSurface`** as the center column (Task 10 finalizes the grid). Compute `const selectedTile = tiles.find((t) => t.id === selectedId) ?? null;` and render `<ActiveSourceDetailPanel tile={selectedTile} />`. The panel's inline import replaces the need to open the modal on card select; keep `AppleHealthImportModal` mounted for the drag-onto-tile shortcut until Task 10, then decide on removal.

- [ ] **Step 5: Commit** — `feat(230): active-source detail panel (center column)`.

---

### Task 7: Contributor column — 7 MetricKeys, "Connect your device", populate-on-connect, per-row chevron

Splits `ScoreDetailPanel` into the BOS ring block (kept) and a new contributor column driven by the 7 MetricKeys. The cold Source cell reads "Connect your device"; a connected dimension shows its real source; each row has a chevron to a dimension detail view (Task 8).

**Files:**
- Create: `src/lib/body-tracker/contributor-rows.ts` (pure: build the 7-key contributor rows from `scoreDetail` + connected sources)
- Create: `src/components/body-tracker/connections/ContributorColumn.tsx`
- Modify: `ScoreDetailPanel.tsx` (keep BOS ring; delegate rows to `ContributorColumn`)
- Modify: `brief-26-wearable-lock.test.ts` (it pins the 4 dims + `>=5 UNKNOWN` — update to the 7-key contributor model)
- Test: `src/lib/body-tracker/__tests__/contributor-rows.test.ts` + `contributor-column.test.ts`

**Interfaces:**
- Produces: `export const CONTRIBUTOR_METRICS = ['hrv','sleep','resting_hr','recovery','workouts','body_composition','steps'] as const;` with a `METRIC_LABELS` map; `export interface ContributorRow { metric: string; label: string; connectedSource: string | null }`; `export function buildContributorRows(rows: DimensionSourceRow[]): ContributorRow[]` (maps each metric to its supplying source if the matching `DimensionSourceRow` `showRing===true`, else `connectedSource: null`).

- [ ] **Step 1: Write the failing pure-fn test** (`contributor-rows.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { buildContributorRows, CONTRIBUTOR_METRICS } from '../contributor-rows';

describe('buildContributorRows', () => {
  it('returns the 7 MetricKeys with null source when nothing is connected', () => {
    const rows = buildContributorRows([]);
    expect(rows.map((r) => r.metric)).toEqual([...CONTRIBUTOR_METRICS]);
    expect(rows.every((r) => r.connectedSource === null)).toBe(true);
  });
  it('populates a metric with its source when that dimension is sourced', () => {
    const rows = buildContributorRows([
      { dimension: 'sleep', source: 'apple_health', value: 90, displayValue: '90', status: 'sourced', showRing: true, manual: false, disagreement: null, sources: [] },
    ]);
    expect(rows.find((r) => r.metric === 'sleep')?.connectedSource).toBe('apple_health');
    expect(rows.find((r) => r.metric === 'hrv')?.connectedSource).toBeNull();
  });
});
```
Run → FAIL.

- [ ] **Step 2: Create `contributor-rows.ts`** with `CONTRIBUTOR_METRICS`, `METRIC_LABELS` (`hrv→'HRV'`, `sleep→'Sleep'`, `resting_hr→'Resting HR'`, `recovery→'Recovery'`, `workouts→'Workouts'`, `body_composition→'Body comp.'`, `steps→'Steps'`), and `buildContributorRows` mapping each metric to a `DimensionSourceRow` whose `dimension` matches (accept `strain`→`workouts` and `metabolic`→`body_composition` aliases so today's `scoreDetail` still populates), taking `connectedSource = matched?.showRing ? matched.source : null`.

- [ ] **Step 3: Run to verify pass** — → PASS.

- [ ] **Step 4: Build `ContributorColumn.tsx`.** Renders the panel-level disclosure ONCE at top (`CONNECTIONS_DISCLOSURE`, see Task 9), a header row, then one `<article data-metric={row.metric}>` per `buildContributorRows(rows)`. Source cell: `row.connectedSource ? <SourceGlyph/> + label` (populated) : a `data-connect-cta` "Connect your device" element (`text-teal`). Each row ends with a `ChevronRight` button `aria-label={`${label} details`}` that calls an `onOpenDimension(metric)` prop (Task 8). Move `SourceGlyph` here (or import it).

- [ ] **Step 5: Write `contributor-column.test.ts`** (node render): cold → 7 rows, each contains `Connect your device`; a populated `rows` input → the matching row shows the source and NOT the CTA; every row has a chevron `aria-label` ending `details`. Run → implement to green.

- [ ] **Step 6: Delegate from `ScoreDetailPanel`.** Keep the BOS ring block; replace the `locked.map(...)` row render (L113-185) with `<ContributorColumn rows={rows} onOpenDimension={onOpenDimension} />`. Thread an `onOpenDimension` prop through `ScoreDetailPanelProps`.

- [ ] **Step 7: Update `brief-26-wearable-lock.test.ts`.** Its dim assertions (Sleep/Recovery/Strain/Metabolic, `>=5 UNKNOWN`, `SCORE_DETAIL_DIMENSIONS`) now describe the OLD model. Rewrite that block to assert the contributor column renders the 7 labels and, cold, shows `Connect your device` (not per-row UNKNOWN). Keep `connectionsBosCompositeDisplay` deep-equals `CONNECTIONS_BOS_COMPOSITE` (`--`/`UNKNOWN`) and `BOS_UNKNOWN_NEVER_ZERO_COPY` on the ring block.

- [ ] **Step 8: Run** — `npx vitest run src/lib/body-tracker/__tests__/contributor-rows.test.ts src/components/body-tracker/connections/__tests__` → PASS.

- [ ] **Step 9: Commit** — `feat(230): 7-MetricKey contributor column with connect-your-device`.

---

### Task 8: Dimension detail view (chevron target)

**Files:**
- Create: `src/components/body-tracker/connections/DimensionDetailSheet.tsx`
- Modify: `ContributorColumn.tsx` / `ConnectionsSurface.tsx` (open on chevron)
- Test: `dimension-detail.test.ts`

**Interfaces:**
- Consumes: `CONTRIBUTOR_METRICS`, `METRIC_LABELS`, a `METRIC_EXPLAINER` map.
- Produces: `export function DimensionDetailSheet({ metric, onClose }: { metric: string | null; onClose: () => void }): JSX.Element | null` (returns null when `metric === null`).

- [ ] **Step 1: Write the failing test** — render with `metric='sleep'` → contains the sleep explainer copy + `data-dimension-detail="sleep"`; with `metric=null` → renders nothing. Run → FAIL.

- [ ] **Step 2: Add `METRIC_EXPLAINER`** (one honest sentence per metric: what it measures + how it is derived; Marshall-approved copy — placeholder text acceptable in-code but flagged for Marshall). Build `DimensionDetailSheet` as a dialog/sheet (`role="dialog"`, focus-trap optional) reading `METRIC_EXPLAINER[metric]`.

- [ ] **Step 3: Wire open/close** — `ConnectionsSurface` holds `const [openMetric, setOpenMetric] = useState<string | null>(null);`, passes `onOpenDimension={setOpenMetric}` into `ScoreDetailPanel`→`ContributorColumn`, and renders `<DimensionDetailSheet metric={openMetric} onClose={() => setOpenMetric(null)} />`.

- [ ] **Step 4: Run → PASS. Commit** — `feat(230): dimension detail sheet from contributor chevron`.

---

### Task 9: Say-once UNKNOWN disclosure, de-dupe footer, soften the toast

**Files:**
- Modify: `src/lib/body-tracker/wearable-tiles.ts` (add `CONNECTIONS_DISCLOSURE`)
- Modify: `ConnectionsSurface.tsx` (remove the duplicate footer), `ScoreDetailPanel.tsx`/`ContributorColumn.tsx` (single disclosure), `OAUTH_ERROR_COPY`
- Test: additions to `connections-ia.test.ts`

- [ ] **Step 1: Write the failing test** (`connections-ia.test.ts`):

```ts
it('says the UNKNOWN disclosure once and softens the not-configured toast', () => {
  const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
  const panel = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
  const col = src('src/components/body-tracker/connections/ContributorColumn.tsx');
  // CONNECTIONS_FOOTER rendered exactly once across surface + panel
  const footerHits = (surface + panel + col).match(/CONNECTIONS_FOOTER/g) ?? [];
  expect(footerHits.length).toBe(1);
  expect(surface).not.toContain('is not configured yet');
  expect(surface).toContain('is not available yet');
});
```
Run → FAIL (footer renders in both surface L173 and panel L188 today).

- [ ] **Step 2: Add `CONNECTIONS_DISCLOSURE`** to `wearable-tiles.ts`: `export const CONNECTIONS_DISCLOSURE = 'Your Bio Optimization Score is built from the devices you connect. Dimensions without a source stay blank rather than being estimated.';` Render it once at the top of `ContributorColumn`.

- [ ] **Step 3: De-dupe the footer.** Keep `CONNECTIONS_FOOTER` in exactly one place (the surface footer paragraph). Remove the second render in `ScoreDetailPanel.tsx:188` (the ring block) OR the surface's — pick the surface footer, drop the panel's. Ensure `BOS_UNKNOWN_NEVER_ZERO_COPY` stays on the ring block (brief-26 guard).

- [ ] **Step 4: Soften `OAUTH_ERROR_COPY`.** Change `whoop_not_configured` and `oura_not_configured` to `'WHOOP is not available yet.'` / `'Oura is not available yet.'` (removes "not configured" from a consumer path per §11).

- [ ] **Step 5: Run → PASS. Commit** — `fix(230): single UNKNOWN disclosure, one footer, honest coming-soon toast`.

---

### Task 10: Three-column layout + tablet/mobile (G76) + per-panel 219i boundaries

**Files:**
- Modify: `ConnectionsSurface.tsx` (grid + boundaries + mobile order)
- Modify tests: `connections-ia.test.ts:35`, `brief-26-wearable-lock.test.ts:71` (the `min-[1280px]:grid-cols-2` lock)
- Test: additions asserting the new grid + boundaries

**Interfaces:**
- Consumes: `AdminPanel` from `@/components/admin/AdminPanelErrorBoundary` (219i wrapper).

- [ ] **Step 1: Write the failing test:**

```ts
it('renders three columns at 1280 and wraps each column in a 219i boundary', () => {
  const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
  expect(surface).toContain('min-[1280px]:grid-cols-[1fr_1.2fr_1fr]');
  expect(surface).toContain('AdminPanel');
  expect(surface).toContain('ActiveSourceDetailPanel');
});
```
Also update the TWO existing lock assertions (`connections-ia.test.ts:35`, `brief-26-wearable-lock.test.ts:71`) from `'min-[1280px]:grid-cols-2'` to `'min-[1280px]:grid-cols-[1fr_1.2fr_1fr]'`. Run → FAIL.

- [ ] **Step 2: Rewrite the grid** in `ConnectionsSurface.tsx` (L159) to three columns:

```tsx
      <div className="grid grid-cols-1 gap-6 min-[900px]:grid-cols-2 min-[1280px]:grid-cols-[1fr_1.2fr_1fr]">
        <AdminPanel name="Sources">
          <div className="space-y-3">{/* tiles.map with selected/onSelect */}</div>
        </AdminPanel>
        <AdminPanel name="Active source">
          <ActiveSourceDetailPanel tile={selectedTile} />
        </AdminPanel>
        <AdminPanel name="Score contributors">
          <ScoreDetailPanel rows={scoreDetail} lastUpdatedAt={lastUpdatedAt} onOpenDimension={setOpenMetric} />
        </AdminPanel>
      </div>
```
`AdminPanel` is `'use client'` and `ConnectionsSurface` is a client component, so the boundaries are valid.

- [ ] **Step 3: Mobile order (G76).** Below `min-[900px]`, apply `order-*` utilities keyed to whether anything is connected: `const anyConnected = tiles.some((t) => t.lastSyncState === 'synced' || t.lastSyncState === 'connected_never_synced');`. Cold → contributors `order-1`, sources `order-2`, detail `order-3`; connected → sources `order-1`, detail `order-2`, contributors `order-3`. At `min-[900px]` reset order. Add a test asserting both `order-1` assignments appear with the `anyConnected` conditional.

- [ ] **Step 4: Keep `CONNECTIONS_LEAD`/`CONNECTIONS_FOOTER`** in the header/footer (brief-26 + connections-ia guards). Confirm `surface + tile` still has no `google_health`/`Apple Watch` literal.

- [ ] **Step 5: Run the full connections suite** — `npx vitest run src/components/body-tracker/connections/__tests__ src/lib/body-tracker/__tests__` → PASS. `npx tsc --noEmit`.

- [ ] **Step 6: Commit** — `feat(230): three-column connections layout, G76 mobile order, 219i boundaries`.

---

### Task 11: Vendor brand marks (Lex-gated) with Lucide fallback

**Files:**
- Create: `src/components/body-tracker/connections/WearableBrandMark.tsx`
- Create: `public/logos/wearables/README-provenance.md` (records each asset source + Lex status)
- Modify: `WearableTileCard.tsx` (`TileIcon` → `WearableBrandMark`), `ActiveSourceDetailPanel.tsx`, `ContributorColumn.tsx` (source glyphs)
- Test: `wearable-brand-mark.test.ts`

**Interfaces:**
- Produces: `export function WearableBrandMark({ id, className }: { id: string; className?: string }): JSX.Element` — renders a local asset when `WEARABLE_MARK_ASSETS[id]` exists and is Lex-cleared, else a Lucide fallback (`Watch`/`Circle`/`Heart`/`Scan`/`HeartPulse`).

- [ ] **Step 1: Write the failing test** — render `WearableBrandMark` for each of the 6 ids; assert an `<img|svg data-vendor-mark>` or a Lucide fallback with `data-vendor-mark="fallback"`; assert an unknown id falls back. Run → FAIL.

- [ ] **Step 2: Build `WearableBrandMark`** with a `WEARABLE_MARK_ASSETS: Record<string, { src: string; lexCleared: boolean } | undefined>` map. When an entry exists and `lexCleared`, render `<img src=... alt="" data-vendor-mark={id} />` (local `/logos/wearables/*.svg`, stored not hotlinked). Otherwise render the Lucide fallback keyed by id with `data-vendor-mark="fallback"`. **Ship all entries with `lexCleared: false` (or omitted) until Lex signs off** — so production renders Lucide until assets clear. Record provenance in `README-provenance.md`.

- [ ] **Step 3: Swap call sites** — replace `TileIcon` in `WearableTileCard` with `<WearableBrandMark id={tile.id} className="h-5 w-5" />`; use it in the detail panel header and the contributor source pills. Keep `connections-ia`'s `tile.toContain('Watch')` satisfied (the fallback still references `Watch` for whoop/garmin) or update that assertion in lockstep if the import shape changes.

- [ ] **Step 4: Run → PASS. Commit** — `feat(230): vendor brand mark component (Lex-gated, Lucide fallback)`.

---

## Self-Review

- **Spec coverage:** §2 layout → Task 10; §3 cards + selection → Tasks 4, 11; §4 detail panel → Tasks 5, 6; §5 contributor + G77-as-CTA + chevron → Tasks 7, 8; §6.1 say-once → Task 9; §7 marks → Task 11; §8 tokens → Task 2; upload fixes → Task 3; 219i/228 → Tasks 10, 3/5; six tiles (D4/D8) → Task 1. Covered.
- **Type consistency:** `WearableTileInput` gains `googleHealthConfigured`/`garminConfigured` in Task 1 and every builder call (emptyTiles, assembleWearableSnapshot, test `base()`/`baseInput()`) is updated in the same or a dependent task. `ImportSummary` (Task 3) is the single count shape used by the hook (Task 5) and the modal render. `onOpenDimension` threads Task 7→8 consistently.
- **Placeholder scan:** none — `METRIC_EXPLAINER` and mark assets are explicitly flagged as Marshall/Lex-gated content, not code placeholders.
- **Ordering risk:** Task 1 changes `WearableTileInput`, so every later test's `baseInput()` factory must include the two new flags — noted in Tasks 4/6 test snippets (already include them). Execute in order.

## Execution note

Gates outside this plan (must clear before production per spec §11): **Lex** on every vendor mark (Task 11 ships Lucide-fallback until then), **Marshall** on new copy (Tasks 8, 9), production-fetch verification + screenshots at 1920/1280/900/375 in cold and one-connected states, and diff-proof that the sidebar/logo/user chip are unchanged.
