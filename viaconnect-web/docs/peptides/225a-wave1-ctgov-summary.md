# Prompt 225a Wave 1: ClinicalTrials.gov ingest proof

**Date:** 2026-08-20  
**Cron:** `POST /api/cron/run-225a-wave1-ctgov`  
**Artifact:** `docs/peptides/225a-wave1-ctgov-result.json`

## Result

| Metric | Value |
| --- | --- |
| ok | **true** |
| Compounds matched | 10 / 10 |
| Trials upserted (this run) | 25 |
| `kb_trials` total | 31 |
| All `dose_redaction_applied` | 31 / 31 |
| Query terms seeded | 68 |
| Redaction events | 136 |
| Fail-closed skips (`dose_lexicon_survived`) | 10 (not written) |
| ICTRP | `pending_access` |

## Semaglutide dose redaction proof (NCT05891496)

**Before (raw CT.gov arm text excerpt):**

> Study intervention period 1 Participants will receive either semaglutide or placebo matched to semaglutide once-weekly subcutaneous (s.c.) injections for 12 weeks as an add on therapy to standard of care. Participants initially received 0.2

**After (redacted):**

> Study intervention period 1 Participants will receive either semaglutide or placebo matched to semaglutide [REDACTED] s for 12 weeks as an add on therapy to standard of care. Participants initially [REDACTED] milligram (mg) [REDACTED] and t

Stored `kb_trials` fields are built from redacted intervention **names** and outcome titles only; rows that still fail the lexicon after redaction are skipped (fail-closed).

## Notes

- Transport: ClinicalTrials.gov API v2 REST (no Firecrawl).
- Marshall/Jeffery gate on `kb_items` remains `pending` for Wave 1 rows (not auto-promoted to consumer).
- Next: PubMed facts-only Wave 1 path, honesty-layer fields, Hannah NCT dosing refusal eval.
