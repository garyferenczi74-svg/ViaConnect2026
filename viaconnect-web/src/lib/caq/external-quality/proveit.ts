/**
 * Prove It honesty stub (prove-it.io).
 * No public API. Do not scrape. Do not invent quality / COA / BA scores.
 * CAQ compare lane only — not Hannah RAG.
 */

import type { ExternalQualityFeedResult } from "./types";

export function getProveItFeed(): ExternalQualityFeedResult {
  return {
    source: "proveit",
    status: "unavailable",
    reason: "no_public_api",
    items: [],
  };
}
