"use server";

import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import {
  validateRecommendationText,
  validateSupplementCandidate,
} from "@/lib/agents/jeffery/guardrails";

// Prompt #140b Layer 3 hardening: existing { ok, error, violations } return
// shape preserved to avoid breaking client consumers. All Supabase calls now
// wrapped with withTimeout, and timeouts/errors are surfaced to safeLog.

type HannahInsightPayload = {
  timeRange: "7D" | "4W" | "3M" | "1Y";
  greeting: string;
  analysis: string;
  recommendation: string;
  focusArea: string;
  estimatedImpact: number;
};

const TTL_HOURS: Record<HannahInsightPayload["timeRange"], number> = {
  "7D": 6,
  "4W": 24,
  "3M": 72,
  "1Y": 168,
};

export async function persistHannahInsight(payload: HannahInsightPayload) {
  try {
    const supabase = createClient();

    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      "actions.hannah.persistInsight.auth",
    );
    if (!user) return { ok: false, error: "unauthenticated" };

    const textCheck = validateRecommendationText(
      `${payload.analysis} ${payload.recommendation}`,
    );
    if (!textCheck.ok) {
      return {
        ok: false,
        error: "guardrail_violation",
        violations: textCheck.violations,
      };
    }

    const expires = new Date(Date.now() + TTL_HOURS[payload.timeRange] * 3600_000);

    const sb = supabase as any;
    const { error } = await withTimeout(
      (async () => sb
        .from("hannah_trend_insights")
        .upsert(
          {
            user_id: user.id,
            time_range: payload.timeRange,
            greeting: payload.greeting,
            analysis: payload.analysis,
            recommendation: payload.recommendation,
            focus_area: payload.focusArea,
            estimated_impact: { points: payload.estimatedImpact },
            expires_at: expires.toISOString(),
            model_version: "v1",
          },
          { onConflict: "user_id,time_range" },
        ))(),
      8000,
      "actions.hannah.persistInsight.write",
    );

    if (error) {
      safeLog.error("actions.hannah.persist-insight", "supabase upsert error", {
        userId: user.id, error,
      });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error("actions.hannah.persist-insight", "database timeout", { error });
      return { ok: false, error: "timeout" };
    }
    safeLog.error("actions.hannah.persist-insight", "unexpected error", { error });
    return { ok: false, error: "server" };
  }
}

type JourneyRecPayload = {
  title: string;
  description: string;
  category: string;
  estimatedImpact: number;
  priority: number;
  icon: string;
};

export async function seedJourneyRecommendations(recs: JourneyRecPayload[]) {
  try {
    const supabase = createClient();

    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      "actions.hannah.seedJourneyRecs.auth",
    );
    if (!user) return { ok: false, error: "unauthenticated" };

    const allViolations = [];
    for (const r of recs) {
      const textCheck = validateRecommendationText(`${r.title} ${r.description}`);
      if (!textCheck.ok) allViolations.push(...textCheck.violations);
      if (r.icon === "supplement") {
        const supCheck = validateSupplementCandidate({
          productName: r.title,
          deliveryForm: "oral",
        });
        if (!supCheck.ok) allViolations.push(...supCheck.violations);
      }
    }
    if (allViolations.length > 0) {
      return { ok: false, error: "guardrail_violation", violations: allViolations };
    }

    const sb = supabase as any;

    await withTimeout(
      (async () => sb
        .from("journey_recommendations")
        .delete()
        .eq("user_id", user.id)
        .eq("status", "active"))(),
      8000,
      "actions.hannah.seedJourneyRecs.delete",
    );

    const expires = new Date(Date.now() + 7 * 24 * 3600_000);

    const rows = recs.map((r) => ({
      user_id: user.id,
      title: r.title,
      description: r.description,
      category: `${r.category}|${r.icon}`,
      estimated_impact: r.estimatedImpact,
      priority: r.priority,
      status: "active",
      expires_at: expires.toISOString(),
    }));

    const { error } = await withTimeout(
      (async () => sb.from("journey_recommendations").insert(rows))(),
      10000,
      "actions.hannah.seedJourneyRecs.insert",
    );
    if (error) {
      safeLog.error("actions.hannah.seed-journey-recs", "supabase insert error", {
        userId: user.id, recCount: rows.length, error,
      });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error("actions.hannah.seed-journey-recs", "database timeout", { error });
      return { ok: false, error: "timeout" };
    }
    safeLog.error("actions.hannah.seed-journey-recs", "unexpected error", { error });
    return { ok: false, error: "server" };
  }
}
