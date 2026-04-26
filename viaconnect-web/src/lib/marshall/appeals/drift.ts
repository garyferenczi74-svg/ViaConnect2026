/**
 * Drift analyzer for the rebuttal pipeline (Prompt #123 §5).
 *
 * Pulls active pre-check clearance receipts for the practitioner, computes
 * Jaccard similarity (reusing #121 helper) against the published content,
 * and labels drift as none / benign / substantive_*. Receipts older than
 * 60 days past expiry are still included for context. Returns null safely
 * when no receipt exists.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { jaccardSimilarity } from "@/lib/marshall/precheck/clearance";
import type { DriftReport, DriftLabel, GoodFaithSignal } from "./types";

const RECENT_EXPIRY_WINDOW_DAYS = 60;

const DISCLOSURE_TOKENS = ["#ad", "#sponsored", "paid partnership", "partner", "sponsored"];
const DISEASE_DICTIONARY_TOKENS = ["cure", "treats", "heals", "prevents", "reverses"];
const SUPERLATIVE_TOKENS = ["best", "most", "only", "guaranteed", "miracle", "breakthrough"];

export interface DriftInput {
  practitionerId: string;
  publishedText: string;
  /** Optional: fetch only the receipt covering this finding. */
  findingId?: string;
}

export async function analyzeDrift(
  client: SupabaseClient,
  input: DriftInput,
): Promise<DriftReport> {
  const empty: DriftReport = {
    has_receipt: false,
    receipt_id: null,
    receipt_issued_at: null,
    receipt_expired: false,
    jaccard_similarity: null,
    drift_label: "none",
    additions_excerpt: [],
    removals_excerpt: [],
    good_faith_signal: "neutral",
    recommendation_adjustment: "no receipt; cannot assess drift",
  };

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RECENT_EXPIRY_WINDOW_DAYS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: receipts } = await (client as any)
      .from("precheck_clearance_receipts")
      .select("id, issued_at, expires_at, revoked, text_derived")
      .eq("practitioner_id", input.practitionerId)
      .eq("revoked", false)
      .gte("expires_at", cutoff.toISOString())
      .order("issued_at", { ascending: false })
      .limit(20);

    if (!receipts || receipts.length === 0) return empty;

    let best: {
      id: string;
      issued_at: string;
      expires_at: string;
      cleared_text: string;
      similarity: number;
    } | null = null;

    for (const r of receipts as Array<{
      id: string;
      issued_at: string;
      expires_at: string;
      text_derived: string | null;
    }>) {
      const cleared = r.text_derived ?? "";
      if (!cleared) continue;
      const sim = jaccardSimilarity(cleared, input.publishedText);
      if (best === null || sim > best.similarity) {
        best = {
          id: r.id,
          issued_at: r.issued_at,
          expires_at: r.expires_at,
          cleared_text: cleared,
          similarity: sim,
        };
      }
    }

    if (!best || best.similarity < 0.6) return empty;

    const receiptExpired = new Date(best.expires_at) < new Date();
    const { additions, removals } = diffTokens(best.cleared_text, input.publishedText);
    const driftLabel = labelDrift(best.similarity, additions, removals);
    const goodFaith = goodFaithFromDrift(driftLabel);

    return {
      has_receipt: true,
      receipt_id: best.id,
      receipt_issued_at: best.issued_at,
      receipt_expired: receiptExpired,
      jaccard_similarity: round(best.similarity),
      drift_label: driftLabel,
      additions_excerpt: additions.slice(0, 8),
      removals_excerpt: removals.slice(0, 8),
      good_faith_signal: goodFaith,
      recommendation_adjustment: explainAdjustment(driftLabel),
    };
  } catch {
    return empty;
  }
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9#@\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

function diffTokens(cleared: string, published: string): { additions: string[]; removals: string[] } {
  const a = tokenSet(cleared);
  const b = tokenSet(published);
  const additions = [...b].filter((t) => !a.has(t));
  const removals = [...a].filter((t) => !b.has(t));
  return { additions, removals };
}

function labelDrift(similarity: number, additions: string[], removals: string[]): DriftLabel {
  if (similarity >= 0.999) return "none";

  const addedSet = new Set(additions);
  const removedSet = new Set(removals);

  if (DISCLOSURE_TOKENS.some((t) => removedSet.has(t.replace("#", "")) || removedSet.has(t))) {
    return "substantive_disclosure_change";
  }
  if (DISEASE_DICTIONARY_TOKENS.some((t) => addedSet.has(t))) {
    return "substantive_claim_addition";
  }
  if (SUPERLATIVE_TOKENS.some((t) => addedSet.has(t))) {
    return "substantive_superlative_addition";
  }
  if (similarity >= 0.95) return "benign";
  return "substantive_other";
}

function goodFaithFromDrift(label: DriftLabel): GoodFaithSignal {
  if (label === "none" || label === "benign") return "good_faith";
  if (label === "substantive_disclosure_change") return "bad_faith";
  return "neutral";
}

function explainAdjustment(label: DriftLabel): string {
  switch (label) {
    case "none":
      return "exact match to receipt; honors clearance";
    case "benign":
      return "cosmetic edits only; honors clearance";
    case "substantive_disclosure_change":
      return "disclosure removed post-clearance; bad-faith signal applied";
    case "substantive_claim_addition":
      return "new disease-claim language post-clearance; bad-faith signal applied";
    case "substantive_superlative_addition":
      return "new superlative post-clearance; bad-faith signal applied";
    case "substantive_sku_change":
      return "product reference changed post-clearance";
    case "substantive_other":
      return "non-cosmetic change post-clearance; warrants review";
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
