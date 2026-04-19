// Prompt #95 Phase 7: pure CSV serializer for the governance audit trail.
// RFC 4180: quote every field, double embedded quotes, CRLF line terminators.

export interface AuditEventRow {
  event_type: string;
  event_time: string;
  actor_user_id: string | null;
  actor_email: string | null;
  proposal_id: string | null;
  proposal_number: number | null;
  proposal_title: string | null;
  pricing_domain_id: string | null;
  summary: string;
  raw: unknown;
}

const COLUMNS: Array<keyof AuditEventRow> = [
  'event_time',
  'event_type',
  'proposal_number',
  'proposal_title',
  'pricing_domain_id',
  'actor_email',
  'actor_user_id',
  'proposal_id',
  'summary',
  'raw',
];

export function serializeGovernanceAuditCsv(rows: AuditEventRow[]): string {
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
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
