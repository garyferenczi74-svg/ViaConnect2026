# Prompt 225a Wave 1: PubMed facts-only ingest proof

**Date:** 2026-08-20  
**Cron:** `POST /api/cron/run-225a-wave1-pubmed`  
**Artifact:** `docs/peptides/225a-wave1-pubmed-result.json`

## Result

| Metric | Value |
| --- | --- |
| ok | **true** |
| Compounds matched | **10 / 10** |
| Publications upserted (this run) | 40 |
| `kb_publications` total | **34** (unique PMIDs) |
| All `dose_redaction_applied` | 34 / 34 |
| Abstract body stored | **false** (`factsHaveAbstractBody=false`) |
| Near-copy rejects | 0 |
| Dose skips | 0 |
| NCBI key present | **true** (8 rps bucket) |
| Shared token bucket | in use |

## Facts contract

Sample `facts_extracted` keys only:

`design`, `model`, `indication_hint`, `outcome_hint`, `linked_nct_ids`, `publication_types`, `is_human`, `is_animal`, `is_in_vitro`, `note`, `redaction_count`

`abstract_available=true` means an abstract was seen during extraction; the abstract text is **not** persisted.

## Notes

- E-utilities primary path with `tool` + `email` + API key.
- Firecrawl not used for metadata.
- ICTRP still `pending_access` (G10).
- Next: honesty-layer fields, Hannah NCT dosing refusal, Wave 1 budget projection.
