# Prompt 225a: Hannah honesty retrieval proof

**Date:** 2026-08-20  
**Commit:** `c5603195`  
**Cron:** `POST /api/cron/prove-225a-hannah-honesty`  
**Artifact:** `docs/peptides/225a-hannah-honesty-result.json`

## Result

| Check | Value |
| --- | --- |
| ok | **true** |
| Probe | What is known about BPC-157 research and human clinical evidence? |
| Matched slug | `edu-bpc157` |
| `PEPTIDE EVIDENCE HONESTY` marker | present |
| `evidence_gap_statement` | present |
| ICTRP `pending_access` disclosure | present |
| Dose leak | **none** |
| Model call | none (context-only prove) |

## Wiring

1. Pre-model refusal matrix unchanged (`detectPeptideRefusal`).
2. After `kbSearch`, ask route calls `buildPeptideHonestyContext`.
3. Honesty block is appended to `kbContextBlock`.
4. When marker present, `generateGroundedAnswer` adds fail-closed peptide evidence rules (no inventing trials; no protocol doses).

## Sample counts (stored, not invented)

BPC-157 educational overview: `trials_registered=0`, `publications_human=1`, `publications_animal=3`, with canonical gap framing and ICTRP incomplete-coverage note.
