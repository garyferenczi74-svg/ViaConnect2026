# Migration Apply Procedure (Prompt 210d, Task P3-3)

The going-forward rule for every production schema apply on Supabase project
ViaConnect2026 (nnhkcufyqjojdbvdrpky). Applies are controller-executed only,
after Gary's sign-off is recorded in docs/integrity/remediation-log.md.
Implementers never apply migrations.

## The rule, per apply

1. Apply via the Supabase MCP `apply_migration`, passing the migration
   FILENAME STEM as the `name` parameter. Example: for
   `supabase/migrations/20260707170000_prompt_210f_certification_waitlist_additive.sql`
   the name is `20260707170000_prompt_210f_certification_waitlist_additive`.
   The database stamps its own `version` at apply time, so the name is the
   only durable join key back to the repo file.
2. Append `{version, name}` to the `entries` array of
   `docs/integrity/snapshot/applied-manifest.json`:
   - `version`: the stamp the database returned or recorded for the apply
     (confirm with `list_migrations` when in doubt). If the stamp was not
     captured, record `"pending-verification"` plus a `note` field; the
     controller corrects it at the next snapshot regen.
   - `name`: the filename stem, exactly.
3. Append a row to `docs/integrity/remediation-log.md` with the applied
   version and the rollback reference (rollback run_id, or the revert
   statement set) for that unit.
4. Regenerate the live snapshot and app types together per
   `scripts/schema/regen-types.md` (live-types.ts and types.ts move in the
   same commit), and shrink the drift baseline
   (`scripts/schema/drift-baseline.json`) accordingly at the same time.

## Why entries match by name: the double-apply worked example

`20260707150000_prompt_210f_practitioner_core_additive.sql` was applied
twice (idempotent-safe). The database recorded versions `20260708003638`
and `20260708004716`, neither of which equals the filename stamp
`20260707150000`, and both of which point at the same file. Version stamps
from MCP applies are apply timestamps: they drift from filename stamps and
can even duplicate per file. The manifest therefore carries one entry per
recorded version, and the parity gate joins entries to files by NAME
(an entry matches a file when the entry's name contains the filename stem,
with `<version>_<name>` equality kept as the fallback for CLI-style rows
whose version is the filename stamp).

## The gate

`scripts/schema/check-migration-parity.mjs` runs in CI as the
`migration-parity` job of `.github/workflows/schema-drift.yml`:

    node scripts/schema/check-migration-parity.mjs \
      --manifest docs/integrity/snapshot/applied-manifest.json \
      --migrations supabase/migrations

- Every repo migration stamped at or after the manifest `baseline_stamp`
  (20260707000000) must match a manifest entry, or be younger than the
  7 day grace window (file mtime), which covers migrations committed but
  still awaiting apply sign-off.
- Every post-baseline manifest entry must have a matching repo file;
  orphan entries fail. Entries with version `"pending-verification"` are
  checked like any other post-baseline entry.
- Everything older than `baseline_stamp` is accepted history (the
  documented version-name disjunction: 175 unapplied repo files / 180
  unmatched applied entries) and never fails.

Practical consequence: a migration that merges without being applied and
manifested within the grace window turns CI red with the file named.
Either apply it per the rule above or get its removal signed off; editing
the manifest is a reviewed PR diff either way.

Optional `unapplied_stems` on the same manifest is a reviewed inventory of
filename stems that exist in the repo and were confirmed absent from
`supabase_migrations.schema_migrations`. Those stems are not apply records
and must not be given invented versions. The parity gate accepts them so
post-grace CI stays honest; a listed stem with no repo file fails as
`stale-unapplied-stem`.
