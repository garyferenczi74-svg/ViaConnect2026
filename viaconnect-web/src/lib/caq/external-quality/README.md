# CAQ external quality feeds

CAQ compare lane only. Not Hannah RAG. Not grounded Sources.

| Source | PR A | Notes |
| --- | --- | --- |
| Prove It | honesty stub | `unavailable` / `no_public_api` — no public API; do not scrape |
| Suppie | honesty stub | `unavailable` / `no_public_api` — not SUPP.AI (`supp.ai`) |
| MediSearch | refuse shape | flag `CAQ_MEDISEARCH_ENABLED` default **false**; no key → `missing_key`; **no live SSE** (PR B) |

Optional `quality_score` / `consistency` / `bioavailability` stay undefined unless a vendor later returns them. Never invent doses, milligrams, COAs, or bioavailability folds. Engines stay SSOT for protocol doses.

Status / reason are machine enums only — no member-facing unavailable/compare copy in this module.
