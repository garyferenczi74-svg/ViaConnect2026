# Prompt 210e Task E4: Planted-Phantom Proof (210d drift gate catches a new phantom)

Date: 2026-07-09. Branch: feat/210e-integration (worktree ViaConnect2026-210e).

## Purpose

Prove that the Prompt 210d schema-drift gate (`.github/workflows/schema-drift.yml`,
already present on this branch via merged main) actually catches a NEW phantom
table reference before merge. The gate runs `scripts/schema/scan-code-refs.mjs`,
which walks `src` and `supabase/functions` for Supabase `.from()`, `.rpc()`, and
`storage.from()` string literals and diffs them against the committed schema
snapshot (`docs/integrity/snapshot/live-types.ts` + `db-functions.json` +
`buckets.json`). A reference absent from both the snapshot AND the reviewed
baseline is a finding; any non-baselined finding exits 1.

This proof was RUN LOCALLY. A throwaway scratch file was created under `src`,
scanned once, and DELETED. No phantom reference is committed. The scanner output
below is the real captured output, not a reconstruction.

## Why the scratch file is placed and named the way it is

The scanner excludes `__tests__` directories and any file whose name contains
`.test.` (see `EXCLUDED_DIRS` and the `\.test\.` filter in `walk()` in
`scripts/schema/scan-code-refs.mjs`). So the scratch file must live OUTSIDE a
`__tests__` dir and must NOT be a `.test.` file, or the scanner would skip it and
the phantom would never surface. It was placed at
`src/lib/formavision/__phantom_e4_scratch.ts` (a plain source file, scanned) with
this single offending line:

```ts
return supabase.from('formavision_phantom_e4_proof').select('*');
```

`formavision_phantom_e4_proof` is a nonexistent table: it appears in neither the
live-types.ts snapshot nor `drift-baseline.json`.

## Procedure and REAL captured output

### Step 0: clean tree, gate green against the baseline (exit 0)

Command (mirrors the schema-drift.yml `schema-drift` job step):

```
node scripts/schema/scan-code-refs.mjs --baseline scripts/schema/drift-baseline.json --snapshot docs/integrity/snapshot
```

Real output:

```
scan-code-refs: OK. 80 known finding(s), all baselined; scanned 3004 files.
EXIT_CODE=0
```

### Step 1: plant the phantom, scan WITHOUT baseline (NEW finding, exit 1)

Scratch file `src/lib/formavision/__phantom_e4_scratch.ts` created (see line
above). Command (no `--baseline`, so every non-snapshot ref is reported):

```
node scripts/schema/scan-code-refs.mjs --snapshot docs/integrity/snapshot
```

The finding count moved from 80 (Step 0) to 81, and the run exited 1. The single
NEW finding attributable to the planted phantom, filtered out of the sorted list,
is exactly:

```
  [table] formavision_phantom_e4_proof (src/lib/formavision/__phantom_e4_scratch.ts:8)
```

Real run header + exit code (the phantom line above is one row of the 81 the run
printed; every other row is a pre-existing audit-known reference that the baseline
whitelists in the gated run):

```
scan-code-refs: FAIL. 81 schema drift finding(s) not in baseline (scanned 3005 files):
  ... (80 pre-existing audit-known refs, elided) ...
  [table] formavision_phantom_e4_proof (src/lib/formavision/__phantom_e4_scratch.ts:8)
  ...
EXIT_CODE=1
```

The delta is precise: findings 80 -> 81 (+1, the phantom), files scanned
3004 -> 3005 (+1, the scratch file). The phantom is caught as a brand-new
schema-drift finding, which is exactly what the 210d gate does on a PR that
introduces a reference to a table that does not exist.

### Step 2: remove the phantom, gate green again (exit 0)

Scratch file deleted. Same gated command as Step 0:

```
node scripts/schema/scan-code-refs.mjs --baseline scripts/schema/drift-baseline.json --snapshot docs/integrity/snapshot
```

Real output (identical to Step 0: back to 80 / 3004 / exit 0, proving the
phantom left no residue):

```
scan-code-refs: OK. 80 known finding(s), all baselined; scanned 3004 files.
EXIT_CODE=0
```

`git status --short` after deletion showed no phantom file and no phantom text in
any tracked path. NO phantom reference is committed.

## What this proves

1. A newly introduced reference to a nonexistent table is a NEW finding the
   scanner reports (it is not pre-baselined; the baseline is an explicit,
   reviewer-visible whitelist edited only via a PR diff).
2. Against the committed baseline the gate is green on a clean tree, so the gate
   fails only on genuinely new drift, not on the residual audit-known set.
3. The 210d `schema-drift` job would therefore fail a PR that adds
   `formavision_phantom_e4_proof` (or any phantom) before it can merge to main.

The same guardrail protects the FormaVision seams: the telemetry sink
(`analytics_events`) and every other FormaVision `.from()` / `.rpc()` target is
subject to this scan, so a FormaVision phantom sink cannot land silently.
