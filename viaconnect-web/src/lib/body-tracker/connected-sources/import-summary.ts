// Prompt 230, Task 3: pure JSON -> ImportSummary mapper for the Apple/Hume
// XML import flow. The parse server route responds in snake_case
// (records_ingested, records_deduped, records_seen,
// records_attributed_hume, date_range_start, date_range_end) alongside a
// status field. This module is the single place that reads that shape so
// the client component never guesses at field names or silently treats a
// non-'complete' status as success.

export interface ImportSummary {
  recordsSeen: number;
  recordsIngested: number;
  recordsDeduped: number;
  recordsAttributedHume: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
}

type J = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function parseImportSummary(json: unknown): ImportSummary {
  const j = (json ?? {}) as J;
  return {
    recordsSeen: num(j.records_seen ?? j.recordsSeen),
    recordsIngested: num(j.records_ingested ?? j.recordsIngested),
    recordsDeduped: num(j.records_deduped ?? j.recordsDeduped),
    recordsAttributedHume: num(j.records_attributed_hume ?? j.recordsAttributedHume),
    dateRangeStart: (j.date_range_start ?? j.dateRangeStart ?? null) as string | null,
    dateRangeEnd: (j.date_range_end ?? j.dateRangeEnd ?? null) as string | null,
  };
}

export function isImportComplete(json: unknown): boolean {
  return !!json && (json as J).status === 'complete';
}
