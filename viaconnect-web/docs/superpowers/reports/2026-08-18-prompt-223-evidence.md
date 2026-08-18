# Prompt 223 structured location: verification evidence

Date: 2026-08-18
Branch: feat/223-structured-location
Scope: Task 8 verification suite (fail-open, fallback, a11y contract)

This file records what can be proven from this session. Live SSO walkthroughs and production backfill counts are not claimed.

## 1. Backfill statistics command

Do not apply migrations to production from this session. The backfill function is already defined in `supabase/migrations/20260818010300_prompt_223_location_backfill.sql` and scripted at `scripts/location/backfill-stats.sql`.

Command (service_role or postgres):

```sql
select * from public.backfill_profile_locations();
```

Expected row shape: `(total int, parsed int, prompted int)` for profiles that have a non-empty `location_legacy` after the metadata copy.

Live result from this session: not collected. The function was not executed against project `nnhkcufyqjojdbvdrpky`. Bare Buffalo remains a prompted fixture by construction (Task 3 parser + SQL comments).

## 2. Screenshots

Remaining work. The SSO-protected Vercel host cannot be walked unauthenticated from this session. No desktop or mobile screenshot sequence was captured.

Section 4 still needs an authenticated browser pass (6 screenshots minimum, desktop and mobile) for:

- Signup step 3: type-filtered Country, US showing State, Canada showing Province, dependent City typeahead, account created with structured profile columns
- Free-entry: `Use '<typed value>'` accepted and stored
- Dependency clearing: changing country clears subdivision and city
- Fail-open: lookup killed, signup still completes, fail-open event logged
- Profile `Confirm your location` banner on a flagged fixture; Profile edit reusing `LocationSelector`
- Keyboard-only completion of all three fields; no overflow at 375px or 390px; console clean

## 3. Grep command and output

Intended command (`rg` is not installed on this Windows shell):

```
rg -n --glob "*.{ts,tsx}" "location_legacy" src
rg -n --glob "*.{ts,tsx}" "user_metadata\?\.location" src
```

Command actually run from `viaconnect-web`:

```
Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "location_legacy"
Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "user_metadata\?\.location"
```

Output:

```
src\lib\location\signup-schema.ts:69:location_legacy: formatStructuredLocation(location),
src\lib\__tests__\location-legacy-grep.test.ts:9:const LOCATION_LEGACY = "location" + "_legacy";
src\lib\__tests__\location-legacy-grep.test.ts:35:it(`keeps ${LOCATION_LEGACY} only under src/lib/location (plus this test)`, () => {
src\lib\__tests__\location-legacy-grep.test.ts:46:if (text.includes(LOCATION_LEGACY)) {
===== user_metadata?.location =====
src\lib\__tests__\location-legacy-grep.test.ts:53:it("has no user_metadata?.location reads in src", () => {
```

Contiguous `location_legacy` under `src/` is only the signup metadata write in `src/lib/location/signup-schema.ts`. That write is copy-trigger compatibility, not a runtime reader. The grep proof test mentions the token via concatenation and is allowlisted. No `user_metadata?.location` readers exist in `src/` outside that scanner title.

Vitest proof (`src/lib/__tests__/location-legacy-grep.test.ts`): 3 passed.

## 4. Automated verification that did run

```
npx vitest run src/lib/__tests__/location-labels.test.ts src/lib/__tests__/location-seed-contract.test.ts src/lib/__tests__/parse-legacy-location.test.ts src/lib/__tests__/location-search.test.ts src/lib/__tests__/format-structured-location.test.ts src/lib/__tests__/location-selector-contract.test.ts src/lib/__tests__/signup-location-schema.test.ts src/lib/__tests__/location-legacy-grep.test.ts src/lib/__tests__/location-fail-open.test.ts src/lib/location src/components/location
```

Result: 10 files, 36 passed.

Covered here without a browser:

- Fail-open: `toSearchResponse({ timedOut: true })` returns `{ ok: true, items: [], failOpen: true }`. `LocationSelector` source treats `failOpen` as free-entry (`countryAllowsFree`, `subdivisionAllowsFree`, city always free-entry).
- Dependency clearing: `reduceLocationAction({ type: "setCountry" })` clears subdivision and city; `{ type: "setSubdivision" }` clears city. `LocationSelector` calls the helper for those actions.
- Free-entry: choosing `Use 'Tiny Hamlet'` sets `city: "Tiny Hamlet"` and `isFreeEntry: true`.
- A11y contract: combobox / listbox / option roles, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `min-h-[44px]`, `text-base`, Hannah `Use '` copy. No em dash or en dash in the selector sources.

## 5. Unfinished items

Stated plainly (not deferred as a later prompt unless Gary runs them):

1. No live `select * from public.backfill_profile_locations();` counts.
2. No authenticated Vercel/SSO screenshot set (Section 4 items 1-6).
3. No deployed signup account-creation row proof.
4. No live fail-open log line from a killed lookup on the hosted app.
5. No keyboard-only or 375/390 overflow walkthrough on a real device or browser.
6. Confirm-location banner exists in code (`ConfirmLocationBanner`) but was not shown on a flagged live fixture in this session.
