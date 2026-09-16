# REVIEW — ViaConnect LLM Stage A · tool↔engine honesty (Arnold)

**Reviewer:** Arnold (engine-SSOT gate)  
**Scope:** Docs only — no app code review.  
**Date:** 2026-09-15 (America/New_York)  
**Primary paths:**  
- `viaconnect-llm/03-tools/TOOL-CONTRACTS.md`  
- `viaconnect-llm/01-architecture/STAGE-A.md`  
- `viaconnect-llm/00-use-cases/USE-CASES-LOCKED.md`  
**Cross-check skim:** `README.md`, `NEXT-OBRA.md`, `04-prompts/SYSTEM-PROMPT.md`, `05-eval/EVAL-SET-SPEC.md`, `02-rag-schema/DOCUMENT-SCHEMA.md`

---

## Verdict

**PASS WITH NITS**

Engine-SSOT gate may proceed to Jeffery/Lex gates. Docs do **not** invent public endpoints, do **not** authorize LLM-owned doses/interactions, and keep refuse-if-tool-fails mandatory. Residual DRAFT gaps (stored-protocol read path, interaction `recommendations` split, `deliveryOptions_raw` display ban, missing Retatrutide product-lock line) are nits — not SSOT honesty failures. No premature code/impl skipping this gate.

---

## Checklist

| # | Item | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Tool names, inputs, outputs, failure modes match STAGE-A / USE-CASES | **PASS** | Allowlist identical: `get_protocol`, `check_interactions`, `lookup_snp`, `lookup_peptide`, `get_education` — STAGE-A §4 Tool router; TOOL-CONTRACTS §§1–5; UC matrix TOOL-CONTRACTS “Tool → use-case matrix” ↔ USE-CASES UC-C1–C4 / UC-P1–P3 / UC-S3 |
| 2 | Every protocol / interaction / dose claim path goes through tools — no LLM bypass | **PASS** | STAGE-A hard lock + “no free-form dosing” mermaid; USE-CASES rule + UC-C1/C3/C4/P2 success metrics (“zero novel dose strings”, “No stack-safety statement without successful `check_interactions`”); TOOL-CONTRACTS SSOT header; SYSTEM-PROMPT SOURCE OF TRUTH |
| 3 | Failure / unavailable / refuse paths explicit | **PASS** | TOOL-CONTRACTS Shared error shape + assembler 5-step refuse; UC-S3; STAGE-A Gate→Refuse; EVAL hard fails on tool-fail hallucination |
| 4 | Mapping to live ViaConnect surfaces named concretely (or flagged DRAFT gap) | **PASS WITH NITS** | Concrete: `POST /api/ai/generate-protocol`, `POST /api/ai/check-interactions`, `GET|POST /api/interactions/evaluate`, `GET /api/genetics/variants`, `GET /api/nutrition/genetics/nutrigendx`, `GET /api/peptides/search`, `GET /api/kb/peptide-evidence`, host `POST /api/advisor/chat`. **DRAFT gaps flagged below** (stored protocol GET; education topic route) |
| 5 | No invention of roster, girths, Muscle lbs, or free-form dose tables | **PASS** | README / SYSTEM-PROMPT / NEXT-OBRA forbid girths, Muscle lbs, invented doses; USE-CASES / TOOL-CONTRACTS carry engine-only `dosage` strings; pack contains no dose tables or roster invents |
| 6 | Scope stays Stage A docs — no premature code/impl skipping gate | **PASS** | README “documentation only. No app code”; STAGE-A “No implement until Arnold / Jeffery / Lex PASS”; NEXT-OBRA HOLD implement |

### Locks / gates (Arnold enforce)

| Lock | Result | Notes |
| --- | --- | --- |
| LLM explainer only (not prescribing engine) | **PASS** | STAGE-A, USE-CASES, TOOL-CONTRACTS, SYSTEM-PROMPT aligned |
| `get_protocol` + `check_interactions` SSOT; model must not invent protocol/interaction facts | **PASS** | Explicit SSOT + eval hard fails on invent/miss |
| Refuse if tool fails (no silent free-form fill) | **PASS** | Global rule + UC-S3 + assembler short-circuit |
| No free-form dosing | **PASS** | Hard lock everywhere; `ProtocolItem.dosage` “ENGINE ONLY” |
| Honest wire to live engines: generate-protocol / check-interactions / genetics / PeptideIQ | **PASS WITH NITS** | Named routes match README alignment table; see nits on read path + recommendations mapping |
| Never invent doses / girths / Muscle lbs | **PASS** | Forbidden in prompt + README; not present in contracts |
| Pause FormaVision / GLB | **PASS** | STAGE-A Out of scope; USE-CASES lock note 3; README / NEXT-OBRA |
| Educational coaching; Semaglutide none; Retatrutide injectable-only never stacked | **PASS WITH NITS** | Semaglutide / excluded GLP-1 blocked consistently. **Retatrutide rule not stated** anywhere in pack (absence ≠ contradiction; product-lock gap) |

---

## Nits (non-blocking; fix before / with first wire PR)

1. **`get_protocol` stored-read SSOT path is DRAFT-ambiguous**  
   TOOL-CONTRACTS §1 maps “Read current” to “Supabase `user_protocols` via advisor context / **future thin GET**” and warns not to invent an unauthenticated route. README alignment table says “plus `GET` of stored `user_protocols`” as if a GET already exists.  
   **Ask (from NEXT-OBRA #8):** Stage A chat path = Jeffery-context read only vs authenticated thin GET — pick one and label the other DRAFT. Default `allow_generate: false` is correct for explainer-only chat; keep generate-protocol for explicit refresh / engine jobs, not casual Q&A.

2. **`check_interactions` live body mapping underspecifies `recommendations`**  
   TOOL-CONTRACTS “Request mapping” sets `recommendations: []` with “or split stack vs recommendations explicitly.” Herbs merge into `supplements` is documented; recommendation vs protocol-product split is not locked.  
   **Fix:** One sentence: Stage A sends protocol products + asked peptide as `supplements`/`recommendations` per existing engine convention; no LLM-authored extra list.

3. **`lookup_peptide.deliveryOptions_raw` residual leak**  
   Contract correctly marks delivery options as engine data / not LLM dose advice, and policy bans presenting them as a new prescription. Assembler / SYSTEM-PROMPT should add an explicit **display ban** (or strip field before model) so raw mcg/mg strings cannot be restated as coaching. Already on NEXT-OBRA Arnold question list — close it in docs.

4. **Retatrutide product lock missing**  
   Pack locks Semaglutide / excluded GLP-1 and generic “no stacking schedules” from the model. It does **not** state “Retatrutide = injectable only; never stacked.” Docs do not contradict that rule; they omit it.  
   **Fix:** One lock-note line under USE-CASES + TOOL-CONTRACTS `lookup_peptide` Policy + SYSTEM-PROMPT HARD FORBIDDEN if product policy requires it.

5. **Optional education / SNP catalog “future thin GET”**  
   Honest DRAFT labeling is good. Ensure RAG substitution for `get_education` / catalog `snp_card` never backfills doses (already stated; keep in assembler acceptance bullets for Jeffery).

---

## Blockers

**None** for the engine-SSOT / tool↔engine honesty gate.

Would become blockers if unresolved *and* implemented as:

- Chat calling generate-protocol by default to “answer” dose questions (`allow_generate` flipped without role gate).  
- Surfacing `deliveryOptions_raw` as consumer dosing advice.  
- Inventing a public unauthenticated protocol GET.  
- Answering UC-C3 / UC-P2 / UC-S3 without successful required tools.

---

## Evidence (file + section)

| Claim | Where |
| --- | --- |
| Tools wrap engines; refuse if required tool fails | TOOL-CONTRACTS header; Shared error shape; Assembler behavior on `ok: false` |
| `get_protocol` → `POST /api/ai/generate-protocol` + stored `user_protocols` | TOOL-CONTRACTS §1 Map to live routes; STAGE-A Engines subgraph |
| `check_interactions` → `POST /api/ai/check-interactions` (+ evaluate) | TOOL-CONTRACTS §2; STAGE-A Engines |
| Genetics / PeptideIQ named | TOOL-CONTRACTS §§3–4; STAGE-A Engines; README Existing API alignment |
| UC required-tool matrix matches contracts | TOOL-CONTRACTS Tool → use-case matrix; USE-CASES UC-C1–C4, UC-P1–P3, UC-S3 |
| No free-form dosing / invent path forbidden | STAGE-A “Explicit: no free-form dosing” mermaid; USE-CASES Rule + success metrics |
| FormaVision / GLB out of scope | STAGE-A Out of scope; USE-CASES Lock notes §3 |
| Semaglutide / GLP-1 out of recommendations | USE-CASES Lock notes §1 + UC-C3 escalate-if; TOOL-CONTRACTS §4 Policy; SYSTEM-PROMPT HARD FORBIDDEN |
| Docs-only / HOLD implement | README Status; STAGE-A Status; NEXT-OBRA HOLD |
| Eval reinforces honesty | EVAL-SET-SPEC Hard fails + E04/E12 seeds |

---

## Top 3 findings (for parent relay)

1. **SSOT + refuse-if-fail are locked and consistent** across TOOL-CONTRACTS, STAGE-A, and USE-CASES — LLM is explainer only; protocol/interaction facts must come from tools.  
2. **Live engine maps are honest** (generate-protocol, check-interactions, genetics variants / NutrigenDX, peptides search + PeptideIQ evidence) — no invented public chat brain.  
3. **Nits only:** clarify stored-protocol read path, lock interaction `recommendations` mapping, harden `deliveryOptions_raw` display ban, add Retatrutide injectable-only/never-stacked if product policy requires — none block this gate.

---

*End Arnold review. Coding remains HOLD until Jeffery + Lex also PASS.*
