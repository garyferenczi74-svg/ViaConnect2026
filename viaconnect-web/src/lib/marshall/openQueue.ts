/**
 * Brief 41 — Marshall counters bind to Jeffery's AWAITING REVIEW queue.
 *
 * Jeffery Live Feed shows `jeffery_messages.status === "pending"` as
 * AWAITING REVIEW (no 30-day cutoff). Marshall P0 / P1 / Open findings
 * count those same rows when they carry a Marshall rule id.
 *
 * Do not invent findings. Advisor KEY errors have no rule id and do not
 * inflate these counters.
 */

import { sanitizeConsentCopy } from "@/lib/compliance/consentCopy";

export const JEFFERY_AWAITING_REVIEW_STATUS = "pending";

export type MarshallQueueSeverity = "P0" | "P1" | "P2" | "P3" | "ADVISORY";

export type JefferyOpenQueueRow = {
  id: string;
  status: string;
  severity: string;
  title: string;
  summary: string;
  detail: unknown;
  created_at: string;
  source_agent?: string | null;
};

export type MarshallOpenFinding = {
  id: string;
  ruleId: string;
  marshallSeverity: MarshallQueueSeverity;
  title: string;
  summary: string;
  createdAt: string;
  sourceAgent: string | null;
  findingId: string | null;
};

export type OpenQueueCounts = {
  p0: number;
  p1: number;
  open: number;
};

const RULE_ID_RE = /MARSHALL\.[A-Z0-9_.]+/;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function isAwaitingReview(status: string): boolean {
  return status === JEFFERY_AWAITING_REVIEW_STATUS;
}

export function extractMarshallRuleId(row: Pick<JefferyOpenQueueRow, "title" | "detail">): string | null {
  const detail = asRecord(row.detail);
  const fromDetail = detail?.ruleId;
  if (typeof fromDetail === "string" && fromDetail.startsWith("MARSHALL.")) {
    return fromDetail;
  }
  const fromTitle = row.title.match(RULE_ID_RE);
  return fromTitle?.[0] ?? null;
}

export function marshallSeverityFromJefferyRow(row: Pick<JefferyOpenQueueRow, "title" | "severity">): MarshallQueueSeverity {
  if (/Marshall P0\b/i.test(row.title) || row.severity === "critical") return "P0";
  if (/Marshall P1\b/i.test(row.title) || row.severity === "review_required") return "P1";
  if (/Marshall P2\b/i.test(row.title) || row.severity === "advisory") return "P2";
  if (/Marshall P3\b/i.test(row.title)) return "P3";
  return "ADVISORY";
}

export function selectOpenQueueFindings(rows: JefferyOpenQueueRow[]): MarshallOpenFinding[] {
  const out: MarshallOpenFinding[] = [];
  for (const row of rows) {
    if (!isAwaitingReview(row.status)) continue;
    const ruleId = extractMarshallRuleId(row);
    if (!ruleId) continue;
    const detail = asRecord(row.detail);
    const findingId = typeof detail?.findingId === "string" ? detail.findingId : null;
    out.push({
      id: row.id,
      ruleId,
      marshallSeverity: marshallSeverityFromJefferyRow(row),
      title: row.title,
      summary: sanitizeConsentCopy(row.summary),
      createdAt: row.created_at,
      sourceAgent: row.source_agent ?? null,
      findingId,
    });
  }
  return out;
}

export function countOpenQueue(findings: MarshallOpenFinding[]): OpenQueueCounts {
  let p0 = 0;
  let p1 = 0;
  for (const f of findings) {
    if (f.marshallSeverity === "P0") p0 += 1;
    if (f.marshallSeverity === "P1") p1 += 1;
  }
  return { p0, p1, open: findings.length };
}

export function filterOpenQueue(
  findings: MarshallOpenFinding[],
  severity?: string | null,
): MarshallOpenFinding[] {
  if (!severity) return findings;
  return findings.filter((f) => f.marshallSeverity === severity);
}

export function rowsFromJefferyMessages(
  data: Array<{
    id: string;
    status: string;
    severity: string;
    title: string;
    summary: string;
    detail: unknown;
    created_at: string;
    source_agent?: string | null;
  }> | null,
): JefferyOpenQueueRow[] {
  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    status: row.status,
    severity: row.severity,
    title: row.title,
    summary: row.summary,
    detail: row.detail,
    created_at: row.created_at,
    source_agent: row.source_agent ?? null,
  }));
}
