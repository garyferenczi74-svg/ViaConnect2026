/**
 * Three-strike ledger with 180-day rolloff.
 *
 * Pure business logic on top of the practitioner_strikes + practitioner_notices
 * tables. Never auto-terminates; strike #3 requires human signoff by Steve +
 * Domenic Romeo per Prompt #120 section 8.5.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type StrikeStanding = "good_standing" | "one_active" | "two_active" | "review_hold";

export interface StrikeStatus {
  practitionerId: string;
  activeCount: number;
  standing: StrikeStanding;
  nextRolloffAt: string | null;
  strikes: Array<{ id: string; strikeNumber: number; appliedAt: string; expiresAt: string }>;
}

const STRIKE_WINDOW_DAYS = 180;

export function computeStanding(activeCount: number): StrikeStanding {
  if (activeCount <= 0) return "good_standing";
  if (activeCount === 1) return "one_active";
  if (activeCount === 2) return "two_active";
  return "review_hold";
}

/**
 * Return the current strike state for a practitioner, filtering out any strikes
 * that have expired or been reversed.
 */
export async function getStrikeStatus(
  db: SupabaseClient,
  practitionerId: string,
): Promise<StrikeStatus> {
  const now = new Date().toISOString();
  const { data } = await db
    .from("practitioner_strikes")
    .select("id, strike_number, applied_at, expires_at, reversed")
    .eq("practitioner_id", practitionerId)
    .eq("reversed", false)
    .gt("expires_at", now)
    .order("applied_at", { ascending: true });
  const rows = (data ?? []) as Array<{ id: string; strike_number: number; applied_at: string; expires_at: string; reversed: boolean }>;
  const activeCount = rows.length;
  const standing = computeStanding(activeCount);
  const nextRolloffAt = rows[0]?.expires_at ?? null;
  return {
    practitionerId,
    activeCount,
    standing,
    nextRolloffAt,
    strikes: rows.map((r) => ({
      id: r.id,
      strikeNumber: r.strike_number,
      appliedAt: r.applied_at,
      expiresAt: r.expires_at,
    })),
  };
}

/**
 * Apply a strike for a practitioner on the back of a finding notice.
 * P0/P1 findings may trigger a strike; P2/P3 do not. Strike #3 is NOT
 * auto-applied — instead, returns { appliedStrike: null, requiresReview: true }.
 */
export async function maybeApplyStrike(
  db: SupabaseClient,
  practitionerId: string,
  noticeId: string,
  severity: "P0" | "P1" | "P2" | "P3" | "ADVISORY",
): Promise<{ appliedStrike: number | null; requiresReview: boolean }> {
  if (severity === "P2" || severity === "P3" || severity === "ADVISORY") {
    return { appliedStrike: null, requiresReview: false };
  }
  const status = await getStrikeStatus(db, practitionerId);
  if (status.activeCount >= 2) {
    // Would be strike #3 -> requires human decision per 8.5.
    return { appliedStrike: null, requiresReview: true };
  }
  const next = status.activeCount + 1;
  const appliedAt = new Date();
  const expiresAt = new Date(appliedAt.getTime() + STRIKE_WINDOW_DAYS * 86_400_000);
  await db.from("practitioner_strikes").insert({
    practitioner_id: practitionerId,
    notice_id: noticeId,
    strike_number: next,
    applied_at: appliedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    notes: `Auto-applied on notice ${noticeId} (severity ${severity}).`,
  });
  await db
    .from("practitioner_notices")
    .update({ strike_applied: true })
    .eq("id", noticeId);
  return { appliedStrike: next, requiresReview: false };
}
