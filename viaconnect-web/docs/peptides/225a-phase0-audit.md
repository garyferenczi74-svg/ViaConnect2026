# Prompt 225a Phase 0 Audit

**Date:** 2026-08-20  
**Gates locked:** G8-G14 defaults confirmed by Gary (API-first; Hannah live browse OFF; ICTRP stub `pending_access`; NCBI key yes; arm counts OK; downgrade auto / upgrade via Jeffery; Wave 1 as specified).  
**Mode:** read-only audit. No schema writes in this document.

---

## 1. Collection 14 / Prompt 225 prerequisite

| Check | Result |
| --- | --- |
| `kb_peptides` present | **PASS** |
| Row count | **157** |
| `consumer_safe` educational | **112** |
| Related tables | `kb_peptide_synonyms`, `kb_peptide_stacks`, `kb_peptide_snp_links`, `kb_peptide_regulatory_events` |
| Dose CHECK | Still rejects practitioner_depth dose keys (225 Wave 9 proof) |
| Collection | `peptide_education` / owning_agent `thanos` / status `live` |

**Verdict:** 225 Phase 1 is landed. Evidence attachment can proceed.

---

## 2. Existing 214b PubMed path

| Property | Finding |
| --- | --- |
| Transport | NCBI E-utilities (`esearch` / `esummary` / `efetch`) in `src/lib/hounddog/ingest/pubmed.ts` |
| Orchestration | `runDailyIngest` -> `runPubMedTopicDiscovery`; ops job / synchronism chain |
| Storage | `hounddog_staging_items` (`source_type=clinical_study`), upsert on `source_url` |
| Peptide topics (live cursors) | `peptide-bpc157`, `peptide-epitalon`, `peptide-ghk-cu`, `peptide-ss31`, `peptide-thymosin` (cursor_date 2026-08-20, last_run_status `empty`, last_new_items 0) |
| Full text | Optional Firecrawl scrape of PMC PMID URL |
| `tool` / `email` params | **MISSING** on E-utilities requests (NCBI requirement for 225a) |
| Shared token bucket | **ABSENT**; per-call `sleep` only (unsafe under parallel workers) |
| 221 citation contract | Staging stores **raw abstract text** in `summary`. That conflicts with 225a Section 6 (facts-only paraphrase) and Section 5 (dose redaction before storage). |
| `kb_studies` / `kb_publications` write | **Not written today.** PubMed path stops at Hound Dog staging. |

**Real evidence (not dashboard):** discovery_cursors rows for pubmed peptide topics exist and advance dates; recent peptide topic runs reported `empty` (0 new). Firecrawl/Thanos `pipeline_runs` and ledger dumps from Prompt 225 Phase 9 remain separate from this PubMed path.

---

## 3. Firecrawl budget / headroom

| Property | Value |
| --- | --- |
| Default ceiling | `FIRECRAWL_MAX_CREDITS_PER_DAY` default **200**; `FIRECRAWL_MAX_PAGES_PER_RUN` default **25** |
| Env key | Present as `firecrawl_api_key` (client also accepts `FIRECRAWL_API_KEY`) |
| Recent ledger sample | 15 `thanos_peptide` ledger rows; recent credits sum observed ~**62** in last dump window |
| Estimated headroom | On a default 200/day ceiling: roughly **~138 credits** remaining in a quiet day after recent Thanos proves (order-of-magnitude; not a billing API reading) |
| 225a scope | Firecrawl **only** for OA publisher full text not in PMC + regulatory watch pages. Not CT.gov / PubMed metadata / ICTRP. |

---

## 4. `authorities_sources` / allowlist

| Host / domain | Status |
| --- | --- |
| `clinicaltrials.gov` | Seeded approved (214c) + fallback allowlist |
| `pubmed.ncbi.nlm.nih.gov` / `ncbi.nlm.nih.gov` | Seeded approved + fallback |
| `www.who.int` / `who.int` | Seeded approved + fallback |
| `trialsearch.who.int` | **NOT explicitly listed, but currently ALLOWED** because allowlist matching permits subdomains of `who.int` (`isHostAllowlisted` endsWith `.who.int`) |

**Required before any ICTRP-adjacent crawl code:** explicit denylist / block of `trialsearch.who.int` with explanatory note (225a Section 2.2). Do not leave subdomain inheritance open.

Missing for clarity (add in Phase 1 allowlist migration, not silent):

- `clinicaltrials.gov` already present (keep)
- Explicit ICTRP block row or deny rule for `trialsearch.who.int`
- Optional: `eutils.ncbi.nlm.nih.gov` is API not crawl; no Firecrawl allowlist need

---

## 5. NCBI API key

| Check | Result |
| --- | --- |
| Present in local Vercel env probe | **Yes** as `NCBI_API_Key` |
| Code reads | `process.env.NCBI_API_KEY` only |
| Risk | **Case mismatch.** Vercel/Linux is case-sensitive. Production may be running the **3 rps unauthenticated tier** despite a key existing under `NCBI_API_Key`. |
| Fix (Phase 1) | Read `NCBI_API_KEY` **or** `NCBI_API_Key`; prefer documenting canonical `NCBI_API_KEY` in Vercel. G11: keep / register for 10 rps. |

---

## 6. Clinical Trials / PubMed MCP connectors

| Connector | Server runtime reachability |
| --- | --- |
| ClinicalTrials.gov MCP | **Not present** among connected MCP servers in this agent environment |
| PubMed / NCBI MCP | **Not present** as a dedicated NCBI connector (Firecrawl research categories are not a substitute for E-utilities structured fields) |

**Ruling:** Direct REST is the transport (G8). MCP is not a viable production path for CT.gov or PubMed metadata in this stack today.

---

## 7. `kb_studies` schema (221) vs `kb_publications` need

Existing `kb_studies` (221):

- Spine: `item_id` -> `kb_items`
- Fields: `pmid`, `doi`, `study_type` (RCT/meta/...), `population_n`, `intervention`, `comparator`, `outcomes_summary`, `effect_direction`, bioavailability flags, `publication_date`, `journal`, `full_text_available`

**Gaps vs 225a `kb_publications`:**

- No `pmcid`, `publication_types[]`, `mesh_terms[]`, human/animal/in_vitro booleans, `linked_nct_ids[]`, `full_text_access` enum, `facts_extracted`, `dose_redaction_applied`, `extraction_confidence`

**Recommendation:** create sibling **`kb_publications`** for peptide-domain evidence (225a fields + dose redaction audit), cross-link to `kb_studies` / `kb_items` where a PMID already exists. Do not overload `kb_studies.intervention` with dose-bearing free text. Also create `kb_trials`, `kb_peptide_evidence_links`, `kb_evidence_query_terms`, `kb_ingest_source_status` as specified.

---

## 8. Honest architecture verdict (219l standard)

**What exists today**

- Collection 14 monographs (`kb_peptides`) with Marshall consumer_safe gating and no-dose CHECK.
- Thanos allowlist ingest + Firecrawl search/scrape for peptide education staging (now `ingestHealthy` after 225 Phase 9).
- PubMed E-utilities discovery into Hound Dog staging for general + some peptide topics.
- ClinicalTrials.gov is allowlisted but **has no dedicated ingest client**.
- ICTRP has **no credentials** and must ship `pending_access`.

**What 225a must add**

1. CT.gov v2 REST client + discovery cursors + `kb_trials` with mandatory dose redaction before write.
2. PubMed path upgrade: tool/email, shared token bucket, NCBI key casing, facts-only extraction (stop storing abstract bodies), dose redaction, write into `kb_publications` + evidence links (not only staging).
3. ICTRP stub + source_status honesty + **hard block** of `trialsearch.who.int` on the crawl allowlist.
4. Evidence grading with auto-downgrade / Jeffery-held upgrades.
5. Honesty layer fields and Hannah coverage disclosure.

**What we will not do**

- Firecrawl scrape of ClinicalTrials.gov or PubMed metadata.
- Firecrawl scrape of `trialsearch.who.int`.
- Hannah unbounded live web browse at answer time (G9 off).
- Store dose values from trial arms or abstracts.
- Present ICTRP as live before WHO credentials exist (G10 Gary action).

**Go / no-go:** **GO for Phase 1 schema + CT.gov/PubMed clients + ICTRP stub.** Blocker only for Source B live ingest (WHO access request).

---

## Gary action items (non-code)

1. **G10:** Email `ictrpinfo@who.int` / submit SharePoint bulk-access + crawling interest survey under FarmCeutica Wellness Ltd.
2. Confirm Vercel env canonicalizes `NCBI_API_KEY` (or accept dual-read fix).
3. Optional: raise Firecrawl daily credit ceiling only if Wave 1 OA full-text volume requires it after projection.
