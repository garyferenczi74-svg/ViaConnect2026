/**
 * MediSearch CAQ compare cite shape (PR A).
 *
 * If `CAQ_MEDISEARCH_ENABLED` is off or `MEDISEARCH_API_KEY` is missing,
 * return honest unavailable / refuse. This module never makes a network call.
 * Live SSE fetch is PR B only.
 *
 * CAQ compare lane only — not Hannah RAG / grounded Sources.
 */

import { hasMedisearchApiKey, isCaqMedisearchEnabled } from "./flag";
import type { ExternalQualityFeedResult } from "./types";

/** Soft N-lock for PR B live mapping. Unused while this module refuses. */
export const CAQ_MEDISEARCH_CITE_MAX = 10;

function unavailable(
  reason: ExternalQualityFeedResult["reason"],
): ExternalQualityFeedResult {
  return {
    source: "medisearch",
    status: "unavailable",
    reason,
    items: [],
  };
}

/**
 * MediSearch feed entry. PR A: refuse only — no SSE / HTTP.
 * Engines remain SSOT for protocol doses.
 */
export function getMediSearchFeed(): ExternalQualityFeedResult {
  if (!isCaqMedisearchEnabled()) {
    return unavailable("flag_off");
  }
  if (!hasMedisearchApiKey()) {
    return unavailable("missing_key");
  }
  // Flag + key present still cannot live-fetch in PR A.
  return unavailable("live_hold");
}
