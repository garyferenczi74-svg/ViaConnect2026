/**
 * Stage A grounded-chat tool result shapes.
 * Mirrors docs/viaconnect-llm/TOOL-CONTRACTS.md. No `any`.
 *
 * Locks:
 * - LLM explains engine payloads only. Never invent doses, genotypes, girths, Muscle lbs.
 * - allow_generate defaults false. Chat must not call generate-protocol.
 * - deliveryOptions_raw is display-banned before model context.
 * - Retatrutide = injectable-only, never stacked (educational restatement only).
 * - Semaglutide / excluded GLP-1 are blocked topics.
 * - FormaVision / GLB are out of scope.
 */

export type ToolErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "upstream_timeout"
  | "upstream_5xx"
  | "circuit_open"
  | "malformed_payload"
  | "refuse_required"
  | "not_implemented";

export interface ToolError {
  ok: false;
  code: ToolErrorCode;
  message: string;
  retryable: boolean;
  route?: string;
}

export type ToolResult<T> =
  | { ok: true; data: T; route: string; retrieved_at: string }
  | ToolError;

export type GroundedToolName =
  | "get_protocol"
  | "check_interactions"
  | "lookup_snp"
  | "lookup_peptide"
  | "get_education";

export type AdvisorChatRole = "consumer" | "practitioner" | "naturopath";

export type ProtocolBucket = "morning" | "afternoon" | "evening" | "asNeeded" | "other";

export interface GetProtocolInput {
  user_id: string;
  /** Chat MVP LOCK: default false. Read stored / advisor-context protocol only. */
  allow_generate?: boolean;
}

export interface ProtocolItem {
  productName: string;
  /** Amount string from ENGINE / stored payload ONLY — never model-authored. */
  dosage: string;
  reason: string;
  priority?: string;
  dataSource?: string;
  bucket: ProtocolBucket;
}

export interface GetProtocolData {
  protocol_name: string;
  source: string;
  tier: 1 | 2 | 3;
  confidenceLabel?: string;
  confidenceScore?: number;
  items: ProtocolItem[];
  blockedProducts: string[];
  interactions_summary?: unknown;
}

export type GetProtocolResult = ToolResult<GetProtocolData>;

export interface CheckInteractionsInput {
  stack: string[];
  meds: string[];
  herbs: string[];
  user_id?: string;
  allergies?: string[];
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

export interface LookupSnpInput {
  rsid: string;
  gene?: string;
  user_id?: string;
}

export interface LookupSnpData {
  rsid: string;
  gene: string | null;
  genotype: string | null;
  panel_key?: string | null;
  status?: string | null;
  educational_summary: string;
  severity_tier?: string | null;
  citations: Array<{ cite_id: string; label: string }>;
  loadStatus?: "ok" | "unavailable" | "unauthorized";
}

export type LookupSnpResult = ToolResult<LookupSnpData>;

export interface LookupPeptideInput {
  name: string;
  slug?: string;
}

export interface LookupPeptideData {
  name: string;
  slug: string | null;
  educational_only: true;
  summary: string;
  pathway_tags: string[];
  evidence_record_ids?: string[];
  prescribed?: unknown;
  deliveryOptions_raw?: unknown;
  blocked_topics?: string[];
}

export type LookupPeptideResult = ToolResult<LookupPeptideData>;

export interface GetEducationInput {
  topic_id: string;
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

/** Stored `user_protocols.protocol_data` plus row metadata, when the caller already has it. */
export interface StoredProtocolPayload {
  protocol_name?: string;
  source?: string;
  tier?: 1 | 2 | 3;
  confidenceLabel?: string;
  confidenceScore?: number;
  morning?: unknown;
  afternoon?: unknown;
  evening?: unknown;
  asNeeded?: unknown;
  other?: unknown;
  items?: unknown;
  blockedProducts?: unknown;
  interactions?: unknown;
}

export interface GroundedToolContext {
  userId: string;
  role: AdvisorChatRole;
  advisorContextVariables?: Record<string, string>;
  storedProtocol?: StoredProtocolPayload | null;
  requestId: string;
}

export interface RetrieverQuery {
  message: string;
  role: AdvisorChatRole;
  userId: string;
}

export type RetrieverDocType =
  | "snp_card"
  | "education"
  | "safety_never_say"
  | "peptide_edu"
  | "product_sku"
  | "unknown";

export interface RetrieverChunk {
  chunk_id: string;
  cite_id: string;
  doc_type: RetrieverDocType;
  text: string;
  audience: "consumer" | "clinician" | "both";
}

export interface RetrieverResult {
  chunks: RetrieverChunk[];
  index_version: string | null;
}

export type GroundedTurnKind = "legacy" | "static";

export interface GroundedTurnLegacy {
  kind: "legacy";
}

export interface GroundedTurnStatic {
  kind: "static";
  reason: "tool_refuse" | "safety_faq" | "assembled_from_tools";
  text: string;
  requiredTools: GroundedToolName[];
}

export type GroundedTurn = GroundedTurnLegacy | GroundedTurnStatic;
