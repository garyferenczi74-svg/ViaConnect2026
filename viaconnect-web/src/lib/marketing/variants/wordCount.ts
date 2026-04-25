/**
 * Word-count validation for hero variant copy (Prompt #138a §5.2 step 2).
 *
 * Variant lifecycle gate #2 — drafts exceeding budgets are rejected before
 * Marshall pre-check runs, since over-budget copy will visually break the
 * existing hero container per the #138a §3 visual non-disruption guarantee.
 */

import { WORD_COUNT_BUDGETS } from "./types";

export interface WordCountResult {
  ok: boolean;
  headlineWords: number;
  subheadlineWords: number;
  /** Empty when ok=true; populated with one or more reason strings otherwise. */
  reasons: string[];
}

/**
 * Counts words by splitting on whitespace, ignoring leading/trailing
 * whitespace and collapsing internal runs of whitespace. Punctuation
 * attached to a word counts as part of that word.
 *
 * Trademark / typographic markers like ™, ®, © are stripped before counting
 * because they don't render as separate words.
 */
export function countWords(text: string): number {
  if (typeof text !== "string") return 0;
  const stripped = text.replace(/[™®©]/g, "");
  const trimmed = stripped.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

export function validateWordCounts(
  headline: string,
  subheadline: string,
): WordCountResult {
  const headlineWords = countWords(headline);
  const subheadlineWords = countWords(subheadline);
  const reasons: string[] = [];

  if (headlineWords > WORD_COUNT_BUDGETS.headline_max) {
    reasons.push(
      `Headline is ${headlineWords} words; budget is ${WORD_COUNT_BUDGETS.headline_max}.`,
    );
  }
  if (subheadlineWords > WORD_COUNT_BUDGETS.subheadline_max) {
    reasons.push(
      `Subheadline is ${subheadlineWords} words; budget is ${WORD_COUNT_BUDGETS.subheadline_max}.`,
    );
  }
  if (headlineWords === 0) {
    reasons.push("Headline is empty.");
  }
  if (subheadlineWords === 0) {
    reasons.push("Subheadline is empty.");
  }

  return {
    ok: reasons.length === 0,
    headlineWords,
    subheadlineWords,
    reasons,
  };
}
