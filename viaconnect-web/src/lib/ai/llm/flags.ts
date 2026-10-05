/**
 * LLM router flags (LM-04). Every flag defaults false.
 *
 * Env overrides use the existing UPPER_SNAKE convention, for example
 * LLM_XAI_KILL=true or LLM_XAI_ADMIN_MARSHALL_REMEDIATE_ENABLED=true.
 * Canary percent is a separate env value and defaults to 0. It is not a
 * boolean flag.
 */

import {
  LLM_FEATURE_IDS,
  type DataClass,
  type LlmFeatureId,
  isMemberDataClass,
} from './types';

export interface LlmFlagDef {
  readonly default: boolean;
  readonly description: string;
}

export const LLM_XAI_KILL_FLAG = 'llm_xai_kill';
export const LLM_XAI_MEMBER_DATA_ALLOWED_FLAG = 'llm_xai_member_data_allowed';

export function llmXaiEnabledFlag(featureId: LlmFeatureId): string {
  return `llm_xai_${featureId}_enabled`;
}

export function llmXaiShadowFlag(featureId: LlmFeatureId): string {
  return `llm_xai_${featureId}_shadow`;
}

function flag(description: string): LlmFlagDef {
  return { default: false, description };
}

function buildRegistry(): Record<string, LlmFlagDef> {
  const registry: Record<string, LlmFlagDef> = {
    [LLM_XAI_KILL_FLAG]: flag(
      'Stop the LLM router from calling xAI. Default false. Per-feature flags also default false, so xAI is not called until one of them is turned on.',
    ),
    [LLM_XAI_MEMBER_DATA_ALLOWED_FLAG]: flag(
      'Allow the LLM router to send P1, P2, and P3 inputs to xAI. Default false. Leave false until counsel clears vendor terms for member data. P0 admin jobs do not need this flag.',
    ),
  };

  for (const featureId of LLM_FEATURE_IDS) {
    registry[llmXaiEnabledFlag(featureId)] = flag(
      `Call xAI first for ${featureId}, then Claude if that call errors. Default false. P1, P2, and P3 still require llm_xai_member_data_allowed.`,
    );
    registry[llmXaiShadowFlag(featureId)] = flag(
      `Call xAI and Claude for ${featureId} and return only the Claude result. Default false. Member data classes stay on Claude unless llm_xai_member_data_allowed is true.`,
    );
  }

  return registry;
}

export const LLM_XAI_FLAG_REGISTRY: Record<string, LlmFlagDef> = buildRegistry();

export function xaiAllowsDataClass(dataClass: DataClass, memberDataAllowed: boolean): boolean {
  if (!isMemberDataClass(dataClass)) return true;
  return memberDataAllowed;
}

/**
 * True only when this feature should leave its existing Claude path.
 * The kill switch keeps the existing path even if a feature flag is on.
 */
export function llmXaiRouteIsActive(
  featureId: LlmFeatureId,
  isEnabled: (flag: string) => boolean,
): boolean {
  if (isEnabled(LLM_XAI_KILL_FLAG)) return false;
  return isEnabled(llmXaiEnabledFlag(featureId)) || isEnabled(llmXaiShadowFlag(featureId));
}

/** Default 0. Non-numeric values read as 0. Clamped to 0–100. */
export function readLlmCanaryPercent(
  featureId: LlmFeatureId,
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env[`LLM_XAI_${featureId.toUpperCase()}_CANARY_PERCENT`];
  if (raw == null || raw.trim() === '') return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

/**
 * Comma-separated SHA-256 hex hashes. Tokens that are not 64 hex chars are
 * ignored so a raw id or email in the env var is not treated as an allowlist hit.
 */
export function readLlmAllowlist(
  env: Record<string, string | undefined> = process.env,
): ReadonlySet<string> {
  const raw = env.LLM_XAI_ALLOWLIST ?? '';
  const ids = raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => /^[0-9a-f]{64}$/.test(part));
  return new Set(ids);
}

/** Stable 0–99 bucket from a hex hash. Percent 0 selects nobody. */
export function isCanarySelected(hashHex: string, percent: number): boolean {
  if (!(percent > 0)) return false;
  if (percent >= 100) return true;
  const bucketSource = hashHex.slice(0, 8);
  const bucket = Number.parseInt(bucketSource, 16);
  if (!Number.isFinite(bucket)) return false;
  return (bucket % 100) < percent;
}
