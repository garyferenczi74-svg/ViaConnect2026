/**
 * Optional Stage A Hounddog URL cites — default OFF.
 * score ≥ 50, topic_key = hounddog_research, non-GLP. cite_id + title/host only.
 * Never dose/protocol/genotype SSOT. Never quote digest / summary body.
 * Skip hounddog_performance. Semaglutide / GLP still refuse upstream.
 */

import { hostFromUrl } from "@/lib/agents/authorityAllowlist";
import {
  HOUNDDOG_RESEARCH_MIN_SCORE,
  HOUNDDOG_RESEARCH_TOPIC_KEY,
} from "@/lib/hounddog/researchFindings";
import { isOffListSourceCite } from "./sources-off-list";

export interface HounddogUrlCite {
  cite_id: string;
  label: string;
}

export const STAGE_A_HOUNDDOG_URL_CITES_ENABLED = false;
export const STAGE_A_HOUNDDOG_URL_CITE_MAX = 10;

const GLP1_OR_SEMAGLUTIDE =
  /semaglutide|ozempic|wegovy|rybelsus|glp[\s-]?1\b|glp1\b/i;

const DOSE_LABEL_RE = /\b(\d+\s?(mg|mcg)|dose|titration|stacking)\b/i;

export interface HounddogUrlCiteRow {
  id?: string | null;
  title?: string | null;
  source_url?: string | null;
  topic_key?: string | null;
  relevance_score?: number | string | null;
  raw_payload?: unknown;
  summary?: string | null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function haystackForRow(row: HounddogUrlCiteRow): string {
  const title = typeof row.title === "string" ? row.title : "";
  const url = typeof row.source_url === "string" ? row.source_url : "";
  return `${title} ${url}`;
}

export function normalizeUrlCiteId(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "") || "";
    if (!host) return "";
    return `url:${host}${path}`;
  } catch {
    return "";
  }
}

export function hounddogUrlCiteLabel(title: string | null | undefined, url: string): string {
  const trimmed = typeof title === "string" ? title.trim() : "";
  if (trimmed && !DOSE_LABEL_RE.test(trimmed) && !GLP1_OR_SEMAGLUTIDE.test(trimmed)) {
    return trimmed;
  }
  return hostFromUrl(url) || "";
}

export function isHounddogUrlCiteEligible(row: HounddogUrlCiteRow): boolean {
  if ((row.topic_key ?? "") !== HOUNDDOG_RESEARCH_TOPIC_KEY) return false;
  const score = toFiniteNumber(row.relevance_score);
  if (score === null || score < HOUNDDOG_RESEARCH_MIN_SCORE) return false;
  const url = typeof row.source_url === "string" ? row.source_url.trim() : "";
  if (!url) return false;
  if (GLP1_OR_SEMAGLUTIDE.test(haystackForRow(row))) return false;
  return true;
}

export function mapHounddogRowToUrlCite(row: HounddogUrlCiteRow): HounddogUrlCite | null {
  if (!isHounddogUrlCiteEligible(row)) return null;
  const url = (row.source_url ?? "").trim();
  const cite_id = normalizeUrlCiteId(url);
  const label = hounddogUrlCiteLabel(row.title, url);
  if (!cite_id || !label) return null;
  if (isOffListSourceCite({ cite_id, label })) return null;
  return { cite_id, label };
}

export function citesFromHounddogResearchRows(
  rows: readonly HounddogUrlCiteRow[] | null | undefined,
  opts?: { enabled?: boolean }
): HounddogUrlCite[] {
  const enabled = opts?.enabled ?? STAGE_A_HOUNDDOG_URL_CITES_ENABLED;
  if (!enabled || !rows || rows.length === 0) return [];
  const out: HounddogUrlCite[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const cite = mapHounddogRowToUrlCite(row);
    if (!cite) continue;
    if (seen.has(cite.cite_id)) continue;
    seen.add(cite.cite_id);
    out.push(cite);
    if (out.length >= STAGE_A_HOUNDDOG_URL_CITE_MAX) break;
  }
  return out;
}

export async function loadHounddogUrlCites(opts?: {
  enabled?: boolean;
  rows?: readonly HounddogUrlCiteRow[] | null;
}): Promise<HounddogUrlCite[]> {
  return citesFromHounddogResearchRows(opts?.rows, { enabled: opts?.enabled });
}

export function sanitizeHounddogUrlCites(
  cites: HounddogUrlCite[] | undefined
): HounddogUrlCite[] {
  if (!cites || cites.length === 0) return [];
  const out: HounddogUrlCite[] = [];
  const seen = new Set<string>();
  for (const cite of cites) {
    const cite_id = cite.cite_id.trim();
    const label = cite.label.trim();
    if (!cite_id.startsWith("url:") || !label) continue;
    if (isOffListSourceCite({ cite_id, label })) continue;
    if (DOSE_LABEL_RE.test(label) || GLP1_OR_SEMAGLUTIDE.test(`${cite_id} ${label}`)) continue;
    if (seen.has(cite_id)) continue;
    seen.add(cite_id);
    out.push({ cite_id, label });
    if (out.length >= STAGE_A_HOUNDDOG_URL_CITE_MAX) break;
  }
  return out;
}
