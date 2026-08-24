# Prompt 225a Wave 1: Budget and rate projection

**Date:** 2026-08-20  
**Gates:** G8 API-first, G9 Hannah live browse OFF, G10 ICTRP `pending_access`, G11 NCBI key dual-read + 8 rps bucket  
**Inputs:** `225a-wave1-ctgov-result.json`, `225a-wave1-pubmed-result.json`, Phase 0 Firecrawl ledger sample

---

## 1. What Wave 1 actually spent

| Channel | Transport | Wave 1 volume | Firecrawl credits | Notes |
| --- | --- | --- | --- | --- |
| ClinicalTrials.gov | REST API v2 | ~10 compounds x pageSize 25; 31 trials stored; 10 fail-closed skips | **0** | No scrape. Redaction in-process. |
| PubMed / NCBI | E-utilities | 10 compounds x retmax 4; 40 upsert attempts; 34 unique PMIDs | **0** | Token bucket 8 rps with key. Facts only. |
| ICTRP | Stub | status row only | **0** | `pending_access` until WHO credentials (G10). |
| Firecrawl OA / regulatory | Reserved | not used in Wave 1 evidence crons | **0** (this wave) | Still available for OA full text + regulatory watch only. |

**Wave 1 cash / credit conclusion:** API-first path for registry + PubMed metadata cost **zero Firecrawl credits**. Headroom from Phase 0 (~138 of 200/day default after prior Thanos work) is preserved for OA/regulatory only.

---

## 2. Rate / timeout envelope (observed-safe)

| Resource | Cap used | Envelope for full Collection 14 (~157 peptides) |
| --- | --- | --- |
| NCBI E-utilities | 8 rps with key (2.5 without) | ~157 peptides x 4 PMIDs x ~3 E-util calls ≈ **~1.9k calls** ≈ **~4 minutes** wall at 8 rps if sequential; cron `maxDuration` 120s implies **chunked jobs** (Wave-style batches of 10–25 peptides). |
| CT.gov API v2 | Public, pageSize ≤ 100 | ~157 x 1 search + detail pages; no official hard RPS; stay conservative (≤5 rps) and paginate. Expect multi-cron passes. |
| Vercel cron | Bearer `CRON_SECRET`, `maxDuration` 120 | Honesty refresh, Wave1 CT.gov, Wave1 PubMed each fit Wave 1; full corpus needs scheduled multi-pass. |
| Firecrawl daily | default 200 credits | Project **0** for metadata. Budget OA full-text separately: e.g. 20 PMC-miss OA pages/day ≈ 20–40 credits if scrape cost ~1–2 each (order-of-magnitude). Do not raise ceiling unless OA volume exceeds ~100 credits/day. |

---

## 3. Storage growth projection (Wave 1 → Collection 14)

Wave 1 (10 flagships):

| Table | Wave 1 count | Naive linear to 157 peptides | Caution |
| --- | --- | --- | --- |
| `kb_trials` | 31 | ~480 | Flagships are denser; many educational peptides will be thin (0–2 trials). Honesty layer keeps thin compounds clearly thin. |
| `kb_publications` | 34 | ~530 | Same skew. Retmax/pageSize caps matter more than row count. |
| Evidence links | per ingest | 1:1 with written trials/pubs | Jeffery gate still pending on Wave 1 `kb_items`. |
| `honesty_layer` jsonb | 1 column / peptide | 157 rows refreshed | Cheap; computed from links only. |

Fail-closed dose skips (10 CT.gov in Wave 1) will continue; they reduce stored volume and must never be relaxed.

---

## 4. Honesty layer + Hannah refusal (post-Wave 1)

| Item | Cost | Status |
| --- | --- | --- |
| Migration `20260820151000` honesty_layer | DDL only | Embedded in `apply-225a-migrations` |
| Cron `run-225a-honesty-layer` | DB reads/writes only | No external API |
| NCT protocol dosing refusal | Code path pre-model | Zero ingest cost; eval in peptideRefusals + harness |

Canonical framing retained in honesty output:

> Registration is not completion. Completion is not publication. Publication is not a positive result.

---

## 5. Recommendations

1. Keep CT.gov + PubMed on API-first; never Firecrawl those hosts for metadata.
2. Full corpus: schedule chunked crons (10–25 peptides/pass) under 120s.
3. Leave Firecrawl ceiling at 200/day unless OA full-text + regulatory watch exceeds ~100 credits/day for 3 consecutive days.
4. G10: ICTRP remains disclosure-only until WHO SharePoint/credentials land; do not present global registry completeness.
5. After honesty migration apply: run honesty cron once, confirm `evidence_gap_statement` on linked peptides, then optionally surface in Hannah retrieval (separate prompt).

---

## 6. Gate checklist (Wave 1 close)

| Gate | Wave 1 proof |
| --- | --- |
| G8 API-first | CT.gov + PubMed proofs; Firecrawl credits 0 |
| G9 no live browse | Refusal matrix only; no answer-time crawl |
| G10 ICTRP pending | Status row `pending_access` in CT.gov proof |
| G11 NCBI key | `hasKey: true`, 8 rps bucket in PubMed proof |
| Dose fail-closed | 31/31 and 34/34 `dose_redaction_applied`; 10 CT.gov skips |
| Facts-only pubs | `factsHaveAbstractBody=false` |
| NCT dosing refuse | `trial_protocol_dosing` + ClinicalTrials.gov URL only |
