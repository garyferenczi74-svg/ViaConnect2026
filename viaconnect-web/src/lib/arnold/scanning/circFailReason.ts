// Honest circumference fail taxonomy after #206.
// IMAGE Pose empty/timeout still reaches extract, which throws when front
// scale/landmarks are missing — flushCirc then never POSTs. Classify the
// actual reason. Never invent cm / girths / Muscle lbs.

export const CIRC_FAIL_REASONS = ['timeout', 'empty_landmarks', 'extract_throw'] as const;

export type CircFailReason = (typeof CIRC_FAIL_REASONS)[number];

export type CircViewFail = {
  pose: string;
  reason: CircFailReason;
  detail?: string;
};

export function classifyCircFail(input: {
  error?: unknown;
  landmarkCount?: number;
}): CircFailReason {
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
  return 'extract_throw';
}

export function circFailDetail(error: unknown): string | undefined {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  if (error == null) return undefined;
  const text = String(error);
  return text.length > 0 ? text : undefined;
}
