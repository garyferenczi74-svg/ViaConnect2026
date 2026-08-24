# Prompt 214d: Residual gap closure

**Commit series:** 213a / 214a / 214b / 214c follow-on  
**Date:** 2026-08-12

## Gap 1: Hannah compile authority

| Before | After |
| :----- | :---- |
| Compose stage count stub | Compose calls `compileBatchViaChain` |
| `vercel.json` scheduled `/api/cron/hannah-compile` | Cron entry **removed** |
| Event paths imported `runHannahCompilation` | Event paths import `compileViaChain` |
| Surface counted rows | Surface checks 36h insight freshness |

Sole entry: `src/lib/hannah/compilation/chainEntry.ts`.

## Gap 2: BOS genetics pill

| Before | After |
| :----- | :---- |
| `genetic_profiles` + `genex360_purchases` | **Only** `elysium_upload_coverage` + `elysium_variant_interpretations` |
| Delivered purchase could mark present | Score present only with mapped Elysium interpretations |

Purchase lifecycle messaging remains Jeffery platform digest, not score math.

## Gap 3: /shop/peptides

**Ruling basis:** default per prompt (Gary did not override).  
**Action:** permanent redirects to `/peptide-protocol`; page shells redirect; catalog cards point to education; data retained (no drops).

Lex note: consumer commercial peptide surface retired; educational + practitioner depth remain the lawful framing for platform copy.

## Gap 4: dual registries

Read-only ACC panel + Guard-stage drift check.  
**Recommendation:** ACC `AGENT_REGISTRY` authoritative for seats; `ultrathink_agent_registry` for operational heartbeats; mapping via `resolveAgentId`. **No merge** without Gary ruling.

## Gap 5: practitioner depth

Route: `/practitioner/peptides` (role-gated).  
Consumer pathway: `discuss-with-practitioner-pathway` on `/peptide-protocol` (no depth leakage).  
Migration seed: `20260812060000_prompt_214d_practitioner_depth_seed.sql`.

## Migrations

- `20260812060000_prompt_214d_practitioner_depth_seed.sql`

## Gary ops

1. Apply 214d migration (and any pending 214c).  
2. Confirm first `synchronism-daily` run shows Compose `chain_entry: true` in `pipeline_runs`.  
3. Rule on dual-registry end-state if merge is ever desired.  
