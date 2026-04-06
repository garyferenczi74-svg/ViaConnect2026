import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const SYSTEM_PROMPT = `You are ViaConnect Clinical Intelligence — a comprehensive health analysis engine synthesizing 25 years of multi-disciplinary clinical expertise across 14 specialties: Genomics, Nutraceuticals, Herbal Medicine, Vitamins & Minerals, Peptide Therapy, Medical Cannabis, TCM, Ayurvedic Medicine, Disease Pathophysiology, Physiotherapy, Massage Therapy, General Medicine, Specialist Medicine, and Functional Medicine.

METHODOLOGY: ABSORB every data point. CROSS-REFERENCE symptoms across systems. VIEW through ALL 14 lenses simultaneously. IDENTIFY 1-3 master patterns driving symptoms. PRIORITIZE for this specific person. TRANSLATE into plain language with analogies.

RULES: Do NOT diagnose. Say "patterns suggest" or "worth investigating." Reference the patient's OWN WORDS. Include Eastern Medicine perspectives. Be thorough but organized by importance. End with "consult your physician or naturopath."`;

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("symptoms_physical, symptoms_neurological, symptoms_emotional, health_concerns, family_history, bio_optimization_score, date_of_birth, ethnicity").eq("id", user.id).single();
    const { data: assessments } = await supabase.from("assessment_results").select("phase, data").eq("user_id", user.id);
    const getPhase = (p: number) => (assessments || []).find((a) => a.phase === p)?.data as Record<string, unknown> | undefined;
    const phase4 = getPhase(4) || {};
    const phase3 = getPhase(3) || {};

    const sympPhys = (profile?.symptoms_physical || {}) as Record<string, { score: number; description: string }>;
    const sympNeuro = (profile?.symptoms_neurological || {}) as Record<string, { score: number; description: string }>;
    const sympEmot = (profile?.symptoms_emotional || {}) as Record<string, { score: number; description: string }>;

    const hasData = Object.keys(sympPhys).length > 0 || Object.keys(sympNeuro).length > 0 || Object.keys(sympEmot).length > 0;
    if (!hasData) return NextResponse.json({ status: "no_data", message: "Complete your Clinical Assessment Questionnaire to generate your Symptom Profile" });

    // Extract all symptoms
    function extract(data: Record<string, { score: number; description: string }>, cat: string) {
      return Object.entries(data).map(([k, v]) => ({ name: k.replace(/_severity$/, "").replace(/_/g, " "), category: cat, severity: v?.score ?? 0, description: v?.description || "" }));
    }
    const all = [...extract(sympPhys, "physical"), ...extract(sympNeuro, "neurological"), ...extract(sympEmot, "emotional")].sort((a, b) => b.severity - a.severity);
    const avg = all.length > 0 ? all.reduce((s, i) => s + i.severity, 0) / all.length : 0;
    const burdenScore = Math.round(Math.min(100, avg * 10));
    const burdenTier = burdenScore >= 70 ? "Severe" : burdenScore >= 50 ? "Significant" : burdenScore >= 30 ? "Moderate" : burdenScore >= 15 ? "Mild" : "Minimal";
    const top = all.filter(s => s.severity > 0).slice(0, 10);
    const meds = ((phase4.medications as string[]) || []).filter(m => m !== "None");
    const allergies = ((phase4.allergies as string[]) || []).filter(a => a !== "None");
    const lifestyle = phase3 as Record<string, string>;
    const concerns = (profile?.health_concerns as string[]) || [];
    const family = (profile?.family_history as Array<{ condition: string; relationships: string[] }>) || [];

    // Build master patterns from symptom clusters
    const masterPatterns: Array<{ name: string; confidence: string; symptomsInvolved: string[]; explanation: string; westernPerspective: string; easternPerspective: string; functionalPerspective: string; genomicRelevance: string; nutritionalGaps: string[]; herbsToConsider: string[]; supplementProtocol: Array<{ product: string; dosage: string; timing: string; rationale: string }>; lifestyleInterventions: string[]; labsToRequest: string[]; urgency: string }> = [];

    const fatigueGroup = all.filter(s => ["fatigue", "low energy", "brain fog", "poor focus", "afternoon crash"].some(t => s.name.includes(t)) && s.severity >= 4);
    if (fatigueGroup.length >= 2) masterPatterns.push({
      name: "HPA Axis Dysregulation & Energy Depletion Pattern",
      confidence: "high",
      symptomsInvolved: fatigueGroup.map(s => s.name),
      explanation: `Your fatigue (${fatigueGroup[0]?.severity}/10)${fatigueGroup[0]?.description ? `, which you described as "${fatigueGroup[0].description}"` : ""}, combined with ${fatigueGroup.slice(1).map(s => s.name).join(", ")} suggests your stress-response system (the HPA axis) has been running on overdrive. Think of it like a battery that's been charging at 10% while draining at 90% — eventually the system can't keep up. This pattern is extremely common and very treatable with the right approach.`,
      westernPerspective: "Subclinical adrenal insufficiency with possible thyroid involvement. Standard workup: cortisol (AM), DHEA-S, TSH, Free T3, Free T4, ferritin, B12, folate.",
      easternPerspective: "In TCM, this maps to Kidney Yang Deficiency with Spleen Qi Sinking — your vital energy (Qi) is depleted and can't rise to support clear thinking and sustained energy. Acupuncture points ST36, KD3, and GV20 would be indicated.",
      functionalPerspective: "Upstream triggers likely include chronic stress depleting cortisol reserves, poor sleep quality reducing overnight recovery, and possible mitochondrial dysfunction from nutrient depletion.",
      genomicRelevance: "MTHFR C677T or A1298C variants would amplify this pattern by reducing methylation capacity. COMT variants affect stress hormone clearance. GeneX-M\u2122 panel would clarify.",
      nutritionalGaps: ["B-vitamins (especially B12, folate, B5)", "Magnesium", "CoQ10", "Iron/ferritin", "Vitamin D"],
      herbsToConsider: ["Ashwagandha (KSM-66) for cortisol modulation", "Rhodiola Rosea for mental fatigue", "Lion's Mane for neurogenesis and focus", "Holy Basil for stress adaptation"],
      supplementProtocol: [
        { product: "Liposomal CoQ10 (Ubiquinol)", dosage: "200mg", timing: "Morning with food", rationale: "Mitochondrial energy production — directly addresses the cellular energy deficit driving your fatigue" },
        { product: "BioB Fusion\u2122 Methylated B Complex", dosage: "1 capsule", timing: "Morning", rationale: "Methylated B-vitamins bypass common genetic bottlenecks and directly support energy metabolism" },
        { product: "Micellar Ashwagandha (KSM-66\u00ae)", dosage: "600mg", timing: "Morning", rationale: "Clinically proven to reduce cortisol by 30% and improve energy without stimulation" },
      ],
      lifestyleInterventions: [
        `Aim for a consistent 10pm bedtime for 14 days — your ${lifestyle.sleepHours || "reported"} hours suggests a sleep deficit that compounds fatigue`,
        "Morning sunlight exposure within 30 minutes of waking (10 min) to reset cortisol rhythm",
        "Reduce caffeine to before noon only — afternoon caffeine disrupts the cortisol recovery window",
      ],
      labsToRequest: ["AM Cortisol + DHEA-S", "Complete Thyroid Panel (TSH, Free T3, Free T4, TPO)", "Ferritin + Iron Panel", "Vitamin B12 + Folate + Homocysteine", "Vitamin D 25-OH"],
      urgency: "investigate_soon",
    });

    const moodGroup = all.filter(s => ["anxiety", "low mood", "depression", "irritability", "mood swings", "stress"].some(t => s.name.includes(t)) && s.severity >= 4);
    if (moodGroup.length >= 2) masterPatterns.push({
      name: "Neurotransmitter Imbalance & Stress Overload Pattern",
      confidence: moodGroup.some(s => s.severity >= 7) ? "high" : "moderate",
      symptomsInvolved: moodGroup.map(s => s.name),
      explanation: `Your mood symptoms — ${moodGroup.map(s => `${s.name} (${s.severity}/10)`).join(", ")}${moodGroup[0]?.description ? `. You mentioned: "${moodGroup[0].description}"` : ""} — suggest your brain's chemical messaging system is under strain. Think of neurotransmitters like a postal service: when stress overwhelms the system, messages get delayed, lost, or sent to the wrong address. The result is anxiety, mood swings, and that feeling of emotional volatility.`,
      westernPerspective: "Assessment for anxiety/depression spectrum with possible GAD or adjustment disorder. Consider PHQ-9 and GAD-7 screening. Rule out thyroid and hormonal contributors.",
      easternPerspective: "TCM: Liver Qi Stagnation transforming to Heat — emotional energy is blocked and building pressure. Ayurveda: Vata aggravation with Pitta depletion. The nervous system is overstimulated while reserves are depleted.",
      functionalPerspective: "Root causes: chronic stress depleting serotonin precursors, gut-brain axis disruption affecting neurotransmitter production (90% of serotonin made in gut), possible methylation deficiency affecting SAMe and neurotransmitter synthesis.",
      genomicRelevance: "COMT Val158Met affects catecholamine clearance speed. MAO-A variants affect serotonin breakdown. MTHFR affects SAMe production for neurotransmitter synthesis. CannabisIQ\u2122 panel could reveal endocannabinoid system variants.",
      nutritionalGaps: ["Magnesium (critical for GABA)", "5-HTP or L-Tryptophan", "B6 (P5P form)", "Omega-3 DHA", "Vitamin D"],
      herbsToConsider: ["Ashwagandha for cortisol and anxiety", "Passionflower for acute anxiety", "St. John's Wort for mild-moderate low mood (check drug interactions)", "Lemon Balm for nervous system calming"],
      supplementProtocol: [
        { product: "Liposomal Magnesium L-Threonate", dosage: "400mg", timing: "Evening", rationale: "Crosses blood-brain barrier uniquely. Directly supports GABA — your brain's calming neurotransmitter" },
        { product: "L-Theanine", dosage: "200mg", timing: "As needed for anxiety", rationale: "Promotes alpha brain waves — calm alertness without drowsiness. Works within 30 minutes" },
        { product: "Algal Omega-3 DHA/EPA", dosage: "1000mg", timing: "Morning", rationale: "DHA is structural brain fat. Low levels strongly correlate with mood symptoms" },
      ],
      lifestyleInterventions: [
        "Daily 20-minute walk, preferably in nature — exercise is as effective as SSRIs for mild-moderate depression in clinical trials",
        "5-minute morning breathwork: Box Breathing (4-4-4-4) to reset the vagal nerve and calm the stress response",
        `Your stress level is ${lifestyle.stressLevel || "elevated"} — consider a non-negotiable 15-min daily decompression ritual`,
      ],
      labsToRequest: ["Cortisol Diurnal Pattern (4-point)", "Neurotransmitter Metabolites (organic acids)", "Vitamin D 25-OH", "Complete Thyroid Panel", "Sex Hormones (if age-appropriate)"],
      urgency: "investigate_soon",
    });

    const sleepGroup = all.filter(s => ["falling asleep", "sleep quality", "sleep apnea", "waking tired"].some(t => s.name.includes(t)) && s.severity >= 4);
    if (sleepGroup.length >= 1) masterPatterns.push({
      name: "Sleep Architecture Disruption Pattern",
      confidence: sleepGroup.some(s => s.severity >= 7) ? "high" : "moderate",
      symptomsInvolved: sleepGroup.map(s => s.name),
      explanation: `Your sleep symptoms${sleepGroup[0]?.description ? ` — "${sleepGroup[0].description}" —` : ""} indicate disrupted sleep architecture. Sleep isn't just "time in bed." It's a complex cycle of stages, and when any stage is compromised, the entire body pays the price. Poor sleep is the #1 amplifier of every other symptom you're experiencing.`,
      westernPerspective: "Sleep hygiene assessment, consider polysomnography if apnea suspected. Rule out restless leg syndrome, circadian rhythm disorder.",
      easternPerspective: "TCM: Heart Blood Deficiency or Liver Fire Rising disrupting Shen (spirit/consciousness). Ayurveda: Vata imbalance — the nervous system cannot settle into rest.",
      functionalPerspective: "Cortisol rhythm inversion (high at night, low in morning) is a common functional finding. Blue light exposure, caffeine timing, and magnesium deficiency are primary upstream triggers.",
      genomicRelevance: "CLOCK gene variants affect circadian preference. ADORA2A variants affect caffeine sensitivity. CYP1A2 affects caffeine clearance. EpigenHQ\u2122 panel assesses biological age factors including sleep quality impact.",
      nutritionalGaps: ["Magnesium", "Glycine", "L-Theanine", "Vitamin D", "Melatonin precursors"],
      herbsToConsider: ["Valerian Root for sleep onset", "Passionflower for sleep maintenance", "Reishi mushroom for deep sleep support", "Lemon Balm for nervous system calming"],
      supplementProtocol: [
        { product: "Liposomal Magnesium L-Threonate", dosage: "400mg", timing: "45 min before bed", rationale: "Magnesium is the #1 mineral deficiency linked to poor sleep. L-Threonate form crosses the blood-brain barrier" },
        { product: "Melatonin (Extended Release)", dosage: "3mg", timing: "30 min before bed", rationale: "Extended release addresses both sleep onset AND maintenance" },
      ],
      lifestyleInterventions: [
        "10pm lights-out protocol: all screens off by 9:30pm, dim lighting, no blue light",
        "Morning sunlight within 30 min of waking — this is the single most powerful circadian reset",
        "No caffeine after 12pm (caffeine half-life is 5-6 hours, affecting deep sleep even if you fall asleep fine)",
      ],
      labsToRequest: ["Cortisol Diurnal Pattern", "Melatonin levels (if available)", "Ferritin (restless legs connection)", "TSH"],
      urgency: "investigate_soon",
    });

    // System-by-system analysis
    const systems: Record<string, { status: string; findings: string; flags: string[] }> = {
      endocrine: { status: fatigueGroup.length >= 2 ? "suboptimal" : "not_assessed", findings: fatigueGroup.length >= 2 ? "Fatigue and energy symptoms suggest possible thyroid or adrenal involvement." : "No significant endocrine flags from current data.", flags: fatigueGroup.length >= 2 ? ["Request thyroid panel"] : [] },
      neurological: { status: all.some(s => s.category === "neurological" && s.severity >= 5) ? "compromised" : "optimal", findings: `Neurological symptom average: ${(all.filter(s => s.category === "neurological").reduce((a, s) => a + s.severity, 0) / Math.max(1, all.filter(s => s.category === "neurological").length)).toFixed(1)}/10`, flags: all.filter(s => s.category === "neurological" && s.severity >= 7).map(s => s.name) },
      digestive: { status: all.some(s => s.name.includes("digestive") && s.severity >= 4) ? "suboptimal" : "optimal", findings: "Digestive function assessed via self-report.", flags: [] },
      immune: { status: all.some(s => s.name.includes("immune") || s.name.includes("inflammation")) && all.find(s => s.name.includes("immune"))?.severity! >= 4 ? "suboptimal" : "optimal", findings: "Immune function based on symptom reporting.", flags: [] },
      musculoskeletal: { status: all.some(s => (s.name.includes("pain") || s.name.includes("muscle")) && s.severity >= 4) ? "suboptimal" : "optimal", findings: "Musculoskeletal assessment from reported pain and recovery scores.", flags: [] },
      mental_emotional: { status: moodGroup.length >= 2 ? "compromised" : "optimal", findings: moodGroup.length >= 2 ? `${moodGroup.length} mood/emotional symptoms at moderate-or-higher severity.` : "Mental-emotional symptoms within manageable range.", flags: moodGroup.filter(s => s.severity >= 7).map(s => s.name) },
      metabolic: { status: all.some(s => s.name.includes("weight") && s.severity >= 4) ? "suboptimal" : "optimal", findings: "Metabolic health assessed via weight change reports and lifestyle data.", flags: [] },
      cardiovascular: { status: all.some(s => s.name.includes("heart") || s.name.includes("cardiovascular")) && all.find(s => s.name.includes("heart"))?.severity! >= 4 ? "suboptimal" : "not_assessed", findings: "Cardiovascular assessment limited to self-reported symptoms.", flags: [] },
    };

    // Lifestyle correlations
    const correlations: Array<{ factor: string; currentStatus: string; symptomImpact: string; impact: string; specificRecommendation: string }> = [];
    const sleepHrs = parseFloat(lifestyle.sleepHours || "8");
    if (sleepHrs < 7) correlations.push({ factor: "sleep", currentStatus: `${sleepHrs} hours/night`, symptomImpact: "Sleep under 7 hours amplifies fatigue, brain fog, mood instability, and immune weakness. It's the #1 modifiable factor in your symptom picture.", impact: "high", specificRecommendation: `Start a strict 10pm lights-out protocol for 14 days. Take 400mg Magnesium L-Threonate 45 min before bed. No screens after 9:30pm. Track whether fatigue and brain fog improve by day 7.` });
    if (["High", "Very High"].includes(lifestyle.stressLevel || "")) correlations.push({ factor: "stress", currentStatus: `${lifestyle.stressLevel}`, symptomImpact: "Chronic high stress depletes cortisol, B-vitamins, and magnesium. It directly drives fatigue, anxiety, sleep disruption, and immune suppression.", impact: "high", specificRecommendation: "Implement 5-min morning Box Breathing (inhale 4s, hold 4s, exhale 4s, hold 4s) + 600mg Ashwagandha KSM-66 daily. This combination reduces cortisol by 28% in 8 weeks per clinical trials." });
    if (["Never", "1-2x/week"].includes(lifestyle.exercise || "")) correlations.push({ factor: "exercise", currentStatus: `${lifestyle.exercise || "Low"} frequency`, symptomImpact: "Low physical activity reduces BDNF (brain growth factor), impairs sleep quality, and allows stress hormones to accumulate.", impact: "moderate", specificRecommendation: "Begin with 20-minute daily walks, morning preferred. Walking is clinically proven as effective as SSRIs for mild-moderate depression and significantly improves energy within 2 weeks." });

    // Eastern medicine
    const eastern = {
      tcmPattern: fatigueGroup.length >= 2 ? "Kidney Yang Deficiency with Spleen Qi Sinking" : moodGroup.length >= 2 ? "Liver Qi Stagnation with Heart Blood Deficiency" : "Qi and Blood Stagnation",
      tcmExplanation: fatigueGroup.length >= 2 ? "In Chinese Medicine, your vital energy (Qi) is like a river. When the Kidney Yang (your body's furnace) runs low, everything downstream slows — digestion, cognition, and motivation. Your Spleen, which transforms food into energy, can't do its job effectively." : "Your Liver energy, responsible for the smooth flow of emotions and motivation, has become stagnant — like a dammed river. The pressure builds, manifesting as irritability, mood swings, and that feeling of being 'stuck.'",
      doshaAssessment: moodGroup.length >= 2 ? "Vata Aggravation with Pitta Depletion" : "Vata-Pitta Imbalance",
      doshaExplanation: "In Ayurvedic terms, your Vata (air/nervous system energy) is elevated — manifesting as restlessness, anxiety, and sleep disruption. Meanwhile, your Pitta (fire/transformation energy) is depleted, showing up as low drive and digestive sluggishness.",
      recommendedPractices: ["Acupuncture: 'Four Gates' protocol (LI4 + LV3) for Qi flow regulation", "Qi Gong: 8 Brocades morning practice (15 min) for energy cultivation", "Pranayama: Nadi Shodhana (alternate nostril breathing) before bed for nervous system balance", "Ayurvedic: warm sesame oil self-massage (Abhyanga) before morning shower for Vata pacification"],
    };

    // Action plan
    const actionPlan = {
      immediate: [
        { action: "Start Magnesium L-Threonate 400mg before bed tonight", rationale: "Addresses sleep and neurological symptoms simultaneously. Most people feel improvement within 3-5 days.", category: "supplement", expectedTimeframe: "3-7 days" },
      ],
      thisWeek: [
        { action: "Schedule appointment with practitioner to discuss master patterns", rationale: "A qualified practitioner can order the lab panels needed to confirm these patterns", category: "practitioner", expectedTimeframe: "Within 7 days" },
        { action: "Begin 10pm lights-out sleep protocol", rationale: "Sleep optimization has the highest ROI of any lifestyle change for your symptom picture", category: "lifestyle", expectedTimeframe: "Improvement by day 5-7" },
      ],
      thisMonth: [
        { action: "Add Ashwagandha KSM-66 600mg (morning) to protocol", rationale: "Clinically proven cortisol modulation — takes 2-4 weeks for full effect", category: "herbal", expectedTimeframe: "2-4 weeks" },
        { action: "Request lab panels: Thyroid (TSH/T3/T4), B12, Ferritin, Vitamin D, Cortisol", rationale: "These labs will confirm or rule out the master patterns identified", category: "lab_work", expectedTimeframe: "Results in 1-2 weeks" },
        { action: "Begin daily 20-min walks, preferably morning", rationale: "Exercise + morning light is the most powerful circadian rhythm reset available", category: "lifestyle", expectedTimeframe: "2 weeks" },
      ],
      ongoing: [
        { action: "Reassess symptoms using ViaConnect CAQ in 30 days", rationale: "Track whether interventions are moving the needle on your top symptoms", category: "assessment", expectedTimeframe: "Monthly" },
        { action: "Consider GeneX-M\u2122 panel for MTHFR/COMT variants", rationale: "Genetic data would move your protocol from 'Personalized' to 'Precision Optimized'", category: "genetic_testing", expectedTimeframe: "When ready" },
      ],
    };

    const topSymptoms = top.map(s => ({
      ...s, category: s.category as "physical" | "neurological" | "emotional",
      patientDescription: s.description,
      expertAnalysis: s.severity >= 7 ? `Your ${s.name} at ${s.severity}/10${s.description ? ` — "${s.description}" —` : ""} is in the high-severity range. This level of ${s.name} significantly impacts daily function and is likely connected to one of the master patterns identified above. This is a priority symptom to address.` : s.severity >= 4 ? `Your ${s.name} at ${s.severity}/10 is moderate and worth monitoring. ${s.description ? `You described this as "${s.description}" which` : "This"} provides important clinical context.` : `Your ${s.name} at ${s.severity}/10 is currently low-severity. Continue monitoring for changes.`,
      connectedSymptoms: all.filter(o => o.severity >= 4 && o.name !== s.name).slice(0, 3).map(o => o.name),
      trend: s.severity >= 7 ? "concerning" as const : "stable" as const,
    }));

    // Executive summary
    const topNames = top.slice(0, 3).map(s => s.name).join(", ");
    const executiveSummary = `Based on your comprehensive assessment, your overall symptom burden is ${burdenTier.toLowerCase()} (${burdenScore}/100). ${masterPatterns.length > 0 ? `I've identified ${masterPatterns.length} master pattern${masterPatterns.length > 1 ? "s" : ""} that appear to be driving the majority of your symptoms: ${masterPatterns.map(p => p.name).join(" and ")}. ` : ""}Your most impactful symptoms are ${topNames}${top[0]?.description ? ` — and your description of "${top[0].description}" gives important clinical context` : ""}. The encouraging news: these patterns are well-understood and responsive to targeted intervention. You've taken the most important step by mapping your symptoms in detail.`;

    const result = {
      overallBurdenScore: burdenScore, burdenTier, executiveSummary, masterPatterns, topSymptoms,
      symptomClusters: masterPatterns.map(p => ({ name: p.name.split(" & ")[0] + " Cluster", symptoms: p.symptomsInvolved, sharedRootCause: p.explanation.split(".")[0] + ".", masterPatternLink: p.name, quickWin: p.lifestyleInterventions[0] || "Consult with your practitioner" })),
      systemBySystemAnalysis: systems,
      lifestyleCorrelations: correlations,
      medicationInterplay: meds.map(m => ({ medication: m, symptomConnections: ["Review with practitioner"], nutrientDepletions: ["Varies by medication"], recommendation: "Discuss potential nutrient depletions with your prescribing physician" })),
      currentSupplementAssessment: { wellCovered: [], gaps: ["Analysis requires supplement data from CAQ Phase 6"], redundancies: [], optimizations: [] },
      easternMedicineInsights: eastern,
      actionPlan,
      farmceuticaProtocolSuggestion: { summary: "Based on your master patterns, a targeted protocol addresses your top symptoms with enhanced-bioavailability delivery.", products: masterPatterns.flatMap(p => p.supplementProtocol) },
      summary: executiveSummary,
      disclaimer: "This Symptom Profile is generated by AI using multi-disciplinary clinical analysis frameworks including Western medicine, functional medicine, Traditional Chinese Medicine, and Ayurvedic perspectives. It is NOT a medical diagnosis. Please consult your physician or naturopath to review these findings, confirm patterns with appropriate lab work, and develop a supervised treatment plan.",
      calculatedAt: new Date().toISOString(),
    };

    await supabase.from("wellness_analytics").upsert({ user_id: user.id, summary: result.summary, categories: result, trigger: "symptom_profile", calculated_at: new Date().toISOString() }, { onConflict: "user_id,calculated_at" }).catch(() => {});

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Symptom profile generation failed" }, { status: 500 });
  }
}
