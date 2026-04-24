# SQL / Supabase migration provenance header

Paste the following block at the very top of any Tier C re-derived `.sql` file, above all DDL and DML.

````sql
-- Pattern adapted from: https://github.com/[owner]/[repo]
-- Original commit SHA: [40-char SHA]
-- Original file path: [path/to/migration.sql]
-- Original license: [SPDX]
-- Date reviewed: [YYYY-MM-DD]
-- Sherlock research artifact: Prompt #[N]
-- Re-derivation: Michelangelo via OBRA under Prompt #[N]
-- Verbatim copy: None (Audit-phase attested)
````

## Filled example

````sql
-- Pattern adapted from: https://github.com/example-org/supabase-rls-recipes
-- Original commit SHA: 8c4f7e1b9d3a6f2c5e8b1d4f7a2c6e9d5b3a8f1e
-- Original file path: recipes/tenant-isolation-rls.sql
-- Original license: Apache-2.0
-- Date reviewed: 2026-04-23
-- Sherlock research artifact: Prompt #134
-- Re-derivation: Michelangelo via OBRA under Prompt #134
-- Verbatim copy: None (Audit-phase attested)

CREATE TABLE IF NOT EXISTS public.example_table (
  -- ViaConnect-idiomatic re-derivation follows...
);
````

## Notes

- Supabase migrations are append-only (Standing Rule #3). The provenance header goes in the new migration file, not in any prior applied migration.
- The provenance header is part of the migration content and applies once along with the DDL.
- Migration filenames retain the ViaConnect timestamp convention (`YYYYMMDDhhmm_description.sql`); the provenance header does not change the filename.
- `Verbatim copy: None (Audit-phase attested)` is required per §5.4 of Prompt #129.
