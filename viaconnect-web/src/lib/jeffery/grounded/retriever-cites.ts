/**
 * Stage A allowlist retriever → Sources merge.
 * Education success only. cite_id + label fields — never chunk text / doses.
 * Empty / miss → no phantom cites. safety_never_say omitted (Lex/FAQ refuse path).
 */

import type { RetrieverChunk } from "./types";

export interface SourceCite {
  cite_id: string;
  label: string;
}

const PMID_PREFIX = "pmid:";

/** Existing Sources list format: one dash-line body, no chrome sentence. */
export function formatAllowlistSourceLine(cite: SourceCite): string {
  const id = cite.cite_id.trim();
  const label = cite.label.trim();
  if (id && label) return `cite_id: ${id}; label: ${label}`;
  if (id) return `cite_id: ${id}`;
  if (label) return `label: ${label}`;
  return "";
}

function pmidLabel(citeId: string): string | null {
  if (!citeId.toLowerCase().startsWith(PMID_PREFIX)) return null;
  const pmid = citeId.slice(PMID_PREFIX.length).trim();
  return pmid ? `PMID ${pmid}` : null;
}

/** Label from cite_id / chunk_id only — never chunk.text. */
export function labelForRetrieverCite(chunk: RetrieverChunk): string {
  const citeId = chunk.cite_id.trim();
  const fromPmid = pmidLabel(citeId);
  if (fromPmid) return fromPmid;
  const chunkId = chunk.chunk_id.trim();
  if (chunkId) return chunkId;
  return citeId;
}

export function citeDedupeKey(cite: SourceCite): string | null {
  const id = cite.cite_id.trim();
  if (id) return `id:${id}`;
  const label = cite.label.trim();
  if (label) return `label:${label.toLowerCase()}`;
  return null;
}

/**
 * Education allowlist chunks only. Omit safety_never_say (prefer Lex/FAQ refuse).
 * Never quote chunk.text.
 */
export function citesFromRetrieverChunks(chunks: RetrieverChunk[] | undefined): SourceCite[] {
  if (!chunks || chunks.length === 0) return [];
  const out: SourceCite[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    if (chunk.doc_type !== "education") continue;
    const cite_id = chunk.cite_id.trim();
    if (!cite_id) continue;
    const label = labelForRetrieverCite(chunk);
    const key = citeDedupeKey({ cite_id, label });
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ cite_id, label });
  }
  return out;
}

/**
 * Education Sources: route + tool labels (existing) + new retriever cite_id/label
 * lines, deduped by cite_id (or label when id missing). Empty chunks → no extras.
 */
export function mergeEducationSourceLines(input: {
  sourceRoute: string;
  toolCitations: Array<{ cite_id: string; label: string }>;
  retrieverChunks?: RetrieverChunk[];
}): string[] {
  const sources: string[] = [];
  const seen = new Set<string>();

  const remember = (cite: SourceCite): void => {
    const key = citeDedupeKey(cite);
    if (key) seen.add(key);
  };

  const route = input.sourceRoute.trim();
  if (route) sources.push(route);

  for (const cite of input.toolCitations) {
    const cite_id = cite.cite_id.trim();
    const label = cite.label.trim();
    if (!cite_id && !label) continue;
    remember({ cite_id, label });
    sources.push(label || cite_id);
  }

  for (const cite of citesFromRetrieverChunks(input.retrieverChunks)) {
    const key = citeDedupeKey(cite);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const line = formatAllowlistSourceLine(cite);
    if (line) sources.push(line);
  }

  return sources;
}
