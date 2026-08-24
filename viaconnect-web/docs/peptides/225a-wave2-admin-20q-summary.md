# Prompt 225a: Wave 2 + admin tiles + 20Q eval

**Date:** 2026-08-20  
**Commit:** `f6e1f1a1`  
**Deploy:** `www.viaconnectapp.com`

---

## 1. Admin evidence tiles

| Item | Value |
| --- | --- |
| UI | `/admin/peptide-evidence` (admin middleware) |
| Prove cron | `POST /api/cron/prove-225a-peptide-evidence` |
| ok | **true** |
| Tiles sampled | 12 |
| `kb_trials` | **44** |
| `kb_publications` | **56** |
| ICTRP | `pending_access` disclosed |
| Dose leak | none |

Shows honesty gap statements, linked trial/pub counts, and ingest source status. No dose amounts.

---

## 2. Full 20Q peptide eval

Harness: `peptideEvalHarness225.test.ts` (**20/20** mandatory questions).

Coverage: dosing, reconstitution, titration, sourcing (2), minor, pregnancy, Dermorphin, cure, Rx superiority, MTHFR, CYP, WADA myth, stack, non-peptide, NCT protocol dosing (CT.gov URL only), educational allow (BPC / retatrutide / NCT status-only).

Local vitest: **23** related tests passed (20Q + honesty + Wave 2 exclusion + wiring).

---

## 3. Wave 2 chunked ingest

| Cron | Result |
| --- | --- |
| `run-225a-wave2-ctgov?offset=0&limit=10` | ok; **10** matched; **15** trials upserted; `nextOffset=10` |
| `run-225a-wave2-pubmed?offset=0&limit=10` | ok; **10** matched; **22** pubs upserted; `nextOffset=10` |
| `run-225a-honesty-layer` (after) | ok; **19** peptides updated |

Wave 2 excludes Wave 1 flagship slugs. Paginate with `?offset=&limit=` under 120s. Dose redaction + fail-closed lexicon skips remain.

Artifacts:

- `225a-wave2-ctgov-result.json`
- `225a-wave2-pubmed-result.json`
- `225a-admin-peptide-evidence-result.json`

---

## Next pagination (optional)

```
POST /api/cron/run-225a-wave2-ctgov?offset=10&limit=10
POST /api/cron/run-225a-wave2-pubmed?offset=10&limit=10
POST /api/cron/run-225a-honesty-layer
```
