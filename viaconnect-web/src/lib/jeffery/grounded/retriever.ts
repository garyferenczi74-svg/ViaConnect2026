/**
 * Hybrid retriever interface. Stage A first wire: stub returns empty chunks.
 * Real RAG index is a later PR. Empty chunks never authorize new doses.
 */

import type { RetrieverQuery, RetrieverResult } from "./types";

export interface GroundedRetriever {
  retrieve(query: RetrieverQuery): Promise<RetrieverResult>;
}

export const STUB_RETRIEVER_INDEX_VERSION = "stub-empty-v0";

export class StubGroundedRetriever implements GroundedRetriever {
  async retrieve(_query: RetrieverQuery): Promise<RetrieverResult> {
    return {
      chunks: [],
      index_version: STUB_RETRIEVER_INDEX_VERSION,
    };
  }
}

const stubRetriever = new StubGroundedRetriever();

export function getGroundedRetriever(): GroundedRetriever {
  return stubRetriever;
}

export async function retrieveGroundedChunks(query: RetrieverQuery): Promise<RetrieverResult> {
  return getGroundedRetriever().retrieve(query);
}
