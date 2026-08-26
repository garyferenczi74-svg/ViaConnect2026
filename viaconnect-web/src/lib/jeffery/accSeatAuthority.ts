/**
 * Brief 39 — Jeffery Command Center one-seat authority.
 *
 * Header Agents is ACC seats only (17 as of last lock). Evolution Report
 * copy on /admin/jeffery must not print a second headcount. Ultrathink
 * roster length (historically 22) is not an approved "agents" noun.
 */

import { ACC_SEAT_COUNT } from "@/lib/agents/types";

export { ACC_SEAT_COUNT };

export function formatAccRosterReviewedPhrase(
  reviewedCount?: number,
  seatCount: number = ACC_SEAT_COUNT,
): string {
  if (reviewedCount != null && reviewedCount === seatCount) {
    return `Reviewed ${seatCount} agents`;
  }
  if (reviewedCount != null && reviewedCount < seatCount && reviewedCount >= 0) {
    return `Reviewed ${reviewedCount} of ${seatCount} agents`;
  }
  // Historical / other roster (e.g. 22 ultrathink rows). Gary has not named
  // a second noun. Drop that headcount; bind to ACC seats.
  return `Reviewed the ACC roster (${seatCount})`;
}

export function formatEvolutionReportSummary(input: {
  reviewedCount?: number;
  lessonsProcessed?: number;
  agentsFlagged?: number;
  decisionsReviewed?: number;
  seatCount?: number;
}): string {
  const phrase = formatAccRosterReviewedPhrase(input.reviewedCount, input.seatCount);
  const lessons = input.lessonsProcessed ?? 0;
  const flagged = input.agentsFlagged ?? 0;
  const decisions = input.decisionsReviewed ?? 0;
  return `${phrase}, processed ${lessons} lessons, ${flagged} agents flagged, ${decisions} decisions reviewed.`;
}

const REVIEWED_N_AGENTS = /Reviewed\s+(\d+)\s+agents\b/gi;
const AGENTS_REVIEWED_FIELD = /"?agents_reviewed"?\s*[:=]\s*\d+(?:\.\d+)?/gi;
const TWENTY_TWO_AGENTS = /\b22\s+agents\b/gi;

/**
 * Display-only rewrite. Does not write the database. Real events stay real.
 */
export function rewriteJefferyHeadcountCopy(
  text: string,
  seatCount: number = ACC_SEAT_COUNT,
): string {
  if (!text) return text;
  let out = text.replace(REVIEWED_N_AGENTS, (_match, raw: string) =>
    formatAccRosterReviewedPhrase(Number(raw), seatCount),
  );
  out = out.replace(AGENTS_REVIEWED_FIELD, `ACC roster: ${seatCount}`);
  out = out.replace(TWENTY_TWO_AGENTS, `the ACC roster (${seatCount})`);
  return out;
}

export function displayJefferyJson(value: unknown, seatCount: number = ACC_SEAT_COUNT): string {
  return rewriteJefferyHeadcountCopy(JSON.stringify(value, null, 2), seatCount);
}
