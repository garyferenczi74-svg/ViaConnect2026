# Prompt 226d Wave A — Schema

**Date:** 2026-08-21  
**Status:** Migrations authored + embedded. Apply via `POST /api/cron/apply-226d-migrations`.

## Tables

| Table | Role |
| --- | --- |
| `kb_peptide_routes` | Route-specific evidence; bioavailability requires citation CHECK |
| `kb_goal_domains` | 11 curated goal domains |
| `kb_goal_peptide_links` | Goal-specific grades + indication_match (Jeffery seed starter) |
| `suggestion_sessions` | User briefing history; absolute isolation |

## Isolation set (app CI)

See `src/lib/peptides/absoluteIsolation226d.ts`:
`converter_sessions`, `user_prescribed_peptides`, `practitioner_peptide_protocols`, `hormone_reports`, `suggestion_sessions`, `ultrathink_protocols`.

## Semax / Selank bioavailability

Wave A stores **no** bioavailability_value for Semax/Selank intranasal rows. Status: **UNKNOWN** until a primary citation is attached (Prompt 226d §0.4 / §4.3).

## Next

Wave B matcher API + replace PersonalizedPeptideStack with grade-banded education UI (G28 naming). Lex G35 before production claim of feature complete.
