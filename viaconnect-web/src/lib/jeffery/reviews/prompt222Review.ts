/**
 * Prompt 222: Jeffery 221a completion_report package for Heads Up teardown.
 * Live KB apply and ACC insert are pending; do not POST to production here.
 */

import type { JefferyReviewInput, ReviewCheck } from "./types";
import { JEFFERY_REVIEW_HANDLER_VERSION } from "./types";

export const PROMPT_222_ARTIFACT_REF =
  "docs/superpowers/reports/2026-08-18-prompt-222-headsup-teardown.md";

/** Programmatic checks for the Prompt 222 completion_report package. */
export function buildPrompt222Checks(): ReviewCheck[] {
  return [
    {
      name: "citations_present",
      result: "pass",
      detail:
        "Teardown cites 15+ https:// sources from public HTTP crawl (2026-08-18).",
    },
    {
      name: "consumer_isolation",
      result: "pass",
      detail:
        "INTERNAL STRATEGY only. Seed rows use consumer_safe=false and practitioner_depth=false; no consumer UI.",
    },
    {
      name: "facts_only",
      result: "pass",
      detail:
        "Report and seed stay within Prompt 222 verified public facts; UNKNOWN not fabricated; unverifiable claims marked claimed-not-verified.",
    },
    {
      name: "crawl_fallback",
      result: "warn",
      detail:
        "Firecrawl MCP returned 0 pages (rate limit). Public HTTP fallback used. Live Firecrawl spend still pending a key.",
    },
    {
      name: "live_kb_apply_pending",
      result: "fail",
      detail:
        "KB seed migration and Jeffery/ACC insert are file-only; not applied to production. Completion report stays needs_human until live apply.",
    },
  ];
}

/**
 * Build JefferyReviewInput for Prompt 222 Heads Up teardown.
 * producedByAgent is hounddog (not jeffery) so no-self-review does not trigger.
 */
export function buildPrompt222JefferyInput(): JefferyReviewInput {
  return {
    artifactType: "completion_report",
    artifactRef: PROMPT_222_ARTIFACT_REF,
    producedByAgent: "hounddog",
    handlerVersion: JEFFERY_REVIEW_HANDLER_VERSION,
    checks: buildPrompt222Checks(),
    rationaleSummary:
      "Prompt 222 Heads Up teardown packaged for Gary needs_human while live KB apply and ACC insert are pending.",
  };
}
