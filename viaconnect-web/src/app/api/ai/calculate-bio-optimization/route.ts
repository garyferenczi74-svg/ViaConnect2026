// Bio Optimization Score compute entry point (Path Z asynchronous).
//
// Phase F of bundled Prompts #159 + #161 converts this route from a
// synchronous compute to a 202 Accepted enqueue:
//   1. Enqueue one bos_compute_queue row (source=caq_completed,
//      bypass_cooldown=true) so the worker drains it next cron cycle
//      (up to 5 min window).
//   2. Kick the canonical computeBOS pipeline fire and forget so the
//      Hannah backed score lands faster than the cron interval. We
//      tried (a) waitUntil from @vercel/functions and (b) after from
//      next/server; neither is available in this Next.js 14.2.35 +
//      no @vercel/functions environment, so we fall back to option
//      (c): void computeBOS(...).catch(console.error). The work runs
//      best effort inside the route's lifetime; the worker cron is
//      the durability backstop.
//   3. Synchronously derive provisional strengths / opportunities for
//      the immediate UI response. These match the Phase E logic
//      (symptom and lifestyle heuristics) and are NOT Hannah outputs.
//      The canonical Hannah explanation lands via GET /api/bos/current
//      once the worker has run.
//   4. Update non BOS profile fields synchronously (tier label,
//      strengths, opportunities, calculated_at, assessment_completed,
//      updated_at). The bio_optimization_score column is owned by the
//      project_bio_optimization_score trigger and is intentionally
//      not written here.
//   5. Return HTTP 202 with status=pending, score=null, provisional
//      tier and tierColor, strengths and opportunities arrays, and
//      a polling instruction message.
//
// Callers must handle score=null gracefully. Current callers:
//   src/app/(auth)/onboarding/[step]/page.tsx -> reads bioData.score
//     with || 0 fallback, then polls /api/bos/current (Phase F).
//   src/lib/ai/event-cascade.ts -> fire and forget, ignores response.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBioOptimizationTier } from "@/lib/scoring/bio-optimization";
import { computeBOS } from "@/lib/scoring/bio-optimization-score";
import { enqueueBOSCompute } from "@/lib/scoring/queue";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function POST() {
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(supabase.auth.getUser(), 5000, "api.ai.calculate-bio.auth");
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error("api.ai.calculate-bio-optimization", "auth timeout", { error: err });
        return NextResponse.json({ error: "Authentication check timed out." }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Load all CAQ assessment data for the provisional UI derivation.
    const { data: assessments } = await supabase
      .from("assessment_results")
      .select("phase, data")
      .eq("user_id", user.id);

    if (!assessments?.length) {
      return NextResponse.json({ error: "No assessment data found" }, { status: 404 });
    }

    const getPhase = (phase: number) => assessments.find((a) => a.phase === phase)?.data as Record<string, unknown> | undefined;

    const symptomsPhysical = getPhase(7) || {};
    const symptomsNeuro = getPhase(8) || {};
    const symptomsEmotional = getPhase(9) || {};
    const medications = getPhase(4) || {};
    const lifestyle = getPhase(3) || {};

    const avgSymptoms = (data: Record<string, unknown>) => {
      const vals = Object.values(data)
        .filter((v): v is { score: number } => typeof v === "object" && v !== null && "score" in v)
        .map((v) => v.score);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    const supps = (medications.userSupplements as unknown[]) || [];

    const physicalSymptomAvg = avgSymptoms(symptomsPhysical);
    const neuroSymptomAvg = avgSymptoms(symptomsNeuro);
    const emotionalSymptomAvg = avgSymptoms(symptomsEmotional);
    const sleepScore = parseFloat(String(lifestyle.sleepHours || 7));
    const exerciseScore = lifestyle.exercise === "Daily" ? 10 : lifestyle.exercise === "5-6x/week" ? 8 : lifestyle.exercise === "3-4x/week" ? 6 : lifestyle.exercise === "1-2x/week" ? 3 : 0;
    const stressScore = lifestyle.stressLevel === "Very High" ? 9 : lifestyle.stressLevel === "High" ? 7 : lifestyle.stressLevel === "Moderate" ? 5 : lifestyle.stressLevel === "Low" ? 3 : 1;

    // Provisional strengths / opportunities for the immediate UI. These
    // are derived from symptom and lifestyle slices, not from Hannah.
    const strengths: string[] = [];
    const opportunities: string[] = [];

    if (sleepScore >= 7) strengths.push("Quality sleep habits");
    if (exerciseScore >= 6) strengths.push("Active exercise routine");
    if (stressScore <= 4) strengths.push("Well managed stress levels");
    if (supps.length >= 3) strengths.push("Proactive supplement regimen");
    if (physicalSymptomAvg <= 3) strengths.push("Low physical symptom burden");

    if (physicalSymptomAvg > 5) opportunities.push("Physical symptom management");
    if (neuroSymptomAvg > 5) opportunities.push("Cognitive and sleep optimization");
    if (emotionalSymptomAvg > 5) opportunities.push("Mood and stress support");
    if (stressScore >= 7) opportunities.push("Stress reduction strategies");
    if (supps.length < 3) opportunities.push("Supplement protocol optimization");
    if (exerciseScore < 4) opportunities.push("Increasing physical activity");

    const trimmedStrengths = strengths.slice(0, 3);
    const trimmedOpportunities = opportunities.slice(0, 3);

    // Provisional tier label / color for the 202 payload. Hannah's
    // canonical score will replace this once /api/bos/current is polled.
    const provisionalScore = Math.round(
      ((10 - Math.max(physicalSymptomAvg, neuroSymptomAvg, emotionalSymptomAvg)) / 10) * 100
    );
    const provisionalTier = getBioOptimizationTier(Math.max(0, Math.min(100, provisionalScore)));

    // Update non BOS profile fields synchronously. bio_optimization_score
    // is OWNED BY the projection trigger and never written from app code.
    await supabase.from("profiles").update({
      bio_optimization_tier: provisionalTier.label,
      bio_optimization_strengths: trimmedStrengths,
      bio_optimization_opportunities: trimmedOpportunities,
      bio_optimization_calculated_at: new Date().toISOString(),
      assessment_completed: true,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    // Enqueue a canonical compute event so the worker drains it on the
    // next cron cycle (worst case 5 min). bypass_cooldown=true because
    // CAQ submit must always trigger a recompute.
    try {
      await enqueueBOSCompute({
        userId: user.id,
        source: "caq_completed",
        bypass_cooldown: true,
        payload: { phase_data_summary: { phases: assessments.length } },
        supabase,
      });
    } catch (enqueueErr) {
      safeLog.error("api.ai.calculate-bio-optimization", "enqueue failed", { error: enqueueErr });
      // Continue: the fire and forget computeBOS below is the fallback.
    }

    // Fire and forget canonical compute so the UI does not wait for the
    // worker cycle in the common path. Option (c) per the route header
    // comment: neither @vercel/functions waitUntil nor next/server after
    // is available in this environment.
    void computeBOS(user.id, {
      userId: user.id,
      source: "caq_completed",
      bypassCooldown: true,
      payload: {},
    }).catch((err) => {
      safeLog.error("api.ai.calculate-bio-optimization", "background_compute_failed", { error: err });
    });

    return NextResponse.json({
      status: "pending",
      score: null,
      tier: provisionalTier.label,
      tierColor: provisionalTier.color,
      strengths: trimmedStrengths,
      opportunities: trimmedOpportunities,
      message: "Your Bio Optimization Score is being computed. Poll /api/bos/current to check status.",
    }, { status: 202 });
  } catch (err) {
    safeLog.error("api.ai.calculate-bio-optimization", "unexpected error", { error: err });
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
