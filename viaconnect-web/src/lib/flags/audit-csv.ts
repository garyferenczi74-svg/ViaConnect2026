// Prompt #93 Phase 6: pure CSV serializer for the audit trail export.
//
// Emits RFC 4180-compatible CSV: double-quoted fields, doubled quotes for
// embedded quotes, and CRLF line terminators. Deliberately field-agnostic:
// the caller passes in a list of flat rows and a column list, and the
// serializer handles nothing else.

export interface AuditCsvRow {
  id: string;
  feature_id: string;
  change_type: string;
  change_reason: string | null;
  changed_by: string;
  changed_at: string;
  previous_state: unknown;
  new_state: unknown;
  user_agent: string | null;
  ip_address: string | null;
}

const COLUMNS: Array<keyof AuditCsvRow> = [
  'changed_at',
  'feature_id',
  'change_type',
  'change_reason',
  'changed_by',
  'previous_state',
  'new_state',
  'user_agent',
  'ip_address',
  'id',
];

export function serializeAuditCsv(rows: AuditCsvRow[]): string {
  const header = COLUMNS.join(',');
  const lines = rows.map((row) =>
    COLUMNS.map((col) => csvEscape(formatCell(row[col]))).join(','),
  );
  return [header, ...lines].join('\r\n');
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // JSONB columns: compact-serialize without whitespace
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function csvEscape(value: string): string {
  // Always quote. Double any embedded double-quotes.
  return `"${value.replace(/"/g, '""')}"`;
}
