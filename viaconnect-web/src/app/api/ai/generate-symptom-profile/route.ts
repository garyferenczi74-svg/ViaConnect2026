import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("symptoms_physical, symptoms_neurological, symptoms_emotional, health_concerns, family_history, bio_optimization_score, date_of_birth, ethnicity").eq("id", user.id).single();
    const { data: assessments } = await supabase.from("assessment_results").select("phase, data").eq("user_id", user.id);

    const getPhase = (phase: number) => (assessments || []).find((a) => a.phase === phase)?.data as Record<string, unknown> | undefined;
    const phase4 = getPhase(4) || {};
    const phase3 = getPhase(3) || {};

    const sympPhys = (profile?.symptoms_physical || {}) as Record<string, { score: number; description: string }>;
    const sympNeuro = (profile?.symptoms_neurological || {}) as Record<string, { score: number; description: string }>;
    const sympEmot = (profile?.symptoms_emotional || {}) as Record<string, { score: number; description: string }>;

    // Check if any symptom data exists
    const hasData = Object.keys(sympPhys).length > 0 || Object.keys(sympNeuro).length > 0 || Object.keys(sympEmot).length > 0;
    if (!hasData) {
      return NextResponse.json({ status: "no_data", message: "Complete your Clinical Assessment Questionnaire to generate your Symptom Profile" });
    }

    // Extract scores and build top symptoms
    function extractSymptoms(data: Record<string, { score: number; description: string }>, category: string) {
      return Object.entries(data).map(([key, val]) => ({
        name: key.replace(/_severity$/, "").replace(/_/g, " "),
        category,
        severity: val?.score ?? 0,
        patientDescription: val?.description || "",
      }));
    }

    const allSymptoms = [
      ...extractSymptoms(sympPhys, "physical"),
      ...extractSymptoms(sympNeuro, "neurological"),
      ...extractSymptoms(sympEmot, "emotional"),
    ].sort((a, b) => b.severity - a.severity);

    const avgSeverity = allSymptoms.length > 0 ? allSymptoms.reduce((s, i) => s + i.severity, 0) / allSymptoms.length : 0;
    const burdenScore = Math.round(Math.min(100, avgSeverity * 10));
    const burdenTier = burdenScore >= 70 ? "Severe" : burdenScore >= 50 ? "Significant" : burdenScore >= 30 ? "Moderate" : burdenScore >= 15 ? "Mild" : "Minimal";

    const topSymptoms = allSymptoms.filter(s => s.severity > 0).slice(0, 8).map(s => ({
      ...s,
      clinicalContext: s.severity >= 7 ? "High severity. This symptom significantly impacts daily function and warrants investigation." : s.severity >= 4 ? "Moderate severity. Monitor this symptom and consider discussing with your practitioner." : "Low severity. Continue monitoring for changes.",
      trend: s.severity >= 7 ? "concerning" as const : "stable" as const,
    }));

    // Identify clusters
    const clusters: { name: string; symptoms: string[]; possibleConnection: string; suggestedInvestigation: string }[] = [];
    const fatigueSymptoms = allSymptoms.filter(s => ["fatigue", "low energy", "brain fog", "poor focus"].includes(s.name) && s.severity >= 4);
    if (fatigueSymptoms.length >= 2) clusters.push({ name: "Energy & Cognitive Complex", symptoms: fatigueSymptoms.map(s => s.name), possibleConnection: "Fatigue, brain fog, and focus issues often share root causes including mitochondrial dysfunction, B12 deficiency, or thyroid imbalance.", suggestedInvestigation: "Consider B12, ferritin, TSH, and mitochondrial markers" });

    const moodSymptoms = allSymptoms.filter(s => ["anxiety", "low mood", "irritability", "mood swings", "stress"].includes(s.name) && s.severity >= 4);
    if (moodSymptoms.length >= 2) clusters.push({ name: "Mood & Stress Complex", symptoms: moodSymptoms.map(s => s.name), possibleConnection: "Anxiety, mood changes, and stress often indicate HPA axis dysregulation or neurotransmitter imbalance.", suggestedInvestigation: "Consider cortisol, DHEA, and neurotransmitter metabolite testing" });

    const sleepSymptoms = allSymptoms.filter(s => ["falling asleep", "sleep quality", "sleep apnea"].includes(s.name) && s.severity >= 4);
    if (sleepSymptoms.length >= 1) clusters.push({ name: "Sleep Disruption Pattern", symptoms: sleepSymptoms.map(s => s.name), possibleConnection: "Poor sleep cascades into fatigue, cognitive issues, and mood disturbances.", suggestedInvestigation: "Evaluate sleep hygiene, consider sleep study if severe" });

    // Lifestyle correlations
    const lifestyle = phase3 as Record<string, string>;
    const correlations: { factor: string; finding: string; impact: string }[] = [];
    if (parseFloat(lifestyle.sleepHours || "8") < 7) correlations.push({ factor: "sleep", finding: `Reported ${lifestyle.sleepHours || "unknown"} hours of sleep. Below recommended 7-9 hours, likely contributing to fatigue and cognitive symptoms.`, impact: "high" });
    if (["High", "Very High"].includes(lifestyle.stressLevel || "")) correlations.push({ factor: "stress", finding: `Stress level reported as ${lifestyle.stressLevel}. Chronic stress elevates cortisol which impacts sleep, mood, and immune function.`, impact: "high" });
    if (["Never", "1-2x/week"].includes(lifestyle.exercise || "")) correlations.push({ factor: "exercise", finding: "Low exercise frequency. Regular physical activity improves energy, mood, sleep quality, and cognitive function.", impact: "moderate" });

    // Root cause suggestions
    const rootCauses: { suggestion: string; relatedSymptoms: string[]; evidenceStrength: string; action: string }[] = [];
    if (topSymptoms.some(s => s.name.includes("fatigue") || s.name.includes("energy"))) rootCauses.push({ suggestion: "Thyroid function assessment", relatedSymptoms: ["fatigue", "low energy", "weight changes"], evidenceStrength: "strong", action: "Request TSH, Free T3, Free T4 lab panel" });
    if (topSymptoms.some(s => s.name.includes("brain fog") || s.name.includes("memory"))) rootCauses.push({ suggestion: "B-vitamin and methylation status", relatedSymptoms: ["brain fog", "memory issues", "fatigue"], evidenceStrength: "strong", action: "Check B12, folate, homocysteine levels" });
    if (topSymptoms.some(s => s.name.includes("mood") || s.name.includes("anxiety") || s.name.includes("depression"))) rootCauses.push({ suggestion: "Neurotransmitter and hormonal assessment", relatedSymptoms: ["anxiety", "low mood", "irritability"], evidenceStrength: "moderate", action: "Discuss with practitioner about cortisol, DHEA, and neurotransmitter testing" });

    // Action items
    const actions: { priority: number; action: string; category: string; timeframe: string }[] = [];
    if (correlations.some(c => c.factor === "sleep")) actions.push({ priority: 1, action: "Improve sleep hygiene: consistent bedtime, no screens 1hr before bed, dark room", category: "lifestyle", timeframe: "immediate" });
    if (topSymptoms.length > 0) actions.push({ priority: 2, action: "Schedule appointment with a practitioner to discuss your top symptom areas", category: "practitioner", timeframe: "this_week" });
    if (rootCauses.length > 0) actions.push({ priority: 3, action: `Request lab work: ${rootCauses.map(r => r.action).join("; ")}`, category: "lab_work", timeframe: "this_month" });
    actions.push({ priority: 4, action: "Review your Supplement Protocol for symptom-targeted recommendations", category: "supplementation", timeframe: "this_week" });

    const summary = `Your overall symptom burden is ${burdenTier.toLowerCase()} (${burdenScore}/100). ${topSymptoms.length > 0 ? `Your most significant symptoms are ${topSymptoms.slice(0, 3).map(s => s.name).join(", ")}. ` : ""}${clusters.length > 0 ? `${clusters.length} symptom cluster${clusters.length > 1 ? "s" : ""} identified that may share common root causes.` : "No significant symptom clusters identified."}`;

    const result = {
      overallBurdenScore: burdenScore,
      burdenTier,
      topSymptoms,
      symptomClusters: clusters,
      lifestyleCorrelations: correlations,
      medicationFlags: [],
      rootCauseSuggestions: rootCauses,
      actionItems: actions,
      summary,
      disclaimer: "This analysis is AI-generated based on your self-reported symptoms. It is not a medical diagnosis. Please consult a healthcare practitioner for clinical evaluation and treatment.",
      calculatedAt: new Date().toISOString(),
    };

    // Save to wellness_analytics
    await supabase.from("wellness_analytics").upsert({
      user_id: user.id,
      summary: result.summary,
      categories: result,
      trigger: "symptom_profile",
      calculated_at: new Date().toISOString(),
    }, { onConflict: "user_id,calculated_at" }).catch(() => {});

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Symptom profile generation failed" }, { status: 500 });
  }
}
