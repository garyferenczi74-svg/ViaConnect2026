/**
 * Diagnostic and benchmark kill switches for the Prompt 184 nutrition accuracy
 * harness. Both are env-var driven and default to false, so production logging
 * volume is unaffected unless a flag is explicitly enabled in a dev or CI run.
 *
 * Pattern mirrors src/lib/nutrition/voice/feature-flags.ts.
 */

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);

function readBooleanEnv(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return defaultValue;
  return TRUE_VALUES.has(raw.trim().toLowerCase());
}

/**
 * Gates the per-item pipeline diagnostic logging added by the #184 harness.
 * Off by default so nothing reaches production logging volume.
 */
export function isNutritionDiagnosticsEnabled(): boolean {
  return readBooleanEnv('NUTRITION_DIAGNOSTICS_ENABLED', false);
}

/**
 * Set by the divergence report harness to pin deterministic behavior, for
 * example using captured vision detection fixtures instead of live vision
 * calls. Off by default.
 */
export function isNutritionBenchmarkMode(): boolean {
  return readBooleanEnv('NUTRITION_BENCHMARK_MODE', false);
}
