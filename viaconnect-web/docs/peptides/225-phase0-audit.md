# Prompt 225 Phase 0: Peptide Education Forensic Audit

Date: 2026-08-20. Repo: `ViaConnect2026-main/viaconnect-web`.  
Blocking read. No schema or seed writes in this artifact.

Git author for subsequent commits: `Gary Ferenczi <garyferenczi74@gmail.com>`.

## Gary decision gates (defaults applied)

Interactive gate form declined; Section 0.3 defaults used:

| ID | Ruling |
| --- | --- |
| G1 | Retire `/shop/peptides` commercial surface completely |
| G2 | Ship Restricted / Excluded tiers as specified |
| G3 | No-dose ceiling applies to consumer and practitioner depth |
| G4 | Via Cura adjacency ships this build; Marshall-gated; practitioner only |
| G5 | Jurisdictions: US, Canada, EU, UK, Australia |
| G6 | Surface WADA on consumer tier |
| G7 | Every regulatory field edit requires Jeffery review |

## 1.1 Where data lives

| Store | Location | Notes |
| --- | --- | --- |
| Static portfolio TS | `src/config/peptide-database/*` | Consumer catalog source of truth via `PeptideCatalogSection` ("no Supabase query") |
| Thanos education table | `public.peptide_education_entries` | 214c/214d; shallow edu + practitioner depth |
| Legacy SQL portfolio | `peptide_registry`, `peptide_delivery_options`, `peptide_categories`, `peptide_interaction_matrix`, `user_peptide_prescriptions` | 20260401 era |
| Regulatory class table | `regulatory_peptide_classifications` | Prompt 113 |
| KB collection only | `kb_collections.slug = peptide_education` | Exists; **no typed `kb_peptides`** |
| KB bridge | `src/lib/kb/bridgePeptideEducation.ts` | Maps edu rows to `kb_items` as `education_entry` |
| Engines / plugins | `src/lib/ultrathink/peptide*`, `src/plugins/peptides/dose.ts` | Protocol generation |
| MDX monographs | nothing exists | |

## 1.2 Counts and lists

### Static `PEPTIDE_REGISTRY`

- **50** entries, **187** dosing-form SKU slots (`REGISTRY_STATS`).
- Duplicate id `pinealon` appears twice in the exported name list.
- Snapshot: `data/snapshots/peptides-225-2026-08-20T06-22-31-433Z.json`

Ids: epitalon, vesugen, bronchogen, adrenopeptide, hpa-balance, stressshield, recoverypulse, mitopeptide, energycore, coq10-peptide, atp-regen, slu-pp-332, immuneguard, regenbpc, tb500-oral, antiinflam, vilon, pinealon, neuroshield, cerebropeptide, moodlift, ovapeptide, thyroreg, progestobalance, endoharmonize, gutrepair, detoxpeptide, histaminebalance, retatrutide, sermorelin, ppw-pro-pro-trp, pinealon, chonluten, aod-9604, semax, selank, ghk-cu-injectable, ipamorelin-standalone, cjc-1295-no-dac, pt-141-bremelanotide, tesofensine, cerebrolysin, kpv-tripeptide, thymosin-alpha-1, fr-alpha-binding-peptides, cdk5-blocking-peptides, dihexa, melanotan-2, 5-amino-1mq, mots-c.

### `peptide_education_entries` migration seeds (6)

`edu-bpc157`, `edu-epitalon`, `edu-ss31`, `edu-tesofensine-pause`, `depth-bpc157-framework`, `depth-ss31-framework`.

Live production row count: **not queried in this audit**. Must be exported before Phase 9 parity close.

## 1.3 De facto schemas

See plan / snapshot. Static `PeptideProduct` includes `dosingForms[].protocol`, `cycleProtocol`, `priceRange`. Education table is shallow text fields plus `is_practitioner_depth`.

## 1.4 KB spine

Collection `peptide_education` exists. Typed Collection 14 `kb_peptides` **does not**. Bridge promotes thin `education_entry` items. Template for 225: `kb_hormones` / `20260820000019_prompt_221b_hormone_education.sql`.

## 1.5 Surfaces

| Route / component | Source |
| --- | --- |
| `/peptide-protocol` | Static `ALL_CATEGORIES` |
| `/shop/peptides`, `/shop/peptides/[slug]` | Redirect to `/peptide-protocol` |
| `/practitioner/peptides` | `peptide_education_entries` (admin client); server practitioner gate |
| APIs peptide-search, ultrathink peptide-stack, peptide-share | Engines / shares |
| `ThanosPanel` | Admin ops |

## 1.6 Hannah

Thin KB items may be searchable via bridge. Full monograph RAG and 221 citation contract for Collection 14 **not established**. Phase 8 work.

## 1.7 Thanos ingest (219l)

Code: `src/lib/thanos/allowlistIngest.ts`. Cursor key `thanos_allowlist` in soak checkpoints. Ops tick showed peptide bridge of 6 rows. **Live `pipeline_runs` / staging dump still required** before claiming ingest health. Dashboard state is not evidence.

## 1.8 Shop peptides

Route files remain as redirects only. Static registry still carries `priceRange`. G1: full commercial retirement + CI commerce-join ban.

## 1.9 Dose audit (explicit report to Gary)

**Dose, reconstitution, cycle, and titration content exists today.** It must be removed in Phase 7, not quietly deleted without this record.

| Location | Finding |
| --- | --- |
| `categories-1-3.ts`, `categories-4-6.ts`, `categories-7-8.ts` | Numeric protocols (`mcg`, `mg`, BAC water, syringe units, titration ladders) |
| `peptides-54b.ts` | Intranasal mcg ranges, IV ml protocols, subcutaneous mg |
| `delivery-forms.ts` | `effectiveDoseFrom100mcg`, bacteriostatic reconstitution copy |
| `CyclingProtocolCard.tsx` | **Renders** `item.dosage` and `item.frequency` |
| `PeptidePractitionerAccess.tsx` | "adjust dosing" copy |
| `plugins/peptides/dose.ts` | Dose plugin module |

`PeptideCatalogCard` shows form labels only, but dose strings remain in the client-imported registry.

## 1.10 Claim audit (sample)

Structure/function violations in static copy include "treatment", "reversed heart failure", "gut healing", "wound healing", "reversed cognitive deficits in animal models of Alzheimer's". Full CI lexicon in Phase 7.

## 1.11 Tier gate

Practitioner page: **server-side** fail-closed. Consumer catalog: **static TS**, bypasses education-table RLS. **P0** for Collection 14: server-gated `consumer_safe` only.

## 1.2 Honest architecture verdict

**Presentation layer over a static commercial portfolio TypeScript registry, plus a thin Thanos education table (~6 seeded rows) and a KB bridge.** Not yet a working Collection 14 typed monograph, regulatory matrix, or RAG system.

## 1.3 Snapshot

Committed snapshot path:

`data/snapshots/peptides-225-2026-08-20T06-22-31-433Z.json`

Every prior compound carried forward must map to this snapshot in the Phase 9 parity log.

## Wave 1 and Wave 2 apply proof (production)

Applied via `POST /api/cron/apply-225-migrations` on 2026-08-20 against production Postgres.

Artifact: `tmp/apply-225-result.json`

| Check | Result |
| --- | --- |
| Schema migration | ok |
| KEEP seed migration | ok |
| Tables present | kb_peptides, kb_peptide_synonyms, kb_peptide_stacks, kb_peptide_snp_links, kb_peptide_regulatory_events |
| Dose CHECK rejects `{"dose":"1mg"}` | true (`kb_peptides_practitioner_depth_no_dose`) |
| `kb_peptides` row count | 55 (49 unique static KEEP + 6 education seeds) |
| Collection | peptide_education / thanos / lex_lane / planned |
| consumer_safe | all false until Marshall |

Parity log: `docs/peptides/225-parity-log-wave2.json`
