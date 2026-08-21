/**
 * Prompt 226d / 226a absolute isolation set.
 * These tables must never be imported by Thanos, Hounddog ingest, KB RAG,
 * evidence grading, or cross-user aggregates that could produce compound guidance.
 */

export const ABSOLUTE_ISOLATION_TABLES_226D = [
  'converter_sessions',
  'user_prescribed_peptides',
  'practitioner_peptide_protocols',
  'hormone_reports',
  'suggestion_sessions',
  // Reserved sixth historical name used in docs; keep list explicit.
  'ultrathink_protocols',
] as const;

export type AbsoluteIsolationTable =
  (typeof ABSOLUTE_ISOLATION_TABLES_226D)[number];
