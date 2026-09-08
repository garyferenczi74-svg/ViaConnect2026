// Honest circumference fail taxonomy after #206 / #208 / #211.
// IMAGE Pose empty/timeout still reaches extract. Known residuals return
// UNKNOWN (C3). Non-timeout detect/process throws are empty_landmarks, not
// extract_throw. Classify the actual reason. Never invent cm / girths / Muscle lbs.

export const CIRC_VIEW_FAIL_REASONS = ['timeout', 'empty_landmarks', 'extract_throw'] as const;

export type CircViewFailReason = (typeof CIRC_VIEW_FAIL_REASONS)[number];

/** Surface reasons shown on photo Analyze / Measurements empty CTA. */
export const CIRC_FAIL_REASONS = [
  'timeout',
  'empty_landmarks',
  'extract_throw',
  'all_unknown',
  'height',
] as const;

export type CircFailReason = (typeof CIRC_FAIL_REASONS)[number];

export type CircViewFail = {
  pose: string;
  reason: CircViewFailReason;
  detail?: string;
};

/** Honest user-facing copy. Never claims a cm / girth / Muscle lb. */
export const CIRC_FAIL_COPY: Record<CircFailReason, string> = {
  timeout: 'Photo pose timed out. Tape measurements were not invented.',
  empty_landmarks: 'Photo pose found no landmarks. Tape measurements were not invented.',
  extract_throw: 'Photo measurements could not be extracted. Tape measurements were not invented.',
  all_unknown: 'Photo measurements were all unknown. Tape measurements were not invented.',
  height: 'Photo measurements need your height. We never guess it.',
};

export function isCircFailReason(value: string | null | undefined): value is CircFailReason {
  return value != null && (CIRC_FAIL_REASONS as readonly string[]).includes(value);
}

export function classifyCircFail(input: {
  error?: unknown;
  landmarkCount?: number;
  /**
   * View-level detect / selfie — not extractMeasurements.
   * Non-timeout throws here are a pose/init miss (`empty_landmarks`),
   * not an extract bug. Timeout still wins. Never invents cm.
   */
  viewStage?: 'detect' | 'process';
}): CircViewFailReason {
  if (input.error === undefined && input.landmarkCount === 0) {
    return 'empty_landmarks';
  }
  const msg =
    input.error instanceof Error
      ? input.error.message
      : input.error != null
        ? String(input.error)
        : '';
  if (/timeout/i.test(msg)) return 'timeout';
  if (input.viewStage === 'detect' || input.viewStage === 'process' || input.landmarkCount === 0) {
    return 'empty_landmarks';
  }
  return 'extract_throw';
}

export function circFailDetail(error: unknown): string | undefined {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  if (error == null) return undefined;
  const text = String(error);
  return text.length > 0 ? text : undefined;
}

/**
 * Pick the honest Analyze chip reason. Front view wins: that is the
 * nose+ankles scale gate. Height missing is not a CV fail.
 * Never invents a reason that did not happen.
 */
export function resolveSurfaceCircFail(input: {
  heightMissing?: boolean;
  viewFails?: readonly CircViewFail[];
  hasFiniteGirth?: boolean;
}): CircFailReason | null {
  if (input.heightMissing) return 'height';
  const fails = input.viewFails ?? [];
  const front = fails.find((f) => f.pose === 'front');
  if (front) return front.reason;
  if (fails.length > 0) return fails[0].reason;
  if (input.hasFiniteGirth === false) return 'all_unknown';
  return null;
}
