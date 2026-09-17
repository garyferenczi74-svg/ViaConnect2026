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
  /**
   * Flag-gated next-order rows. Omitted unless PROTOCOL_NEXT_ORDER_ENABLED
   * and/or GENEX360_NEXT_ORDER_ENABLED and/or LABS_NEXT_ORDER_ENABLED
   * (all default false).
   */
  protocol_entries?: import("@/lib/caq/protocol-next-order/types").ProtocolNextOrderEntry[];
}

export type GetProtocolResult = ToolResult<GetProtocolData>;

export interface CheckInteractionsInput {
  stack: string[];
  meds: string[];
  herbs: string[];
  user_id?: string;
  allergies?: string[];
  /** Asked product/peptide under discussion — never LLM-authored; no dose strings. */
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
  entry_key?: string | null;
  /** false for labeled non-peptides; never teach those as peptides. */
  is_peptide?: boolean;
  /** Listed catalog names only — never Rx dose / vial / frequency coaching. */
  listed_names?: string[];
  /** Present only if listed endpoint returns rows — names only, not model-authored. */
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
  /** User turn text — used only to extract an on-message candidate token. */
  message?: string;
  /**
   * Test/injection seam for the in-process check-interactions assemble.
   * Production omits this and uses the shared Claude+local+floor path.
   */
  checkInteractionsAssemble?: (
    body: {
      userId?: string;
      medications: string[];
      supplements: string[];
      recommendations: string[];
      allergies: string[];
    }
  ) => Promise<{
    interactions: unknown;
    summary?: unknown;
    blockedProducts?: unknown;
    error?: string;
  }>;
  /**
   * Optional pre-assembled hub/NutrigenDX payload for GeneX360 Soft next-order.
   * Route assembles via lookupSnpAssemble when the flag is on and this is omitted.
   */
  genex360EnginePayload?: {
    loadStatus: "ok" | "unauthorized" | "error";
    variants: Array<{
      rsid: string;
      gene: string | null;
      genotype: string | null;
      panel_key: string;
      stored_panel_key: string | null;
      status: string | null;
      clinical_significance: string | null;
      is_sample: boolean;
      chip: string | null;
    }>;
    snpCountsUnknown?: boolean;
    demoAccount?: boolean;
    nutrigenAttempted?: boolean;
    nutrigenFailed?: boolean;
    error?: string;
  };
  /**
   * Optional pre-assembled labs payload for Labs Soft next-order.
   * Route assembles via labsAssemble / loadLabResults when the flag is on and this is omitted.
   * Biomarker keys only — never raw values / units / ranges.
   */
  labsEnginePayload?: {
    loadStatus: "ok" | "unauthorized" | "error";
    biomarkers: Array<{
      biomarker_key: string;
      is_sample?: boolean | null;
      source_type?: string | null;
      lab_name?: string | null;
    }>;
    demoAccount?: boolean;
    labsUnread?: boolean;
    error?: string;
  };
  /**
   * Test/injection seam for Labs Soft assemble.
   * Production omits this and uses loadLabResults (GET /api/labs/results SSOT).
   */
  labsAssemble?: (input: { userId: string }) => Promise<{
    loadStatus: "ok" | "unauthorized" | "error";
    biomarkers: Array<{
      biomarker_key: string;
      is_sample?: boolean | null;
      source_type?: string | null;
      lab_name?: string | null;
    }>;
    demoAccount?: boolean;
    labsUnread?: boolean;
    error?: string;
  }>;
  /**
   * Test/injection seam for the in-process lookup_snp assemble.
   * Production omits this and uses loadHubVariants + NutrigenDX helpers.
   */
  lookupSnpAssemble?: (input: {
    userId: string;
    rsid?: string;
    gene?: string;
    consultNutrigen: boolean;
  }) => Promise<{
    loadStatus: "ok" | "unauthorized" | "error";
    variants: Array<{
      rsid: string;
      gene: string | null;
      genotype: string | null;
      panel_key: string;
      stored_panel_key: string | null;
      status: string | null;
      clinical_significance: string | null;
      is_sample: boolean;
      chip: string | null;
    }>;
    snpCountsUnknown?: boolean;
    demoAccount?: boolean;
    nutrigenAttempted?: boolean;
    nutrigenFailed?: boolean;
    error?: string;
  }>;
  /**
   * Test/injection seam for the in-process lookup_peptide assemble.
   * Production omits this and uses search_peptides + consumer education + optional listed.
   */
  lookupPeptideAssemble?: (input: {
    userId: string;
    searchQuery: string;
    name?: string;
    slug?: string;
  }) => Promise<{
    loadStatus: "ok" | "unauthorized" | "error";
    searchVerified: boolean;
    searchFailed: boolean;
    queryTooShort?: boolean;
    results: Array<{
      peptide_id: string;
      product_name: string;
      category_name: string | null;
      evidence_level: string | null;
      genex_panel: string | null;
      match_score: number | null;
      deliveryOptions?: unknown;
    }>;
    education: {
      entryKey: string;
      title: string;
      isPeptide: boolean;
      mechanism: string | null;
      evidenceGrade: string;
    } | null;
    educationFailed?: boolean;
    listedNames: string[];
    listedFailed?: boolean;
    error?: string;
  }>;
  /**
   * Test/injection seam for the in-process get_education assemble.
   * Production omits this and uses READ peptide_education_entries + Lex/FAQ fixtures.
   */
  getEducationAssemble?: (input: { topic_id: string }) => Promise<{
    loadStatus: "ok" | "unauthorized" | "error";
    topicId: string;
    education: {
      entryKey: string;
      title: string;
      isPeptide: boolean;
      mechanism: string | null;
      evidenceGrade: string;
      regulatoryStatus: string | null;
      safetyContext: string | null;
      provenanceText: string | null;
      pmids: string[];
    } | null;
    educationFailed?: boolean;
    safetyFixture?: { id: string; title: string; text: string } | null;
    blocked?:
      | "depth"
      | "glp1"
      | "semaglutide"
      | "tirzepatide"
      | "oral_stack"
      | "clinician_only";
    error?: string;
  }>;
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
