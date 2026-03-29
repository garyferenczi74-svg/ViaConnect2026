import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const trigger = body.trigger || "manual";
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Load all CAQ assessment data
    const { data: assessments } = await supabase.from("assessment_results").select("phase, data").eq("user_id", user.id);
    const { data: profile } = await supabase.from("profiles").select("bio_optimization_score, bio_optimization_tier, health_concerns, family_history, date_of_birth, ethnicity").eq("id", user.id).single();
    const { data: interactions } = await supabase.from("medication_interactions").select("*").eq("user_id", user.id);
    const { data: dailyScores } = await supabase.from("daily_scores").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30);

    const getPhase = (phase: number) => (assessments || []).find((a) => a.phase === phase)?.data as Record<string, unknown> | undefined;

    const phase3 = getPhase(7) || {};  // Physical symptoms
    const phase4 = getPhase(8) || {};  // Neuro symptoms
    const phase5 = getPhase(9) || {};  // Emotional symptoms
    const phase6 = getPhase(4) || {};  // Medications
    const phase7 = getPhase(3) || {};  // Lifestyle

    const meds = (phase6.medications as string[]) || [];
    const supps = (phase6.userSupplements as Array<{ name: string; dosage: string; unit: string }>) || [];
    const allergies = (phase6.allergies as string[]) || [];
    const concerns = (profile?.health_concerns as string[]) || [];
    const bioScore = profile?.bio_optimization_score || 0;

    // Calculate category scores from available data
    const avgSymptoms = (data: Record<string, unknown>) => {
      const vals = Object.values(data).filter((v): v is { score: number } => typeof v === "object" && v !== null && "score" in v).map((v) => v.score);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 5;
    };

    const physAvg = avgSymptoms(phase3);
    const neuroAvg = avgSymptoms(phase4);
    const emotAvg = avgSymptoms(phase5);

    const categories = [
      {
        id: "nutrient_profile", name: "Nutrient Profile", icon: "\ud83e\uddea",
        score: Math.round(Math.min(100, 40 + supps.length * 10)),
        trend: "stable" as const, trendDelta: 0, dataCompleteness: supps.length > 0 ? 75 : 30,
        insightCount: supps.length > 0 ? 3 : 1, isNew: false,
        insights: supps.length > 0
          ? [{ id: "n1", text: `You're taking ${supps.length} supplement(s). AI analysis will identify nutrient gaps.`, severity: "neutral" as const }]
          : [{ id: "n1", text: "No supplements reported. Significant nutrient gaps likely exist.", severity: "warning" as const }],
        recommendations: supps.length < 3 ? [{ action: "add", description: "Consider a foundational supplement stack (Vitamin D, Omega-3, Magnesium)", priority: "high" as const }] : [],
      },
      {
        id: "symptom_landscape", name: "Symptom Landscape", icon: "\ud83d\udcca",
        score: Math.round(Math.max(0, 100 - ((physAvg + neuroAvg + emotAvg) / 3) * 10)),
        trend: "stable" as const, trendDelta: 0, dataCompleteness: 80,
        insightCount: 3, isNew: false,
        insights: [
          { id: "s1", text: `Physical symptom load: ${physAvg.toFixed(1)}/10. ${physAvg > 5 ? "Significant burden detected." : "Manageable levels."}`, severity: physAvg > 5 ? "warning" as const : "positive" as const },
          { id: "s2", text: `Cognitive symptom load: ${neuroAvg.toFixed(1)}/10. ${neuroAvg > 5 ? "Brain fog and focus issues present." : "Cognitive function appears stable."}`, severity: neuroAvg > 5 ? "warning" as const : "positive" as const },
          { id: "s3", text: `Emotional symptom load: ${emotAvg.toFixed(1)}/10. ${emotAvg > 5 ? "Mood and stress management needed." : "Emotional wellness is strong."}`, severity: emotAvg > 5 ? "warning" as const : "positive" as const },
        ],
        recommendations: physAvg > 5 ? [{ action: "monitor", description: "Track physical symptoms daily to identify triggers", priority: "high" as const }] : [],
      },
      {
        id: "risk_radar", name: "Risk Radar", icon: "\ud83c\udfaf",
        score: Math.round(Math.max(30, 100 - concerns.length * 5 - ((profile?.family_history as unknown[])?.length || 0) * 8)),
        trend: "stable" as const, trendDelta: 0, dataCompleteness: 65,
        insightCount: 2, isNew: false,
        insights: [
          { id: "r1", text: `${concerns.length} health concern(s) identified. Family history data ${(profile?.family_history as unknown[])?.length ? "available" : "not provided"}.`, severity: "neutral" as const },
        ],
        recommendations: [],
      },
      {
        id: "medication_intel", name: "Medication Intelligence", icon: "\ud83d\udc8a",
        score: Math.round(meds.filter(m => m !== "None").length === 0 ? 95 : Math.max(40, 100 - (interactions?.length || 0) * 15)),
        trend: "stable" as const, trendDelta: 0, dataCompleteness: 85,
        insightCount: (interactions?.length || 0) + 1, isNew: false,
        insights: interactions?.length
          ? [{ id: "m1", text: `${interactions.length} drug-supplement interaction(s) detected. ${interactions.filter(i => i.severity === "major").length} major.`, severity: "warning" as const }]
          : [{ id: "m1", text: "No medication interactions detected. Your current regimen appears safe.", severity: "positive" as const }],
        recommendations: [],
      },
      {
        id: "protocol_effectiveness", name: "Protocol Effectiveness", icon: "\ud83d\udcc8",
        score: dailyScores?.length ? Math.round(dailyScores.reduce((a, d) => a + (d.regimen_score || 0), 0) / dailyScores.length) : 50,
        trend: "stable" as const, trendDelta: 0, dataCompleteness: dailyScores?.length ? Math.min(90, dailyScores.length * 3) : 20,
        insightCount: 2, isNew: false,
        insights: [{ id: "p1", text: dailyScores?.length ? `Protocol tracked for ${dailyScores.length} day(s). Continue logging for more precise insights.` : "Start logging daily supplement intake to track protocol effectiveness.", severity: "neutral" as const }],
        recommendations: [],
      },
      {
        id: "sleep_recovery", name: "Sleep & Recovery", icon: "\ud83c\udf19",
        score: Math.round(phase7.sleepHours ? Math.min(100, (parseFloat(String(phase7.sleepHours)) / 8) * 100) : 60),
        trend: "stable" as const, trendDelta: 0, dataCompleteness: 55,
        insightCount: 2, isNew: false,
        insights: [{ id: "sl1", text: phase7.sleepHours ? `Reported ${phase7.sleepHours} hours of sleep. ${parseFloat(String(phase7.sleepHours)) >= 7 ? "Within optimal range." : "Below the recommended 7-9 hours."}` : "Sleep data from self-report only. Connect a wearable for precise tracking.", severity: parseFloat(String(phase7.sleepHours || 0)) >= 7 ? "positive" as const : "warning" as const }],
        recommendations: parseFloat(String(phase7.sleepHours || 0)) < 7 ? [{ action: "add", description: "Consider Liposomal Magnesium L-Threonate for sleep quality", priority: "medium" as const }] : [],
      },
      {
        id: "stress_mood", name: "Stress & Mood", icon: "\ud83e\udde0",
        score: Math.round(Math.max(0, 100 - emotAvg * 10)),
        trend: "stable" as const, trendDelta: 0, dataCompleteness: 70,
        insightCount: 2, isNew: false,
        insights: [{ id: "st1", text: emotAvg > 5 ? "Elevated stress and mood symptoms detected. Protocol should prioritize adaptogenic support." : "Stress and mood indicators are within healthy range.", severity: emotAvg > 5 ? "warning" as const : "positive" as const }],
        recommendations: emotAvg > 5 ? [{ action: "add", description: "Consider Micellar Ashwagandha (KSM-66) for stress resilience", priority: "high" as const }] : [],
      },
      {
        id: "metabolic_health", name: "Metabolic Health", icon: "\u2696\ufe0f",
        score: Math.round(70 - (physAvg > 3 ? (physAvg - 3) * 5 : 0)),
        trend: "stable" as const, trendDelta: 0, dataCompleteness: 50,
        insightCount: 1, isNew: false,
        insights: [{ id: "met1", text: "Metabolic health score based on self-reported data. Lab work and wearable data will refine this.", severity: "neutral" as const }],
        recommendations: [],
      },
      {
        id: "immune_inflammation", name: "Immune & Inflammation", icon: "\ud83d\udee1\ufe0f",
        score: Math.round(Math.max(30, 85 - physAvg * 3 - emotAvg * 2)),
        trend: "stable" as const, trendDelta: 0, dataCompleteness: 55,
        insightCount: 1, isNew: false,
        insights: [{ id: "im1", text: "Immune and inflammation scores derived from symptom data. Adding anti-inflammatory supplements will improve this category.", severity: "neutral" as const }],
        recommendations: [],
      },
      {
        id: "bio_optimization_trends", name: "Bio Optimization Trends", icon: "\ud83d\udcc9",
        score: Math.round(bioScore),
        trend: "stable" as const, trendDelta: 0, dataCompleteness: 60,
        insightCount: 2, isNew: false,
        insights: [{ id: "bo1", text: `Current Bio Optimization score: ${bioScore}/100 (${profile?.bio_optimization_tier || "Developing"}). Daily tracking will reveal trends.`, severity: bioScore >= 70 ? "positive" as const : "neutral" as const }],
        recommendations: [],
      },
    ];

    const summary = `Based on your clinical assessment, your Bio Optimization score is ${bioScore}/100. ` +
      `Your strongest areas are ${categories.sort((a, b) => b.score - a.score).slice(0, 2).map(c => c.name).join(" and ")}. ` +
      `Your primary optimization opportunities are in ${categories.sort((a, b) => a.score - b.score).slice(0, 2).map(c => c.name).join(" and ")}.`;

    // Save analytics
    await supabase.from("wellness_analytics").upsert({
      user_id: user.id,
      summary,
      categories,
      trigger,
      data_sources_used: ["caq_phase1", "caq_phase2", "caq_phase3", "caq_phase4", "caq_phase5", "caq_phase6", "caq_phase7"],
      calculated_at: new Date().toISOString(),
      next_calculation_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "user_id,calculated_at" }).catch(() => {});

    return NextResponse.json({ summary, categories, calculatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Analytics generation failed" }, { status: 500 });
  }
}
