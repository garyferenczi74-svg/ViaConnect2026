# NEXT-OBRA — Michelangelo

**Blueprint:** Stay **DRAFT** for **private grounded consumer chat MVP** — wire RAG + tools into existing `/api/advisor/chat` (Hannah / Jeffery stack).  
**Triple gate CLEARED** (Arnold + Jeffery PASS WITH NITS; Lex PASS). **Undraft** Stay DRAFT #1: retriever interface + refuse stub only.  
**No --prod** until Gary asks.  
**Pause FormaVision / GLB.**  
**Never invent doses.**

Jeffery ack: Stage A on `/api/advisor/chat` (not greenfield). Tip when pack ready for OBRA route + Lex HIPAA/edu review.  
Lex tipped: review `docs/viaconnect-llm/HIPAA-OPS.md` + `docs/viaconnect-llm/SYSTEM-PROMPT.md` when ready.

---

## Gate checklist (block coding until all PASS)

| Gate | Looks at | PASS means |
| --- | --- | --- |
| **Arnold** | Engines SSOT, tool maps, no free-form dosing, genetics/peptide route honesty | **PASS WITH NITS** (2026-09-15) — review `formavision-obra/REVIEW-llm-stage-a-tool-engine.md`; nits folded |
| **Jeffery** | OBRA route into advisor chat, telemetry, role gates | **PASS WITH NITS** (2026-09-15): allow_generate default false; Marshall post-assembler; flag `LLM_GROUNDED_CHAT_ENABLED` named |
| **Lex** | Educational labeling, escalation phrases, ViaCura draft-only, BAA/logging | **PASS** (2026-09-15 re-clear): nits closed; FAQ checklist CLEARED. Soft optional FAQ 988 full name non-blocking. |

After triple PASS → undraft Blueprint → micro-implement PRs (still no --prod until Gary).

---

## Micro-tasks (&lt; 30 min each) — design / prep only until PASS

1. **Diff pack vs Hannah persona** — list any SYSTEM-PROMPT clash with `hannah-persona.ts` hard rules (doc note, no code).  
2. **Annotate tool→route table** in PR description template (copy from `03-tools`).  
3. **Inventory RAG sources** — checklist of files/tables for first 20 chunks (GeneXM deep, PeptideIQ edu topics, interaction floor names, safety never-say).  
4. **Draft kill-switch FAQ** three sentences for Lex (no doses).  
5. **Write E01–E12 fixtures stub JSON** paths under eval (questions only; empty payload slots).  
6. **Confirm BAA vendor list** one-pager (Anthropic path, embeddings host TBD, Supabase).  
7. **OBRA acceptance bullets** for Jeffery: retriever hook point, tool router hook point, assembler refuse path.  
8. **Arnold question list** ≤5: generate-protocol read vs generate in chat; deliveryOptions display ban; NutrigenDX vs variants for `lookup_snp`.  
9. **Lex escalation phrase freeze** — mark which phrases are locked vs tunable.  
10. **Telemetry field gap** — map logging table to existing `ultrathink_advisor_*` columns; note gaps only.  
11. **Safety chunk outline** — 5 `safety_never_say` titles (diagnosis, pregnancy, pediatric, AE, tool-fail).  
12. **Semaglutide / GLP-1 deny example** for eval (question only).  
13. **ViaCura draft banner copy** one line for clinician UI mock (Lex).  
14. **Hybrid search smoke plan** — 3 manual queries (`rs1801133`, `MTHFR+`, `edu-sermorelin`) expected doc_types.  
15. **Rollback note** — DONE: flag `LLM_GROUNDED_CHAT_ENABLED` (false = **legacy** advisor stream / today’s Claude). FAQ-only = provider outage / explicit ops kill — not default-off. Must be in first code PR.  
16. **Clinician gold author ask** — email outline to medical director for 10 seed answers (process only).  
17. **Stage B parking lot** — single paragraph why not hosting 8B this quarter.  
18. **Pack index link** from agent memory / Jeffery tip when gates start.  
19. **No FormaVision touch** verification — grep plan excludes `formavision` paths.  
20. **Post-PASS first PR scope** — “retriever interface + refuse stub only” (&lt;30 min coding once unlocked).

---

## Out of bounds for this OBRA

- Implementing app code before PASS  
- Deploy / --prod  
- Inventing doses, girths, Muscle lbs, medical claims  
- Foundation pretrain shopping as a blocker  
- Auto-send clinician drafts  
- FormaVision / GLB work  

---

## Tip targets when pack is ready

1. **Jeffery** — OBRA route + advisor integration review.  
2. **Lex** — HIPAA-OPS + SYSTEM-PROMPT.  
3. **Arnold** — tool/engine SSOT + no free-form dosing.  
4. **Gary** — summary only after gates or if he asks; Stay DRAFT until then.


---

## Undraft (2026-09-15)

Triple gate clear. First Stay DRAFT PR scope (<=30 min coding):

1. Feature flag `LLM_GROUNDED_CHAT_ENABLED` (default false until Gary --prod).
2. Retriever interface stub + refuse-if-tool-fails assembler hook on `/api/advisor/chat` (no silent generate-protocol).
3. Marshall scan remains post-assembler.
4. Strip / ban `deliveryOptions_raw` before consumer model context.
5. No FormaVision paths. Never invent doses.

Tip Jeffery to route CloudAgent Stay DRAFT after this undraft note.
