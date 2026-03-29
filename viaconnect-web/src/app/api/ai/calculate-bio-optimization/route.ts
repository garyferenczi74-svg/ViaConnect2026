import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateInitialBioOptimization, getBioOptimizationTier } from "@/lib/scoring/bio-optimization";

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Load all CAQ assessment data
    const { data: assessments } = await supabase
      .from("assessment_results")
      .select("phase, data")
      .eq("user_id", user.id);

    if (!assessments?.length) {
      return NextResponse.json({ error: "No assessment data found" }, { status: 404 });
    }

    const getPhase = (phase: number) => assessments.find((a) => a.phase === phase)?.data as Record<string, unknown> | undefined;

    // Extract data from each phase
    const demographics = getPhase(1) || {};
    const healthConcerns = getPhase(6) || {};
    const symptomsPhysical = getPhase(7) || {};
    const symptomsNeuro = getPhase(8) || {};
    const symptomsEmotional = getPhase(9) || {};
    const medications = getPhase(4) || {};
    const lifestyle = getPhase(3) || {};

    // Calculate symptom averages
    const avgSymptoms = (data: Record<string, unknown>) => {
      const vals = Object.values(data)
        .filter((v): v is { score: number } => typeof v === "object" && v !== null && "score" in v)
        .map((v) => v.score);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    const age = demographics.age ? parseInt(String(demographics.age)) : 35;
    const height = demographics.height ? parseFloat(String(demographics.height)) : 0;
    const weight = demographics.weight ? parseFloat(String(demographics.weight)) : 0;
    const bmi = height > 0 && weight > 0 ? weight / ((height / 100) ** 2) : null;

    const concerns = (healthConcerns.healthConcerns as string[]) || [];
    const family = (healthConcerns.familyHistory as Array<{ condition: string }>) || [];
    const meds = (medications.medications as string[]) || [];
    const allergies = (medications.allergies as string[]) || [];
    const supps = (medications.userSupplements as unknown[]) || [];

    const input = {
      age,
      bmi,
      healthConcernCount: concerns.filter((c) => c !== "none_of_the_above").length,
      familyHistoryRiskLoad: family.filter((f) => f.condition !== "none_known" && f.condition !== "prefer_not_to_say").length,
      physicalSymptomAvg: avgSymptoms(symptomsPhysical),
      neuroSymptomAvg: avgSymptoms(symptomsNeuro),
      emotionalSymptomAvg: avgSymptoms(symptomsEmotional),
      medicationCount: meds.filter((m) => m !== "None").length,
      interactionCount: 0,
      supplementCoverageScore: Math.min(100, supps.length * 15),
      allergyCount: allergies.filter((a) => a !== "None").length,
      sleepScore: parseFloat(String(lifestyle.sleepHours || 7)),
      exerciseScore: lifestyle.exercise === "Daily" ? 10 : lifestyle.exercise === "5-6x/week" ? 8 : lifestyle.exercise === "3-4x/week" ? 6 : lifestyle.exercise === "1-2x/week" ? 3 : 0,
      stressScore: lifestyle.stressLevel === "Very High" ? 9 : lifestyle.stressLevel === "High" ? 7 : lifestyle.stressLevel === "Moderate" ? 5 : lifestyle.stressLevel === "Low" ? 3 : 1,
      dietScore: lifestyle.diet && lifestyle.diet !== "Standard" ? 7 : 5,
      hasGenex360: false,
      genex360OptimizationBonus: 0,
    };

    const score = calculateInitialBioOptimization(input);
    const tier = getBioOptimizationTier(score);

    // Determine strengths and opportunities
    const strengths: string[] = [];
    const opportunities: string[] = [];

    if (input.sleepScore >= 7) strengths.push("Quality sleep habits");
    if (input.exerciseScore >= 6) strengths.push("Active exercise routine");
    if (input.stressScore <= 4) strengths.push("Well-managed stress levels");
    if (supps.length >= 3) strengths.push("Proactive supplement regimen");
    if (input.physicalSymptomAvg <= 3) strengths.push("Low physical symptom burden");

    if (input.physicalSymptomAvg > 5) opportunities.push("Physical symptom management");
    if (input.neuroSymptomAvg > 5) opportunities.push("Cognitive and sleep optimization");
    if (input.emotionalSymptomAvg > 5) opportunities.push("Mood and stress support");
    if (input.stressScore >= 7) opportunities.push("Stress reduction strategies");
    if (supps.length < 3) opportunities.push("Supplement protocol optimization");
    if (input.exerciseScore < 4) opportunities.push("Increasing physical activity");

    // Save to profile
    await supabase.from("profiles").update({
      bio_optimization_score: score,
      bio_optimization_tier: tier.label,
      bio_optimization_strengths: strengths.slice(0, 3),
      bio_optimization_opportunities: opportunities.slice(0, 3),
      bio_optimization_calculated_at: new Date().toISOString(),
      assessment_completed: true,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    // Save to history
    await supabase.from("bio_optimization_history").upsert({
      user_id: user.id,
      date: new Date().toISOString().split("T")[0],
      score,
      source: "caq_initial",
      breakdown: input,
    }, { onConflict: "user_id,date" }).catch(() => {});

    return NextResponse.json({
      score,
      tier: tier.label,
      tierColor: tier.color,
      strengths: strengths.slice(0, 3),
      opportunities: opportunities.slice(0, 3),
    });
  } catch {
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
