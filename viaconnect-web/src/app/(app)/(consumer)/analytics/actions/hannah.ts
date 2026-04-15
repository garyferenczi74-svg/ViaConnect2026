"use server";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const expires = new Date(Date.now() + TTL_HOURS[payload.timeRange] * 3600_000);

  const sb = supabase as any;
  const { error } = await sb
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
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const sb = supabase as any;

  // Fresh-seed: remove active recs for this user, then insert the new set
  await sb
    .from("journey_recommendations")
    .delete()
    .eq("user_id", user.id)
    .eq("status", "active");

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

  const { error } = await sb.from("journey_recommendations").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
