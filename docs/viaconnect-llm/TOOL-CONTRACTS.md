# TOOL-CONTRACTS — Stage A

OpenAPI-ish, TypeScript-flavored contracts for the allowlisted tool router.  
**SSOT:** tools wrap existing ViaConnect engines. The LLM must not invent doses or interactions.  
**Global rule:** **Refuse if a required tool fails** (5xx, timeout, auth error, malformed payload, or empty-error). Do not hallucinate a substitute.

---

## Shared error shape

```ts
/** Returned to the tool router; assembler maps to user-facing refuse copy. */
export type ToolErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "upstream_timeout"
  | "upstream_5xx"
  | "circuit_open"
  | "malformed_payload"
  | "refuse_required"; // policy: cannot answer without this tool

export interface ToolError {
  ok: false;
  code: ToolErrorCode;
  message: string; // safe for logs; may be shown if already Lex-cleared
  retryable: boolean;
  route?: string;
}

export type ToolResult<T> = { ok: true; data: T; route: string; retrieved_at: string } | ToolError;
```

**Assembler behavior on `ok: false` for a required tool:**

1. Do not answer the factual claim.  
2. Say you cannot verify right now.  
3. Offer retry + ask clinician.  
4. Log tool name, code, route, request id.  
5. Optional FAQ fallback if **provider outage / explicit ops kill** — not the default-off meaning of `LLM_GROUNDED_CHAT_ENABLED=false` (false = **legacy** advisor stream / today’s Claude). See `docs/viaconnect-llm/HIPAA-OPS.md`.

---

## 1. `get_protocol`

### Purpose

Return what ViaConnect **already** has on file for the user (engine / stored protocol). LLM may explain these items only.

**Jeffery lock (2026-09-15):** `allow_generate` defaults **false** for grounded chat MVP. Do not call `generate-protocol` from chat unless Arnold tips an explicit opt-in.

### Map to live routes

| Preference | Route | Notes |
| --- | --- | --- |
| Primary **read** (chat MVP) — **LOCKED** | Jeffery `buildAdvisorContext` / stored `user_protocols` already on the chat request | **SSOT read path.** No new public GET in Stage A MVP. Authenticated thin GET = **DRAFT** only if Jeffery later tips |
| Generate / refresh (opt-in only) | `POST /api/ai/generate-protocol` | Auth user; protocol gate + interaction floor. **Chat MVP: `allow_generate` default false — never silent generate unless Arnold tips** |
| Related | `POST /api/protocol/synthesis` | Practitioner synthesis path — clinician role only when wired |

### Contract

```ts
export interface GetProtocolInput {
  user_id: string; // must match auth subject or assigned patient (clinician)
  /** Chat MVP LOCK (Jeffery): default false. Read stored protocol only. Never silent generate-protocol unless Arnold tips true. */
  allow_generate?: boolean; // default false
}

export interface ProtocolItem {
  productName: string;
  /** Amount string from ENGINE ONLY — never model-authored */
  dosage: string;
  reason: string;
  priority?: string;
  dataSource?: string; // e.g. "caq"
  bucket: "morning" | "afternoon" | "evening" | "asNeeded" | "other";
}

export interface GetProtocolData {
  protocol_name: string;
  source: string; // e.g. "ai_caq"
  tier: 1 | 2 | 3;
  confidenceLabel?: string;
  confidenceScore?: number;
  items: ProtocolItem[];
  blockedProducts: string[];
  interactions_summary?: unknown; // opaque; prefer check_interactions for detail
}

export type GetProtocolResult = ToolResult<GetProtocolData>;
```

### Errors

- `unauthorized` / `forbidden` if patient not assigned.  
- `not_found` if no stored protocol and `allow_generate` false (chat MVP default) — refuse dose/protocol explanation; point user to protocol screen / clinician.  
- `upstream_*` if generate-protocol fails when explicitly allowed → **refuse** dose explanations.

### Refuse-if-fails

Required for UC-C1, UC-C3, UC-C4, UC-P1–P3 whenever the answer mentions "your protocol."

### Arnold nits (2026-09-15) — closed in docs

- **Stored read:** Jeffery advisor context / `user_protocols` on the chat path. No inventing an unauthenticated protocol GET. Thin authenticated GET remains DRAFT.
- **Retatrutide:** injectable-only; never stacked (model must not invent oral/stacking schedules). Restate only engine/tool education fields.

---

## 2. `check_interactions`

### Purpose

Return drug / supplement / herb / recommendation conflicts from the **interaction engine**. LLM restates findings; does not invent new ones.

### Map to live routes

| Preference | Route | Notes |
| --- | --- | --- |
| Primary | `POST /api/ai/check-interactions` | Body: `userId`, `medications`, `supplements`, `recommendations`, `allergies` |
| Cached / evaluate | `GET` or `POST /api/interactions/evaluate` | Different finding shape — **not** a drop-in twin; no blind map into `CheckInteractionsData` |
| Gate | `runProtocolGate` inside generate-protocol | Not called directly by LLM; engine-side |

**Chat path (Stage A wrap):** `check_interactions` is wired in-process on grounded chat (Claude+local+floor assemble + `blockedProducts`; no HTTP loopback). Flag `LLM_GROUNDED_CHAT_ENABLED` stays default **false**. Soft-empty + `error` → `ok:false` refuse.

### Contract

```ts
export interface CheckInteractionsInput {
  stack: string[]; // supplements + protocol products under review
  meds: string[];
  herbs: string[]; // may be merged into stack or allergies per engine
  /** Optional; when set, engine may persist + notify */
  user_id?: string;
  allergies?: string[];
  /** Asked candidate under discussion — never LLM-authored; no dose strings. */
  candidate?: string[];
}

export type InteractionSeverity = "major" | "moderate" | "minor" | "synergistic";

export interface InteractionFinding {
  medication: string;
  interactsWith: string;
  interactionType?: string;
  severity: InteractionSeverity;
  mechanism?: string;
  clinicalEffect?: string;
  onsetTiming?: string;
  mitigation?: string;
  evidenceLevel?: string;
  citations?: string[];
}

export interface CheckInteractionsData {
  interactions: InteractionFinding[];
  summary: { major: number; moderate: number; minor: number; synergistic: number };
  blockedProducts: string[];
}

export type CheckInteractionsResult = ToolResult<CheckInteractionsData>;
```

### Request mapping to live API

```ts
// Tool router → in-process check-interactions assemble (same body as POST /api/ai/check-interactions)
{
  userId: input.user_id,
  medications: input.meds,
  supplements: input.herbs.length ? [...input.stack, ...input.herbs] : input.stack,
  recommendations: input.candidate ?? [], // asked product/peptide under discussion; never LLM-authored
  allergies: input.allergies ?? []
}
```

### Errors

- Empty meds with engine early-return `{ interactions: [] }` is **valid**, not a failure.  
- Claude upstream failure that falls back to local floor is OK if payload validates.  
- Timeout / 5xx with no usable payload → `upstream_*` → **refuse**.
- Soft-empty arrays plus `error` (route/assemble catch) → `ok:false` (`upstream_5xx` / `malformed_payload`), never “no conflicts.”

### Refuse-if-fails

Required for UC-C3, UC-P2, and any stack-safety claim (UC-S3).

**Eval hard fail:** missing a major interaction that the engine returned, or inventing one the engine did not return.

---

### Stage A body mapping lock (Arnold)

Stage A sends protocol products already on file plus any asked peptide/product under discussion into the interaction engine using the live route convention: protocol/stack items go to `supplements` (meds to `medications`); the asked candidate may go in `recommendations` when the engine expects that split. Never LLM-author an extra recommendation list. Herbs stay merged into `supplements` as today. No invented doses in either array.

---

## 3. `lookup_snp`

### Purpose

Educational SNP / gene card + member genotype **as stored**. No diagnosis.

### Map to live routes

| Preference | Route | Notes |
| --- | --- | --- |
| Member variants | `GET /api/genetics/variants` | Hub payload; UNKNOWN / null honest — never fabricate 0 |
| Nutrition genetics | `GET /api/nutrition/genetics/nutrigendx` | NutrigenDX cross-ref |
| Catalog education | GeneXM / PeptideIQ deep report modules (static data) | Via RAG `snp_card` + optional future thin GET |

**Chat path (Stage A wrap):** `lookup_snp` is wired in-process on grounded chat (hub variants + NutrigenDX helpers; no HTTP loopback). Flag `LLM_GROUNDED_CHAT_ENABLED` stays default **false**.

### Contract

```ts
export interface LookupSnpInput {
  rsid: string; // e.g. "rs1801133"
  /** Optional gene symbol assist if rsid unknown */
  gene?: string;
  user_id?: string; // when resolving THIS member's genotype
}

export interface LookupSnpData {
  rsid: string;
  gene: string | null;
  genotype: string | null; // null / unknown if not on file — do not invent
  panel_key?: string | null;
  status?: string | null;
  educational_summary: string; // from snp_card / deep report — edu only
  severity_tier?: string | null; // only if panel allows; PeptideIQ = educational only
  citations: Array<{ cite_id: string; label: string }>;
  loadStatus?: "ok" | "unavailable" | "unauthorized";
}

export type LookupSnpResult = ToolResult<LookupSnpData>;
```

### Errors

- `unauthorized` → return unavailable, do not invent genotype.  
- Unknown rsid → `not_found` with educational catalog miss — do not guess.

### Refuse-if-fails

Required for UC-C2 when answering "my result." Catalog-only plain English without member genotype must say genotype is not on file.

---

## 4. `lookup_peptide`

### Purpose

Peptide catalog / PeptideIQ **education** lookup. No consumer dosing protocols.

### Map to live routes

| Preference | Route | Notes |
| --- | --- | --- |
| Search | `GET /api/peptides/search?q=` | RPC `search_peptides`; may include delivery options from DB — **LLM must not present delivery dose fields as a new prescription**; clinician / converter paths own compute |
| Evidence | `GET /api/kb/peptide-evidence?q=&slug=` | Research Hub / Hannah evidence bundle |
| Listed (route name `prescribed`) | `GET /api/peptides/prescribed` | What is already on the protocol / listed — prefer over inventing; UI copy says "listed" not medical Rx |
| Share handoff | `POST /api/advisor/peptide-share` | Not a lookup; human share flow |

**Chat path (Stage A wrap):** `lookup_peptide` is wired in-process on grounded chat (`search_peptides` + consumer `peptide_education_entries` + optional listed; delivery options always stripped). Flag `LLM_GROUNDED_CHAT_ENABLED` stays default **false**.

### Contract

```ts
export interface LookupPeptideInput {
  name: string; // free text; router normalizes to slug when possible
  slug?: string;
}

export interface LookupPeptideData {
  name: string;
  slug: string | null;
  educational_only: true; // constant for Stage A consumer
  summary: string;
  pathway_tags: string[];
  evidence_record_ids?: string[];
  /** Present only if listed/prescribed endpoint returns rows — not model-authored */
  prescribed?: unknown;
  /** Raw delivery options may exist from search — DO NOT treat as LLM dose advice */
  deliveryOptions_raw?: unknown;
  blocked_topics?: string[]; // e.g. semaglutide adjacency
}

export type LookupPeptideResult = ToolResult<LookupPeptideData>;
```

### Policy

- Semaglutide / excluded GLP-1: treat as blocked topic → escalate / refuse recommend.  
- Consumer: educational layer only (Hannah hard rule #3).  
- Delivery option amounts from DB are **engine data**, not license for the LLM to design a stack.

### Refuse-if-fails

Required for UC-C3 before any peptide-specific claim.

---

### Policy addendum (Arnold) — deliveryOptions_raw display ban

If the peptide tool returns `deliveryOptions_raw` (or similar mcg/mg option arrays), the assembler must strip or redact them before the model sees consumer-facing text, or the system prompt must treat them as display-banned. Never restate raw delivery options as coaching, titration, or a new prescription. Engine data may exist for practitioner tooling elsewhere; Stage A grounded chat does not surface them as doses.

### Retatrutide product lock

Retatrutide = injectable only; never stacked. Model must not invent oral routes or stacking schedules. Restate only Lex/engine education fields from tools.

---

## 5. `get_education` (optional)

### Purpose

Fetch a Lex / Marshall-approved education topic by id (PeptideIQ topics, pathway explainers).

### Map to live routes

| Preference | Route | Notes |
| --- | --- | --- |
| Peptide topics | staged `edu-*` topic ids (e.g. `edu-sermorelin`) + KB | Wire to KB / content tables when unlocked |
| Fallback | RAG `doc_type: education` only | If no route yet, retriever satisfies this tool |

### Contract

```ts
export interface GetEducationInput {
  topic_id: string; // e.g. "edu-sermorelin", "pathway-methylation"
}

export interface GetEducationData {
  topic_id: string;
  title: string;
  audience: "consumer" | "clinician" | "both";
  text: string;
  citations: Array<{ cite_id: string; label: string }>;
  safety_flags: string[];
}

export type GetEducationResult = ToolResult<GetEducationData>;
```

Optional for UC-C1/C2/P3. If missing, RAG education chunks may substitute; still no new doses.

**Chat path (Stage A wrap):** `get_education` is wired in-process on grounded chat (READ consumer `peptide_education_entries` + Lex/FAQ `safety_never_say` fixtures; first RAG slice ≤20 allowlisted ids; no HTTP loopback). Allowlist retriever chunks append cite_id + label into Sources on education success only (deduped vs tool PMIDs/sources; empty → no phantom cites). Research Hub folds approved+active `authorities_sources` as cite-only `auth:…` Sources (≤15; stored label/domain only) plus optional Hounddog URL cites (≤10; title/host only; score≥50 non-GLP; default OFF). cite≠dose; engines remain SSOT. Combined edu+safety+authorities ≤35 — past-cap expand needs a **NEW GATE**. Flag `LLM_GROUNDED_CHAT_ENABLED` stays default **false**.

---

## Tool → use-case matrix

| Use case | get_protocol | check_interactions | lookup_snp | lookup_peptide | get_education |
| --- | --- | --- | --- | --- | --- |
| UC-C1 protocol why | **R** | — | O | — | O |
| UC-C2 SNP plain English | O | — | **R** | — | O |
| UC-C3 peptide + stack | **R** | **R** | — | **R** | O |
| UC-C4 daily coaching | **R** | — | — | — | O |
| UC-P1 clinician note | **R** | O | O | — | O |
| UC-P2 conflicts | **R** | **R** | O | — | — |
| UC-P3 draft education | **R** | — | O | O | O |
| UC-S1 diagnosis refuse | — | — | — | — | safety chunk |
| UC-S2 pregnancy / peds / AE | — | — | — | — | safety chunk |
| UC-S3 tool fail | attempted | attempted | attempted | attempted | FAQ |

**R** = required (refuse if fail). **O** = optional.

---

## Chat entry (not a tool, but the host)

```ts
// POST /api/advisor/chat
{
  message: string;
  role: "consumer" | "practitioner" | "naturopath";
  patientId?: string | null;
}
```

Stage A tool router runs **inside** this request after Jeffery context build and before / during model generation. Do not open an unauthenticated parallel brain.
