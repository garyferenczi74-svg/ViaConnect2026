/**
 * Clearance-drift aggregator. Watches practitioner_good_faith_events for
 * bad-faith outcomes; when a practitioner accumulates 3 within 60 days,
 * fires MARSHALL.PRECHECK.CLEARANCE_DRIFT_PATTERN and writes a Jeffery
 * message so Steve Rica sees it.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_DAYS = 60;
const THRESHOLD = 3;

export interface DriftCheckResult {
  practitionerId: string;
  badFaithCount60d: number;
  triggered: boolean;
}

export async function checkDriftPattern(
  db: SupabaseClient,
  practitionerId: string,
): Promise<DriftCheckResult> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const { count } = await db
    .from("precheck_good_faith_events")
    .select("id", { count: "exact", head: true })
    .eq("practitioner_id", practitionerId)
    .eq("outcome", "bad_faith_penalty")
    .gte("created_at", since);
  const badFaithCount60d = count ?? 0;
  const triggered = badFaithCount60d >= THRESHOLD;

  if (triggered) {
    try {
      await db.rpc("jeffery_emit_message", {
        p_category: "error_escalation",
        p_severity: "review_required",
        p_title: `Clearance drift pattern for practitioner ${practitionerId.slice(0, 8)}`,
        p_summary: `${badFaithCount60d} bad-faith clearance events in the last ${WINDOW_DAYS} days. Route to Steve Rica for pattern review.`,
        p_detail: { practitionerId, badFaithCount60d, windowDays: WINDOW_DAYS },
        p_source_agent: "marshall_precheck",
        p_source_context: null,
        p_proposed_action: { action: "pattern_review_steve_rica" },
      });
    } catch {
      // best-effort
    }
  }

  return { practitionerId, badFaithCount60d, triggered };
}
