# Prompt 213a: Hannah daily insight compilation

**Date:** 2026-08-12  
**Depends on:** Prompt 213 (dedupe/render), Prompt 214a (roster + Marshall/Lex gate)

## Section 4 findings

1. **Prior generation job:** No dedicated daily accelerator compiler existed. Accelerators were fed by `recommendations` + `ultrathink_recommendations` (often single-product duplicates) plus Appendix A seeds. `journey_recommendations` seed on empty was template-only. Hannah research cron (`/api/cron/hannah-research`) is knowledge-atom research, not accelerator composition.
2. **Prompt 213 status:** Live on main (`useEngineAccelerators` dedupe, placeholders, dynamic hubs). Unique product indexes shipped in migration `20260812010000_prompt_213_accelerator_insight_unique.sql` (apply on DB if pending).
3. **Schema:** Extended with `hannah_accelerator_insights`, provenance columns on `journey_recommendations`, Hound Dog staging/gated tables, `hannah_compile_runs` via `20260812030000_prompt_213a_hannah_daily_compilation.sql`.

## Supplier interfaces

```ts
getDailyDigest(userId, sinceTimestamp) => SupplierDigest
// Implemented as:
getGordonDailyDigest | getArnoldDailyDigest | getJefferyDailyDigest
| getSherlockDailyDigest | getHoundDogDailyDigest | getUserInputDailyDigest
```

Hound Dog consumer digests read **only** `hounddog_gated_items` (never raw staging).

## Cron / jobs

| Job | Schedule | Path |
| :---- | :---- | :---- |
| Hannah compile | `30 6 * * *` | `/api/cron/hannah-compile` |
| Synchronism (Jeffery) | `15 6 * * *` | `/api/cron/synchronism-daily` |
| Off-cycle | on demand | `POST /api/hannah/recompile` |
| Scan landing | event | `body/scan/persist` → `runHannahCompilation` |
| Genetics landing | event | `genetics/confirm-variants` → `runHannahCompilation` |

## Hound Dog

- Registry: `hounddog` (214a)
- Staging: `hounddog_staging_items`
- Gate: Marshall content/lexicon + Lex escalation (`evaluateHoundDogGate`)
- Promotion: `hounddog_gated_items`
- Demo ingest: `ingestDemoClinicalStudy` (one working path)

## Migrations

- `20260812030000_prompt_213a_hannah_daily_compilation.sql`
