/**
 * Hybrid retriever interface. Stage A first wire: ≤20 allowlisted
 * education + safety_never_say ids only. No open corpus / embeddings host.
 * Prefer READ stored PeptideIQ rows. Never invent chunk / monograph bodies.
 * Empty / missing never authorize new doses.
 */

import {
  isPractitionerDepthEntryKey,
  type EducationEntry,
} from "@/lib/peptides/educationEntryFields";
import { loadConsumerEducationEntryByKey } from "@/lib/peptides/educationEntries";
import { dropPractitionerDepthEducation } from "./lookup-peptide-wrap";
import {
  extractAllowlistedTopicIds,
  isSafetyNeverSayId,
  isStageAEducationAllowlisted,
  isStageARetrieverAllowlisted,
  safetyNeverSayFixture,
  STAGE_A_RETRIEVER_ALLOWLIST_MAX,
} from "./education-allowlist";
import type { RetrieverChunk, RetrieverQuery, RetrieverResult } from "./types";

export interface GroundedRetriever {
  retrieve(query: RetrieverQuery): Promise<RetrieverResult>;
}

export const STUB_RETRIEVER_INDEX_VERSION = "stub-empty-v0";
export const STAGE_A_ALLOWLIST_RETRIEVER_INDEX_VERSION = "stage-a-allowlist-edu-safety-v0";

export type LoadEducationForRetriever = (entryKey: string) => Promise<EducationEntry | null>;

export class StubGroundedRetriever implements GroundedRetriever {
  async retrieve(_query: RetrieverQuery): Promise<RetrieverResult> {
    return {
      chunks: [],
      index_version: STUB_RETRIEVER_INDEX_VERSION,
    };
  }
}

function storedEducationChunkText(entry: EducationEntry): string {
  return (
    entry.mechanism?.trim() ||
    entry.regulatoryStatus?.trim() ||
    entry.safetyContext?.trim() ||
    ""
  );
}

export function filterChunksForConsumerAudience(
  chunks: RetrieverChunk[],
  role: RetrieverQuery["role"]
): RetrieverChunk[] {
  return chunks.filter((chunk) => {
    if (chunk.audience === "clinician") return role !== "consumer";
    return chunk.audience === "consumer" || chunk.audience === "both";
  });
}

export function mapStoredEntryToEducationChunk(entry: EducationEntry): RetrieverChunk | null {
  if (isPractitionerDepthEntryKey(entry.entryKey)) return null;
  if (!isStageAEducationAllowlisted(entry.entryKey)) return null;
  const dropped = dropPractitionerDepthEducation({
    entryKey: entry.entryKey,
    title: entry.title,
    isPeptide: entry.isPeptide,
    mechanism: entry.mechanism,
    evidenceGrade: entry.evidenceGrade,
  });
  if (!dropped) return null;
  const text = storedEducationChunkText(entry);
  if (!text) return null;
  const pmid = entry.pmids[0];
  return {
    chunk_id: entry.entryKey,
    cite_id: pmid ? `pmid:${pmid}` : entry.entryKey,
    doc_type: "education",
    text,
    audience: "consumer",
  };
}

export function mapSafetyFixtureToChunk(id: string): RetrieverChunk | null {
  const fixture = safetyNeverSayFixture(id);
  if (!fixture?.text.trim()) return null;
  return {
    chunk_id: fixture.id,
    cite_id: fixture.id,
    doc_type: "safety_never_say",
    text: fixture.text,
    audience: "consumer",
  };
}

export async function retrieveAllowlistedChunks(
  query: RetrieverQuery,
  loadEducation: LoadEducationForRetriever = loadConsumerEducationEntryByKey
): Promise<RetrieverResult> {
  const ids = extractAllowlistedTopicIds(query.message)
    .filter((id) => isStageARetrieverAllowlisted(id) || isSafetyNeverSayId(id))
    .slice(0, STAGE_A_RETRIEVER_ALLOWLIST_MAX);

  const chunks: RetrieverChunk[] = [];
  for (const id of ids) {
    if (isSafetyNeverSayId(id)) {
      const chunk = mapSafetyFixtureToChunk(id);
      if (chunk) chunks.push(chunk);
      continue;
    }
    if (!isStageAEducationAllowlisted(id)) continue;
    if (isPractitionerDepthEntryKey(id)) continue;
    try {
      const entry = await loadEducation(id);
      if (!entry) continue;
      const chunk = mapStoredEntryToEducationChunk(entry);
      if (chunk) chunks.push(chunk);
    } catch {
      // Missing / read fail → no invented chunk.
    }
  }

  return {
    chunks: filterChunksForConsumerAudience(chunks, query.role),
    index_version: STAGE_A_ALLOWLIST_RETRIEVER_INDEX_VERSION,
  };
}

export class StageAAllowlistRetriever implements GroundedRetriever {
  constructor(private readonly loadEducation: LoadEducationForRetriever = loadConsumerEducationEntryByKey) {}

  async retrieve(query: RetrieverQuery): Promise<RetrieverResult> {
    return retrieveAllowlistedChunks(query, this.loadEducation);
  }
}

const allowlistRetriever = new StageAAllowlistRetriever();

export function getGroundedRetriever(): GroundedRetriever {
  return allowlistRetriever;
}

export async function retrieveGroundedChunks(
  query: RetrieverQuery,
  loadEducation?: LoadEducationForRetriever
): Promise<RetrieverResult> {
  if (loadEducation) {
    return retrieveAllowlistedChunks(query, loadEducation);
  }
  return getGroundedRetriever().retrieve(query);
}
