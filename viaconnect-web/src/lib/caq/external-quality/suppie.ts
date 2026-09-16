/**
 * Suppie honesty stub (suppie.app / CLEARER HEALTHTECH LTD).
 * No public API. Do not scrape. Do not invent quality / COA / BA scores.
 * SUPP.AI is a different product — do not wire supp.ai as Suppie.
 * CAQ compare lane only — not Hannah RAG.
 */

import type { ExternalQualityFeedResult } from "./types";

export function getSuppieFeed(): ExternalQualityFeedResult {
  return {
    source: "suppie",
    status: "unavailable",
    reason: "no_public_api",
    items: [],
  };
}
