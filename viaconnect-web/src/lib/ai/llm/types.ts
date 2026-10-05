/**
 * Provider-neutral LLM types (LM-01).
 *
 * Soft GO 2026-10-05 (Gary via Jeffery): xAI is the primary provider and
 * Claude is the fallback, behind flags that default off. Cursor is not a
 * runtime inference API.
 *
 * Claude model IDs are chosen by the call site. The canonical map is
 * `src/lib/ai/claude-models.ts` on LM-00 (PR #270), which is not on main.
 * This module does not import it and does not retarget existing model IDs.
 */

export const LLM_PROVIDER_IDS = ['anthropic', 'xai'] as const;
export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number];

/** Sensitivity classes from OBSERVE.md. P0 has no member data. */
export const DATA_CLASSES = ['P0', 'P1', 'P2', 'P3'] as const;
export type DataClass = (typeof DATA_CLASSES)[number];

/**
 * Feature ids for per-feature flags. Only `admin_marshall_remediate` is
 * wired to a call site in this change. The others exist so later pilots can
 * flip their own flags without a new registry shape.
 */
export const LLM_FEATURE_IDS = [
  'admin_marshall_remediate',
  'admin_marshall_vision',
  'admin_exec_mdna',
  'admin_knowledge_processor',
  'admin_brand_enricher',
  'admin_brand_validator',
  'admin_legal_triage',
  'admin_health_check',
  'product_lookup',
  'label_ocr',
  'meal_parse',
  'hannah_ask',
  'interaction_checker',
  'bos_narrative',
  'lab_explanation',
  'advisor_chat',
  'hannah_ultrathink',
  'protocol_generation',
  'arnold_recommender',
  'region_blurb',
  'compliance_gate',
  'body_photos',
] as const;

export type LlmFeatureId = (typeof LLM_FEATURE_IDS)[number];

/** The only call site routed through this module in this change. */
export const LLM_WIRED_FEATURE_ID = 'admin_marshall_remediate' satisfies LlmFeatureId;

export const LLM_ERROR_CODES = [
  'config_missing',
  'timeout',
  'rate_limited',
  'auth_error',
  'bad_request',
  'upstream_error',
  'parse_failed',
  'schema_invalid',
  'unsupported_image',
  'circuit_open',
  'aborted',
  'empty_output',
] as const;

export type LlmErrorCode = (typeof LLM_ERROR_CODES)[number];

export type LlmImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

export type LlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: LlmImageMediaType; dataBase64: string };

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: readonly LlmContentPart[];
}

export type LlmReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  /** xAI `usage.cost_in_usd_ticks` when the response includes it. */
  costInUsdTicks: number | null;
  /** USD estimate. Tick conversion wins over the price table when ticks exist. */
  costUsd: number | null;
}

export interface LlmRouteRequest {
  featureId: LlmFeatureId;
  dataClass: DataClass;
  /** Claude model id. Call sites pass the id they already use. */
  anthropicModel: string;
  /** xAI model id. Documented ids only; the admin pilot uses grok-4.7. */
  xaiModel: string;
  system?: string;
  messages: readonly LlmMessage[];
  maxOutputTokens: number;
  timeoutMs: number;
  temperature?: number;
  reasoningEffort?: LlmReasoningEffort;
  /**
   * Internal user key. The router hashes it before any provider sees it.
   * Omit for admin jobs that have no member.
   */
  safetyIdentifierSource?: string;
  /** When true, a primary result with no JSON object falls back. */
  requireJson?: boolean;
  signal?: AbortSignal;
}

export interface LlmProviderRequest extends LlmRouteRequest {
  model: string;
  /** SHA-256 hex of safetyIdentifierSource. Never the raw source. */
  safetyIdentifierHash?: string;
}

export interface LlmProviderSuccess {
  ok: true;
  text: string;
  provider: LlmProviderId;
  model: string;
  usage: LlmUsage;
  latencyMs: number;
  finishReason: string | null;
}

export interface LlmProviderFailure {
  ok: false;
  code: LlmErrorCode;
  provider: LlmProviderId;
  model: string | null;
  httpStatus: number | null;
  retryable: boolean;
  latencyMs: number;
}

export type LlmProviderResult = LlmProviderSuccess | LlmProviderFailure;

export type LlmStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'usage'; usage: LlmUsage }
  | { type: 'done'; finishReason: string | null }
  | { type: 'error'; error: LlmProviderFailure };

export interface LlmProvider {
  readonly id: LlmProviderId;
  complete(req: LlmProviderRequest): Promise<LlmProviderResult>;
  stream(req: LlmProviderRequest): AsyncIterable<LlmStreamEvent>;
}

export type RouteMode = 'anthropic_only' | 'xai_primary' | 'shadow';

export type RouteReason =
  | 'flag_off'
  | 'kill'
  | 'member_data_blocked'
  | 'canary_miss'
  | 'enabled'
  | 'shadow';

export interface RoutePlan {
  mode: RouteMode;
  reason: RouteReason;
}

export interface LlmRouteSuccess extends LlmProviderSuccess {
  fallbackFrom: LlmProviderId | null;
  planReason: RouteReason;
}

export interface LlmRouteFailure extends LlmProviderFailure {
  fallbackFrom: LlmProviderId | null;
  planReason: RouteReason;
}

export type LlmRouteOutcome = LlmRouteSuccess | LlmRouteFailure;

export type LlmCompareClass = 'agree' | 'differ' | 'error' | 'skipped';

/** Telemetry only. Must not carry prompts, outputs, or raw user keys. */
export interface LlmAuditEvent {
  featureId: LlmFeatureId;
  route: string;
  dataClass: DataClass;
  outcome: 'success' | 'failure';
  provider: LlmProviderId | null;
  model: string | null;
  errorCode: LlmErrorCode | null;
  httpStatus: number | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  reasoningTokens: number | null;
  costUsd: number | null;
  costInUsdTicks: number | null;
  fallbackFrom: LlmProviderId | null;
  planReason: RouteReason;
  compareClass: LlmCompareClass | null;
  /** Outcome of the unused xAI call during shadow. No text. */
  shadowErrorCode: LlmErrorCode | null;
  /** xAI error that caused a Claude fallback. No text. */
  primaryErrorCode: LlmErrorCode | null;
}

export function emptyUsage(): LlmUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    reasoningTokens: 0,
    costInUsdTicks: null,
    costUsd: null,
  };
}

export function isMemberDataClass(dataClass: DataClass): boolean {
  return dataClass === 'P1' || dataClass === 'P2' || dataClass === 'P3';
}
