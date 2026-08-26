/**
 * Brief 55: Hounddog Research feed is the social-research database.
 *
 * Legal homes: /admin/hounddog Research findings list. Not Content. Not
 * hooks. Not pipeline. Not Overview KPI last-sync. A digest is not a
 * script — never insert into hounddog_scripts or hounddog_pipeline.
 *
 * Watson lands rows in hounddog_staging_items where
 * topic_key = hounddog_research. This module is the land API + mapper.
 * It does not write hounddog_performance or hounddog_analytics_rollup.
 * Do not copy live titles into constants.
 */

import type { Database } from "@/lib/supabase/types";

export const HOUNDDOG_RESEARCH_EMPTY_COPY = "No scrape rows today.";

export const HOUNDDOG_RESEARCH_TOPIC_KEY = "hounddog_research";

/** Watson scored landings at ≥50 on relevance_score. */
export const HOUNDDOG_RESEARCH_MIN_SCORE = 50;

const PERFORMANCE_OR_ROLLUP = new Set([
  "hounddog_performance",
  "hounddog_analytics_rollup",
]);

const GLP1_OR_SEMAGLUTIDE =
  /semaglutide|ozempic|wegovy|rybelsus|glp[\s-]?1\b|glp1\b/i;

const DIGEST_KEYS = [
  "digest",
  "digestLine",
  "digest_line",
  "why",
  "why_it_matters",
  "whyItMatters",
] as const;

const CONVERSION_KEYS = [
  "conversion",
  "engagement",
  "engagement_count",
  "engagementCount",
] as const;

/** Staging columns used by the Research bind. No top-level platform column. */
export type HounddogResearchStagingRow = Pick<
  Database["public"]["Tables"]["hounddog_staging_items"]["Row"],
  "title" | "source_url" | "retrieved_at" | "topic_key" | "raw_payload"
> & {
  /** Postgres numeric may arrive as number or string. */
  relevance_score: number | string | null;
};

export interface HounddogResearchFinding {
  title: string;
  url: string | null;
  platform: string | null;
  score: number | null;
  fetchedAt: string | null;
  /** One-line why-it-matters from a real digest/why field only. Omit if missing. */
  digestLine?: string;
  /** Real conversion or engagement count > 0. Omit otherwise. */
  conversion?: number;
}

export interface ResearchFindingWritePayload {
  title?: string | null;
  url?: string | null;
  platform?: string | null;
  score?: number | null;
  fetchedAt?: string | null;
  digestLine?: string | null;
  conversion?: number | null;
  views?: number | null;
  likes?: number | null;
  reach?: number | null;
  total_reach?: number | null;
  targetTable?: string | null;
  table?: string | null;
}

type StagingQueryResult = {
  data: HounddogResearchStagingRow[] | null;
  error: { message: string } | null;
};

export type ResearchStagingQueryClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        gte: (
          column: string,
          value: number,
        ) => PromiseLike<StagingQueryResult>;
      };
    };
  };
};

export function isRealConversion(
  value: number | null | undefined,
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function firstLine(value: string): string {
  return value.split(/\r?\n/)[0]?.trim() ?? "";
}

function haystackForWrite(payload: ResearchFindingWritePayload): string {
  return [payload.title, payload.digestLine, payload.url, payload.platform]
    .filter((part): part is string => typeof part === "string")
    .join("\n");
}

function haystackForRow(row: HounddogResearchStagingRow): string {
  const payload = asRecord(row.raw_payload);
  return [
    row.title,
    row.source_url,
    typeof payload.digest === "string" ? payload.digest : "",
    typeof payload.platform === "string" ? payload.platform : "",
  ].join("\n");
}

function containsGlp1OrSemaglutide(text: string): boolean {
  return GLP1_OR_SEMAGLUTIDE.test(text);
}

function writeTargetTable(payload: ResearchFindingWritePayload): string {
  const raw = payload.targetTable ?? payload.table ?? "";
  return raw.trim().toLowerCase();
}

function isPerformanceOrRollupPayload(
  payload: ResearchFindingWritePayload,
): boolean {
  if (PERFORMANCE_OR_ROLLUP.has(writeTargetTable(payload))) return true;
  return (
    Object.prototype.hasOwnProperty.call(payload, "views") ||
    Object.prototype.hasOwnProperty.call(payload, "likes") ||
    Object.prototype.hasOwnProperty.call(payload, "reach") ||
    Object.prototype.hasOwnProperty.call(payload, "total_reach")
  );
}

function hasInventedConversion(
  conversion: number | null | undefined,
  present: boolean,
): boolean {
  if (!present || conversion == null) return false;
  return !isRealConversion(conversion);
}

export function isHounddogResearchTopic(
  topicKey: string | null | undefined,
): boolean {
  return topicKey === HOUNDDOG_RESEARCH_TOPIC_KEY;
}

export function meetsResearchMinScore(
  score: number | string | null | undefined,
): boolean {
  const value = toFiniteNumber(score);
  return value !== null && value >= HOUNDDOG_RESEARCH_MIN_SCORE;
}

export function extractRawPayloadPlatform(rawPayload: unknown): string | null {
  const platform = asRecord(rawPayload).platform;
  if (typeof platform !== "string") return null;
  const trimmed = platform.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Digest/why only. Do not invent from title or summary.
 * Live landings store the line in raw_payload.digest.
 */
export function extractDigestLine(
  row: Pick<HounddogResearchStagingRow, "raw_payload">,
): string | undefined {
  const payload = asRecord(row.raw_payload);
  for (const key of DIGEST_KEYS) {
    const value = payload[key];
    if (typeof value !== "string") continue;
    const line = firstLine(value);
    if (line.length > 0) return line;
  }
  return undefined;
}

export function extractConversion(
  row: Pick<HounddogResearchStagingRow, "raw_payload">,
): number | undefined {
  const payload = asRecord(row.raw_payload);
  for (const key of CONVERSION_KEYS) {
    const value = toFiniteNumber(payload[key]);
    if (isRealConversion(value)) return value;
  }
  return undefined;
}

export function canWriteResearchFinding(
  payload: ResearchFindingWritePayload,
): boolean {
  if (isPerformanceOrRollupPayload(payload)) return false;
  if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
    return false;
  }
  if (containsGlp1OrSemaglutide(haystackForWrite(payload))) return false;
  if (
    hasInventedConversion(
      payload.conversion,
      Object.prototype.hasOwnProperty.call(payload, "conversion"),
    )
  ) {
    return false;
  }
  return true;
}

function utcDay(iso: string | null | undefined): string {
  if (typeof iso !== "string" || iso.trim().length === 0) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toISOString().slice(0, 10);
}

function dedupeKey(finding: Pick<HounddogResearchFinding, "url" | "fetchedAt">): string {
  return `${(finding.url ?? "").trim()}|${utcDay(finding.fetchedAt)}`;
}

function toStoredFinding(
  payload: ResearchFindingWritePayload,
): HounddogResearchFinding | null {
  if (!canWriteResearchFinding(payload)) return null;
  const title = (payload.title ?? "").trim();
  const url =
    typeof payload.url === "string" && payload.url.trim().length > 0
      ? payload.url.trim()
      : null;
  const platform =
    typeof payload.platform === "string" && payload.platform.trim().length > 0
      ? payload.platform.trim()
      : null;
  const stored: HounddogResearchFinding = {
    title,
    url,
    platform,
    score: toFiniteNumber(payload.score),
    fetchedAt:
      typeof payload.fetchedAt === "string" && payload.fetchedAt.trim().length > 0
        ? payload.fetchedAt
        : null,
  };
  if (typeof payload.digestLine === "string") {
    const line = firstLine(payload.digestLine);
    if (line.length > 0) stored.digestLine = line;
  }
  if (isRealConversion(payload.conversion)) {
    stored.conversion = payload.conversion;
  }
  return stored;
}

/**
 * Daily append. Never wipes prior days. De-dupes by url + UTC day.
 */
export function appendResearchDay(
  existing: readonly HounddogResearchFinding[],
  incoming: readonly ResearchFindingWritePayload[],
): HounddogResearchFinding[] {
  const next = existing.map((row) => ({ ...row }));
  const seen = new Set(next.map(dedupeKey));
  for (const row of incoming) {
    const stored = toStoredFinding(row);
    if (!stored) continue;
    const key = dedupeKey(stored);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(stored);
  }
  return next;
}

export function mapStagingItemToResearchFinding(
  row: HounddogResearchStagingRow,
): HounddogResearchFinding | null {
  if (!isHounddogResearchTopic(row.topic_key)) return null;
  if (!meetsResearchMinScore(row.relevance_score)) return null;
  if (containsGlp1OrSemaglutide(haystackForRow(row))) return null;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (title.length === 0) return null;

  const finding: HounddogResearchFinding = {
    title,
    url:
      typeof row.source_url === "string" && row.source_url.trim().length > 0
        ? row.source_url.trim()
        : null,
    platform: extractRawPayloadPlatform(row.raw_payload),
    score: toFiniteNumber(row.relevance_score),
    fetchedAt:
      typeof row.retrieved_at === "string" && row.retrieved_at.trim().length > 0
        ? row.retrieved_at
        : null,
  };
  const digestLine = extractDigestLine(row);
  if (digestLine) finding.digestLine = digestLine;
  const conversion = extractConversion(row);
  if (conversion !== undefined) finding.conversion = conversion;
  return finding;
}

export function filterAndMapResearchStagingRows(
  rows: readonly HounddogResearchStagingRow[],
): readonly HounddogResearchFinding[] {
  const findings: HounddogResearchFinding[] = [];
  for (const row of rows) {
    const mapped = mapStagingItemToResearchFinding(row);
    if (mapped) findings.push(mapped);
  }
  return findings;
}

/**
 * Default home is honest-empty until staging rows (or a test injection)
 * are passed in. Do not pull digest titles into Hounddog as fixtures.
 */
export function loadHounddogResearchFindings(
  rows?: readonly HounddogResearchStagingRow[] | null,
): readonly HounddogResearchFinding[] {
  if (!rows || rows.length === 0) return [];
  return filterAndMapResearchStagingRows(rows);
}

/**
 * Bind query: topic_key = hounddog_research and relevance_score ≥ 50.
 * Select only. Never insert/update/delete Watson rows.
 */
export async function queryHounddogResearchFindings(
  client: ResearchStagingQueryClient,
): Promise<readonly HounddogResearchFinding[]> {
  const { data, error } = await client
    .from("hounddog_staging_items")
    .select("title, source_url, retrieved_at, relevance_score, topic_key, raw_payload")
    .eq("topic_key", HOUNDDOG_RESEARCH_TOPIC_KEY)
    .gte("relevance_score", HOUNDDOG_RESEARCH_MIN_SCORE);

  if (error || !data) return [];
  return loadHounddogResearchFindings(data);
}

export function isHounddogScriptPayload(
  finding: HounddogResearchFinding,
): boolean {
  void finding;
  return false;
}

export function isHounddogPipelinePayload(
  finding: HounddogResearchFinding,
): boolean {
  void finding;
  return false;
}

export function isHounddogHookPayload(
  finding: HounddogResearchFinding,
): boolean {
  void finding;
  return false;
}
