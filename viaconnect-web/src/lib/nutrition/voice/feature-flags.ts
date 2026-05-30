/**
 * Three nested kill switches for Prompt 170j voice editing per spec §12.4.
 * All env-var driven; master switch defaults false at launch per spec.
 *
 * Plus env-tunable confidence thresholds (§4.6, §6.8).
 */

export interface VoiceFeatureFlags {
  voiceEditEnabled: boolean;
  serverSttFallbackEnabled: boolean;
  quickApplyModeEnabled: boolean;
}

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);

function readBooleanEnv(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return defaultValue;
  return TRUE_VALUES.has(raw.trim().toLowerCase());
}

function readThresholdEnv(key: string, defaultValue: number): number {
  const raw = process.env[key];
  const parsed = raw ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : defaultValue;
}

export function readVoiceFeatureFlags(): VoiceFeatureFlags {
  return {
    voiceEditEnabled: readBooleanEnv('VOICE_EDIT_ENABLED', false),
    serverSttFallbackEnabled: readBooleanEnv(
      'VOICE_EDIT_SERVER_STT_ENABLED',
      true
    ),
    quickApplyModeEnabled: readBooleanEnv(
      'VOICE_EDIT_QUICK_APPLY_MODE_ENABLED',
      true
    ),
  };
}

export const DEFAULT_CONFIDENCE_THRESHOLD_CLARIFICATION = 0.5;
export const DEFAULT_CONFIDENCE_THRESHOLD_MEDIUM = 0.85;
export const DEFAULT_CONFIDENCE_THRESHOLD_QUICK_APPLY = 0.92;

export function readClarificationThreshold(): number {
  return readThresholdEnv(
    'VOICE_OPERATION_CLARIFICATION_THRESHOLD',
    DEFAULT_CONFIDENCE_THRESHOLD_CLARIFICATION
  );
}

export function readMediumConfidenceThreshold(): number {
  return readThresholdEnv(
    'VOICE_OPERATION_MEDIUM_CONFIDENCE_THRESHOLD',
    DEFAULT_CONFIDENCE_THRESHOLD_MEDIUM
  );
}

export function readQuickApplyThreshold(): number {
  return readThresholdEnv(
    'VOICE_OPERATION_QUICK_APPLY_THRESHOLD',
    DEFAULT_CONFIDENCE_THRESHOLD_QUICK_APPLY
  );
}

export const SUPPORTED_LOCALES = ['en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en-US';

export const VOICE_CAPTURE_MAX_SECONDS = 30;
export const VOICE_CAPTURE_WARN_AT_SECONDS = 25;

export const UNDO_WINDOW_MS = 10_000;
