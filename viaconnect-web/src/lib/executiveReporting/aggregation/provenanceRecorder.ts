// Prompt #105 §3.2 — provenance recorder.
// Every KPI snapshot must carry enough metadata to reconstruct the
// computation later. This module defines the shape and a
// hash-sha256 helper for source-query fingerprinting.

import { createHash } from 'crypto';

export interface KPIProvenance {
  sourcePrompt: string;
  sourceTable: string;
  sourceQueryHash: string;
  sourceTableMigrationVersion?: string;
  rowCount?: number;
  computationDurationMs?: number;
  computationMethod: string;
  asOfTimestamp: string;
  kpiVersion: number;
}

/** Pure: hash a SQL query so the same query always produces the same
 *  hash (the value is stored in kpi_library.source_query_sha256 AND
 *  in every KPI snapshot's provenance_json). If the two ever disagree,
 *  the audit trail exposes the drift. */
export function hashSourceQuery(querySQL: string): string {
  const normalized = querySQL.replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function buildProvenance(input: KPIProvenance): KPIProvenance {
  return { ...input };
}
