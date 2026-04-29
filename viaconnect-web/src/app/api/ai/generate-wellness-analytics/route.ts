import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAllCategories,
  buildEmptyUnifiedData,
} from "@/lib/scoring/unified/unifiedScoringEngine";
import type { DataLayer, UnifiedHealthData } from "@/lib/scoring/unified/types";
import { calculateConfidencePercentage } from "@/lib/scoring/unified/confidenceTiers";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const trigger = body.trigger || "manual";
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(supabase.auth.getUser(), 5000, "api.ai.generate-wellness.auth");
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error("api.ai.generate-wellness-analytics", "auth timeout", { error: err });
        return NextResponse.json({ error: "Authentication check timed out." }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // ── Assemble UnifiedHealthData from all sources in parallel ──

    const client = supabase as any;
    const today = new Date().toISOString().split("T")[0];
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().split("T")[0];

    const [
      assessRes, profileRes, interactionsRes, dailyRes,
      bodyRes, mealsRes, checkinRes, suppLogsRes,
      geneticsRes, currentSuppsRes,
    ] = await Promise.all([
      client.from("assessment_results").select("phase, data").eq("user_id", user.id),
      client.from("profiles").select("bio_optimization_score, bio_optimization_tier, health_concerns, family_history, date_of_birth, height_cm, weight_kg, caq_completed_at").eq("id", user.id).single(),
      client.from("medication_interactions").select("severity, resolved").eq("user_id", user.id),
      client.from("daily_scores").select("*").eq("user_id", user.id).gte("score_date", ninetyDaysAgo).order("score_date", { ascending: false }),
      client.from("body_tracker_scores").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
      client.from("meal_logs").select("*").eq("user_id", user.id).eq("meal_date", today),
      client.from("daily_checkins").select("check_in_date").eq("user_id", user.id).order("check_in_date", { ascending: false }).limit(90),
      client.from("supplement_logs").select("logged_at").eq("user_id", user.id).gte("logged_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
      client.from("genetic_variants").select("id").eq("user_id", user.id).limit(1),
      client.from("user_current_supplements").select("id").eq("user_id", user.id).eq("is_current", true),
    ]);

    const data = buildEmptyUnifiedData(user.id);

    // ── L1: CAQ ──
    const assessments = assessRes.data ?? [];
    const profile = profileRes.data;
    const getPhase = (p: number) => assessments.find((a: any) => a.phase === p)?.data as Record<string, any> | undefined;

    if (assessments.length > 0) {
      data.activeLayers.add("L1_CAQ");
      const p3 = getPhase(7) || {};
      const p4 = getPhase(8) || {};
      const p5 = getPhase(9) || {};
      const p6 = getPhase(4) || {};
      const p7 = getPhase(3) || {};

      const avgScores = (obj: Record<string, any>) => {
        const vals = Object.values(obj).filter((v): v is { score: number } =>
          typeof v === "object" && v !== null && "score" in v
        ).map(v => v.score);
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 5;
      };

      const concerns = (profile?.health_concerns as string[]) || [];
      const familyHistory = (profile?.family_history as any[]) || [];
      const meds = ((p6.medications as string[]) || []).filter(m => m && m !== "None");
      const supps = (p6.userSupplements as any[]) || [];
      const allergies = (p6.allergies as string[]) || [];

      const heightCm = profile?.height_cm;
      const weightKg = profile?.weight_kg;
      const bmi = heightCm && weightKg ? weightKg / ((heightCm / 100) ** 2) : null;
      const dob = profile?.date_of_birth;
      const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86_400_000)) : 30;

      data.caq = {
        ...data.caq,
        completed: true,
        daysSinceCompletion: profile?.caq_completed_at
          ? Math.floor((Date.now() - new Date(profile.caq_completed_at).getTime()) / 86_400_000)
          : 0,
        age, bmi,
        healthConcernCount: concerns.length,
        avgConcernSeverity: concerns.length > 0 ? 5 : 0,
        familyHistoryRiskLoad: Math.min(100, familyHistory.length * 15),
        familyHistoryCount: familyHistory.length,
        physicalSymptomAvg: avgScores(p3),
        neuroSymptomAvg: avgScores(p4),
        emotionalSymptomAvg: avgScores(p5),
        medicationCount: meds.length,
        medications: meds,
        supplementCount: supps.length,
        supplementCoverageScore: Math.min(100, supps.length * 15),
        allergyCount: allergies.length,
        sleepHours: parseFloat(String(p7.sleepHours || 7)),
        sleepQuality: parseFloat(String(p7.sleepQuality || 5)),
        exerciseFrequency: parseFloat(String(p7.exerciseFrequency || 3)),
        dietScore: parseFloat(String(p7.dietQuality || 5)),
        stressLevel: parseFloat(String(p7.stressLevel || 5)),
        smokingScore: p7.smoking === "never" ? 0 : p7.smoking === "former" ? 3 : 8,
        alcoholScore: parseFloat(String(p7.alcoholFrequency || 2)),
        sedentaryScore: parseFloat(String(p7.sedentaryHours || 5)),
      };

      // L2: Symptom Profile (bundled with CAQ Phases 3-5)
      data.activeLayers.add("L2_SYMPTOMS");
      const allSymScores = [
        ...Object.values(p3), ...Object.values(p4), ...Object.values(p5),
      ].filter((v): v is { score: number } => typeof v === "object" && v !== null && "score" in v)
        .map(v => v.score);
      data.symptoms = {
        available: true,
        retakenWithin30Days: false,
        retakenWithin14Days: false,
        stressScore: data.caq.emotionalSymptomAvg,
        hormonalScore: 5,
        hairNailScore: 5,
        skinScore: 5,
        weightScore: 5,
        highSeverityCount: allSymScores.filter(s => s >= 7).length,
        allScores: allSymScores,
      };
    }

    // ── L3: Daily Scores ──
    const dailyRows = (dailyRes.data ?? []) as any[];
    if (dailyRows.length > 0) {
      data.activeLayers.add("L3_DAILY");
      const latest = dailyRows[0];
      const checkinDates = new Set(((checkinRes.data ?? []) as any[]).map(r => r.check_in_date));
      let streak = 0;
      const cursor = new Date();
      for (let i = 0; i < 365; i++) {
        if (checkinDates.has(cursor.toISOString().slice(0, 10))) { streak++; cursor.setDate(cursor.getDate() - 1); }
        else break;
      }
      data.daily = {
        available: true,
        daysActive: dailyRows.length,
        consecutiveDays: streak,
        sleepGauge: latest.sleep_score ?? 0,
        exerciseGauge: latest.activity_score ?? 0,
        stepsGauge: latest.activity_score ?? 0,
        stressGauge: latest.mood_stress_score ?? 0,
        recoveryGauge: latest.energy_score ?? 0,
        streakGauge: Math.min(100, streak * 5),
        supplementsGauge: 50,
        nutritionGauge: latest.nutrition_score ?? 0,
      };
    }

    // ── L4: Body Tracker ──
    const bodyRow = (bodyRes.data ?? [])[0];
    if (bodyRow) {
      data.activeLayers.add("L4_BODY");
      data.bodyTracker = {
        available: true,
        weeksOfData: 4,
        bodyScore: bodyRow.total_score ?? 500,
        compositionGrade: bodyRow.composition_grade ?? "C",
        weightGrade: bodyRow.weight_grade ?? "C",
        muscleGrade: bodyRow.muscle_grade ?? "C",
        cardioGrade: bodyRow.cardio_grade ?? "C",
        metabolicGrade: bodyRow.metabolic_grade ?? "C",
        bmiOutOfRange: data.caq.bmi ? (data.caq.bmi < 18.5 || data.caq.bmi > 30) : false,
        restingHRAnomaly: false,
        bodyFatPercent: bodyRow.body_fat_pct ?? null,
        weightTrendStable: true,
        hrvTrend: null,
        restingHR: bodyRow.resting_hr ?? null,
        metabolicAge: bodyRow.metabolic_age ?? null,
      };
    }

    // ── L5: Nutrition ──
    const meals = (mealsRes.data ?? []) as any[];
    if (meals.length > 0) {
      data.activeLayers.add("L5_NUTRITION");
      const mealScores = meals.map((m: any) => m.meal_score ?? (m.quality_rating ? m.quality_rating * 25 : 50));
      data.nutrition = {
        available: true,
        mealsLogged: meals.length,
        consecutiveDaysLogged: 1,
        nutritionScore: Math.round(mealScores.reduce((a: number, b: number) => a + b, 0) / mealScores.length),
        macroBalance: 50,
        micronutrientDensity: 50,
      };
    }

    // ── L6: Protocol Adherence ──
    const suppLogs = (suppLogsRes.data ?? []) as any[];
    const currentSupps = (currentSuppsRes.data ?? []) as any[];
    if (suppLogs.length > 0 || currentSupps.length > 0) {
      data.activeLayers.add("L6_PROTOCOL");
      const interactions = (interactionsRes.data ?? []) as any[];
      const severeCount = interactions.filter((i: any) => i.severity === "major" || i.severity === "severe").length;
      const unresolvedCount = interactions.filter((i: any) => !i.resolved).length;
      const expectedDoses = currentSupps.length * 30;
      const completionRate = expectedDoses > 0 ? Math.min(100, Math.round((suppLogs.length / expectedDoses) * 100)) : 0;
      data.protocol = {
        available: true,
        daysActive: suppLogs.length,
        completionRate,
        streakLength: 0,
        interactionCount: interactions.length,
        severeInteractionCount: severeCount,
        maxInteractionSeverity: severeCount > 0 ? "severe" : interactions.length > 0 ? "warning" : "none",
        unresolvedInteractionCount: unresolvedCount,
      };
    }

    // ── L8: Genetics ──
    if ((geneticsRes.data ?? []).length > 0) {
      data.activeLayers.add("L8_GENETICS");
      data.genetics = { ...data.genetics, available: true, panelCount: 1, optimizationBonus: 5 };
    }

    // Bio Optimization from profile
    data.bioOptimizationScore = profile?.bio_optimization_score ?? 0;
    data.bioOptimizationTier = profile?.bio_optimization_tier ?? "Developing";
    data.daysSinceOnboarding = data.caq.daysSinceCompletion;

    // ── Calculate all 10 categories ──
    const result = calculateAllCategories(data, trigger);

    // ── Build backward-compatible categories array for WellnessSnapshot ──
    const categoriesArray = Object.entries(result.details).map(([id, detail]) => ({
      id,
      name: getCategoryName(id),
      icon: getCategoryIcon(id),
      score: detail.score,
      trend: detail.trend,
      trendDelta: detail.trendDelta,
      dataCompleteness: Math.round(detail.dataCompleteness * 100),
      insightCount: detail.insights.length,
      isNew: false,
      insights: detail.insights,
      recommendations: detail.recommendations,
    }));

    // ── Persist to wellness_analytics ──
    const confPct = calculateConfidencePercentage(data.activeLayers);
    await client.from("wellness_analytics").upsert({
      user_id: user.id,
      summary: result.summary,
      categories: categoriesArray,
      trigger,
      data_sources_used: result.activeLayers,
      calculated_at: new Date().toISOString(),
      next_calculation_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      unified_scores: result.scores,
      confidence_tier: result.confidence.name,
      confidence_pct: confPct,
      active_layers: result.activeLayers,
      missing_layers: result.missingLayers,
      top_category: result.topCategory,
      low_category: result.lowCategory,
      scoring_version: "v2",
    }, { onConflict: "user_id,calculated_at" }).then(() => {}, () => {});

    // ── Audit log ──
    await client.from("scoring_audit_log").insert({
      user_id: user.id,
      trigger_event: trigger,
      active_layers: result.activeLayers,
      confidence_tier: result.confidence.name,
      confidence_pct: confPct,
      scores: result.scores,
    }).then(() => {}, () => {});

    return NextResponse.json({
      summary: result.summary,
      categories: categoriesArray,
      scores: result.scores,
      confidence: { tier: result.confidence.name, label: result.confidence.label, percentage: confPct },
      topCategory: result.topCategory,
      lowCategory: result.lowCategory,
      calculatedAt: result.calculatedAt,
    });
  } catch (err) {
    safeLog.error("api.ai.generate-wellness-analytics", "unexpected error", { error: err });
    return NextResponse.json({ error: "Analytics generation failed" }, { status: 500 });
  }
}

function getCategoryName(id: string): string {
  const names: Record<string, string> = {
    risk_radar: "Risk Radar", nutrient_profile: "Nutrient Profile",
    protocol_effectiveness: "Protocol Effectiveness", metabolic_health: "Metabolic Health",
    immune_inflammation: "Immune & Inflammation", bio_optimization_trends: "Bio Optimization Trends",
    stress_mood: "Stress & Mood", symptom_landscape: "Symptom Landscape",
    medication_intel: "Medication Intelligence", sleep_recovery: "Sleep & Recovery",
  };
  return names[id] ?? id;
}

function getCategoryIcon(id: string): string {
  const icons: Record<string, string> = {
    risk_radar: "\uD83C\uDFAF", nutrient_profile: "\uD83E\uDDEA",
    protocol_effectiveness: "\uD83D\uDCC8", metabolic_health: "\u2696\uFE0F",
    immune_inflammation: "\uD83D\uDEE1\uFE0F", bio_optimization_trends: "\uD83D\uDCC9",
    stress_mood: "\uD83E\uDDE0", symptom_landscape: "\uD83D\uDCCA",
    medication_intel: "\uD83D\uDC8A", sleep_recovery: "\uD83C\uDF19",
  };
  return icons[id] ?? "";
}
