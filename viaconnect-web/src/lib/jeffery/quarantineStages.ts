/**
 * Quarantine pipeline_runs.stages when the JSON value is not an array.
 * Object-shaped stages stay empty — never invent rows from object keys.
 * New module so Turbopack/Vercel cannot reuse chunk 374eeke_uz2uj.
 */

export function quarantineStages<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? raw : [];
}
