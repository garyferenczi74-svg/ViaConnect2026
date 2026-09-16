# HIPAA-OPS — Stage A

**Status:** Ops lock for Lex + compliance review. Aligned to Jeffery flag lock after #226.  
**Principle:** Educational assistant, HIPAA-aware handling of PHI, engines remain SSOT.  
**ViaCura:** draft-only; **human send**.

---

## 1. BAA

| Vendor class | Requirement |
| --- | --- |
| Frontier model API (e.g. Anthropic via existing advisor path) | BAA or equivalent contractual PHI terms before production PHI prompts |
| Embedding / vector host (Pinecone / OpenSearch / cloud PG) | BAA if chunks or queries can contain PHI |
| GPU cloud for future LoRA (RunPod / Lambda / AWS / GCP / Azure) | BAA **before** any fine-tune that could see PHI; prefer de-ID corpus so train sees none |
| Logging / metrics (if PHI fields stored) | BAA + retention limits |

**Rule:** No new vendor in the chat path without BAA checklist signed off by compliance owner.

Existing ViaConnect stack already routes AI through server-side keys (no device-held PHI keys). Keep that.

---

## 2. Logging fields (every grounded answer)

Log structured audit rows (extend advisor telemetry; do not put plaintext PHI in application `safeLog` sinks).

| Field | Description | PHI? |
| --- | --- | --- |
| `request_id` | Correlate stream + tools | No |
| `user_id` / `patient_id` | Auth subject / assigned patient | Yes — store in HIPAA-controlled DB only |
| `role` | consumer \| practitioner \| naturopath | No |
| `prompt` | User message | Yes |
| `chunks` | Retrieved `doc_id` + `version` + `chunk_hash` (not full text if avoidable) | Maybe (ids preferred) |
| `tools` | Tool name, route, ok/code, latency; **tool result summary** (severities, product names) | Often yes |
| `output` | Final assistant text | Yes |
| `feedback` | Thumbs / clinician override / accept-reject | Soft |
| `model_id` | e.g. claude-sonnet-4-6 | No |
| `prompt_version` / `adapter_version` / `kb_version` | Version pins | No |
| `escalation_flags` | pregnancy, pediatric, ae, diagnosis, tool_fail, major_interaction | No |
| `kill_switch_state` | model_online / faq_only | No |

**Retention:** follow existing ultrathink advisor conversation / query log policy; document min necessary.

**App logs:** keep using `safeLog` patterns that avoid plaintext message content in general logs (already a Jeffery telemetry note).

---

## 3. No raw genomes in train

- Fine-tune / eval corpora: **de-identified** instruction pairs only.  
- No VCF, no raw microarray dumps, no identifiable genome files in object storage used for training.  
- Member genotypes for **runtime** answers come from tools (`lookup_snp` / genetics APIs) under RLS — not from training sets.  
- De-ID is a multi-week phase before Stage C; do not start LoRA on production chat logs.

---

## 4. Kill switch

| Switch | Behavior |
| --- | --- |
| `LLM_GROUNDED_CHAT_ENABLED` (**locked name**, Jeffery 2026-09-15) | When **false** → **legacy** advisor stream (today’s Claude path). FAQ-only path = provider outage / explicit ops kill — not the default-off meaning. Must appear in code PRs. |
| Existing compliance kill switches | Keep `FDA_DISCLAIMER_RENDERING_ENABLED`, ED safety mode, etc. |
| Provider outage | Same FAQ path as missing `ANTHROPIC_API_KEY` fallback, Lex-cleared |

**FAQ fallback content (Lex PASS 2026-09-15 — CLEARED; no doses):**

When the model provider is offline or an **explicit ops kill** is set (not the default-off meaning of `LLM_GROUNDED_CHAT_ENABLED=false`), return only this consumer FAQ (and the existing educational disclaimer). `LLM_GROUNDED_CHAT_ENABLED=false` keeps the **legacy** advisor stream (today’s Claude). Do not call the model on the FAQ-only path. Do not invent doses or triage.

1. **Unavailable:** "The ViaConnect assistant is temporarily unavailable. Your protocol and education screens still work."
2. **Where to look:** "Open your protocol in the app to see what is already listed for you. Do not change products or amounts based on this message."
3. **Clinician:** "For personal guidance, contact your ViaConnect clinician or licensed healthcare provider."
4. **Emergency:** "If this is a medical emergency, seek emergency services now. If you are thinking about harming yourself, call or text 988 (US Suicide and Crisis Lifeline) or use local emergency services."
5. **Retry:** "Please try the assistant again later. Educational content only — not a diagnosis or prescription."

Lex: edit wording freely; hold wire until these strings are cleared (PASS / edit). No invented medical FAQ doses.

---

## 5. Educational labeling

- Every consumer answer: educational, not a diagnosis / not a substitute for professional advice (stream disclaimer already enforced).  
- UI chrome: "educational" / Via Cura wellness companion language — Lex owns final strings.  
- Clinician drafts: explicit **DRAFT ONLY — human send required**.

---

## 6. ViaCura draft-only human send

| Allowed | Forbidden |
| --- | --- |
| Draft note / education into clinician UI | Auto-email / auto-push / auto-SMS to patient |
| Clinician edits then sends via existing share flows | Model calling send APIs unsupervised |
| Peptide share initiated by **user** click (`/api/advisor/peptide-share`) | Silent share |

Q1 2027 ViaCura portal uses the **same** rule with stricter review (see quarter plan).

---

## 7. Escalation ops

Triggers (see system prompt): diagnosis/treatment asks, pregnancy, pediatric, serious AE, major interaction, tool failure, Semaglutide adjacency.

Ops:

1. Flag row in audit (`escalation_flags`).  
2. Optional Jeffery bus event for review queues.  
3. Lex spot-check sample weekly during Stage A.  
4. Never clear major interaction via model override.

---

## 8. Access control

- Consumer: own data only.  
- Clinician: assigned patients via `protocol_shares` (already on `/api/advisor/chat`).  
- No public unauthenticated grounded brain.

---

## 9. Lex review checklist

- [x] Educational-not-diagnosis labeling  
- [x] No new doses from LLM  
- [x] Escalate disease / pregnancy / pediatric / AE  
- [x] ViaCura draft-only human send  
- [x] BAA / audit logging fields accepted  
- [x] FAQ kill-switch copy cleared  
