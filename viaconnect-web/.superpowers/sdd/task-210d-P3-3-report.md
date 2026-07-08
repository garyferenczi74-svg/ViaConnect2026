# Task P3-3 Report: CI migration-parity gate + apply procedure

Commit: 07508586df201a38cdbf2503c5aad30e110a8fd6 on feat/210d-schema-integrity (5 files, explicit-path commit).

## Delivered

- `scripts/schema/check-migration-parity.mjs`: zero-dep ESM CLI. Flags: `--manifest <path> --migrations <dir> [--grace-days N=7] [--now-ms MS test-only]`. Post-baseline repo file must match an entry (`<version>_<name>` equals stem, or entry name contains stem) or have mtime younger than grace; post-baseline entry without a file is an orphan; pre-baseline is accepted history. Exit 0/1/2, sorted deterministic output. `Date.now()` appears at the CLI entry only; `isWithinGrace` takes injected `nowMs`.
- `docs/integrity/snapshot/applied-manifest.json`: baseline_stamp 20260707000000 + specified baseline_note. applied-migrations.json (captured 2026-07-06) has zero rows >= 20260707, so entries are the manual applies: six 210d versions mapped to files via remediation-log rollback columns (225210 audit_logs 081200; 225228 profiles 101532; 225426+225436 daily_scores 083321+090000; 225443 orders 141023; 225453 subscriptions 141124), the practitioner_core double-apply (20260708003638 + 20260708004716, both name 20260707150000_..., note on the second), cert waitlist 20260708011939 -> 20260707170000_..., F3b as version "pending-verification" + note per instruction. Names are full filename stems.
- ADDED beyond the enumerated nine: P0-7/7b migration 20260707160000_prompt_210d_user_variants_risk_category is APPLIED per remediation-log but its version was never recorded there; entered as "pending-verification" + note (same convention as F3b) so the gate stays green past grace. Controller corrects both at next snapshot regen.
- `docs/integrity/apply-procedure.md`: going-forward rule (MCP apply_migration with FILENAME STEM as name; append {version, name} to manifest; remediation-log row with rollback reference; regen live-types + types.ts together per scripts/schema/regen-types.md with drift-baseline shrink in the same commit). Double-apply documented as the worked example of name-based matching.
- `.github/workflows/schema-drift.yml`: second job `migration-parity` mirroring the P3-2 job pattern (checkout@v4, setup-node@v4 node 20, working-directory viaconnect-web, no npm install). ci.yml untouched.
- `tests/schema/check-migration-parity.test.ts`: 5 child_process fixture tests with fixed clock via `--now-ms` and `utimesSync`-controlled mtimes: old unmanifested -> exit 1 named; in-grace -> exit 0 with [grace] line; post-baseline orphan entry -> exit 1 named; pre-baseline breaks both sides -> exit 0; name-contains-stem matching beyond grace incl. double-apply, pending-verification, and CLI-style rows -> exit 0. Windows-safe cleanup (rmSync recursive force maxRetries).

## Verification

- Live run: `check-migration-parity: OK. baseline 20260707000000; post-baseline files: 10 (matched 10, in grace 0); post-baseline manifest entries: 11.` exit 0 (no grace reliance).
- Vitest: 1 file, 5/5 passed (482ms). Scoped `tsc --noEmit` on the test: clean. ASCII audit on all 5 files: clean (no em/en dashes, no emojis). Zero `any`.

## Concerns

1. ~~CI mtime caveat~~ (resolved by P3-3b below).
2. Version-to-file pairing for the six 210d entries came from remediation-log rollback columns; snapshot regen from list_migrations will confirm.
3. Two "pending-verification" versions (P0-7 20260707160000, F3b 20260707172000) await correction at the next snapshot regen.

## P3-3b Fix (2026-07-07)

Adjudicated two review findings on `scripts/schema/check-migration-parity.mjs` and `tests/schema/check-migration-parity.test.ts`.

**Fix 1 - strict-equality manifest matching (Important, false-match prevention):**
`entryMatchesStem` arm 2 changed from `entry.name.includes(stem)` to `entry.name === stem`. The `includes` form would falsely match a shorter stem against a longer name sharing a common prefix (e.g. a file `..._practitioner_core.sql` would wrongly satisfy an entry named `..._practitioner_core_additive`). Strict equality is the correct join key for MCP-style rows where the name IS the filename stem.

**Fix 2 - filename-stamp grace (CI-deterministic):**
Replaced the `statSync` mtime grace comparison with `stampToMs(file.stamp)` which parses the 14-digit filename stamp as `Date.UTC(YYYY, MM-1, DD, HH, mm, SS)`. Removed `statSync` and `join` imports (both now unused). `checkParity` signature drops `migrationsDir` parameter. `isWithinGrace` renamed its parameter from `mtimeMs` to `stampMs`. The grace window now behaves identically in CI and locally since `actions/checkout` no longer controls the age signal.

**Test changes:**
- Removed `utimesSync` import, `MS_PER_DAY` constant, and `daysBeforeNow` helper.
- `FixtureFile` interface reduced to `{ fileName: string }` (no `mtimeMs`).
- `createFixture` no longer calls `utimesSync`.
- Test 2 (fresh-in-grace) filename changed to `20260715000000_...` (5 days before NOW_MS 2026-07-20) to encode freshness in the stamp.
- Test 5 description updated to "name-equals-stem".
- Added test 6: false-match regression -- manifest entry `..._core_additive`, repo contains both `..._core_additive.sql` (satisfies entry) and `..._core.sql` (stale, 12 days); asserts exit 1 with `[missing-from-manifest]` for the shorter-prefix file.

**Verification:**
- Vitest: 1 file, 6/6 passed (549ms).
- Live: `check-migration-parity: OK. baseline 20260707000000; post-baseline files: 10 (matched 10, in grace 0); post-baseline manifest entries: 11.` exit 0. Strict equality holds for all 10 real entries (MCP-style names are exact stems; CLI-style arm unchanged).
- ASCII audit: clean. Zero `any`.
