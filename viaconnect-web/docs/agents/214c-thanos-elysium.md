# Prompt 214c: Thanos + Elysium

**Date:** 2026-08-12  
**Roster:** 13 agents (was 11)

## New agents

| Agent | Role | Reports to | Tables owned |
| :---- | :--- | :--------- | :----------- |
| Thanos | Peptide Education | Jeffery | `peptide_education_entries` |
| Elysium | My Genetics | Jeffery | `elysium_variant_interpretations`, `elysium_upload_coverage`, IGSR consumption |

## Arnold to Elysium genetics handoff mapping

| Prior path | New owner | Notes |
| :--------- | :-------- | :---- |
| `getArnoldGenomicsContextDigest` | Elysium | Deprecated wrapper re-exports `getElysiumDailyDigest` |
| `genomics_reference_releases` / `genomics_panel_allele_freq` write on ingest | Elysium daily run | Hound Dog `includeGenomes: false` from chain |
| My Genetics hub presentation | Elysium | Existing `/genetics/*` surfaces; interpretations via Elysium catalog |
| Arnold biology composition / FormaVision | Arnold | Unchanged; genetics via digest only |
| Gordon meal scoring | Gordon | Unchanged; nutrition genetics education via Elysium digest only |

## Allowlist seed (Science & Authorities)

PubMed, NCBI, FDA, NIH, WHO, IGSR, NHGRI, ClinicalTrials.gov, Nature, NEJM, JAMA, Lancet, Frontiers, OUP, ScienceDirect, Cell, SNPedia, MedlinePlus, EFSA, NIH ODS, A4M, IPS, U Toronto, Tufts.

Managed: Admin Agents tab → Science & Authorities allowlist.

## Migration

- `20260812050000_prompt_214c_thanos_elysium.sql`

## Chain wiring

- Stage 1 ingest: Hound Dog + Thanos allowlist + Elysium allowlist/IGSR
- Stage 4 domain_refresh: Gordon, Arnold, Thanos, Elysium digests
- Hannah compile: `ALL_DIGEST_FNS` includes Thanos + Elysium

## Compliance

- Peptides: educational / practitioner guidance only; no shop purchase paths
- Tesofensine: regulatory-timing pause entry
- Genetics: UNKNOWN never 0; upload coverage RLS owner-only
- Firecrawl: REST only, shared budgets

## Gary ops

1. Apply migration on nnhkcufyqjojdbvdrpky  
2. Confirm FIRECRAWL_API_KEY set  
3. Approve any proposed allowlist domains  
4. First chain run for pipeline_runs evidence  
