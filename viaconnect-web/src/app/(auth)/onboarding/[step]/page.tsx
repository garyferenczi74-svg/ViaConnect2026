"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ArrowRight, Loader2, Plus, X, Sparkles, Zap, Brain, Moon, Flame, Heart, CheckCircle2, Crown, Star } from "lucide-react";
import toast from "react-hot-toast";

// ─── Phase Definitions ──────────────────────────────────────────────────────

const PHASES = [
  { id: "1", title: "Demographics", description: "Basic health profile information" },
  { id: "2", title: "Symptoms", description: "Current symptom assessment by category" },
  { id: "3", title: "Lifestyle", description: "Daily habits and routines" },
  { id: "4", title: "Medications", description: "Current medications, supplements, and allergies" },
  { id: "5", title: "Goals", description: "Wellness goals and preferences" },
  { id: "complete", title: "Welcome", description: "Your personalized results" },
];

// ─── Symptom Categories ─────────────────────────────────────────────────────

const SYMPTOM_CATEGORIES = [
  "Energy", "Sleep", "Mood", "Digestion", "Cognition",
  "Pain", "Skin", "Hair", "Immune", "Hormonal",
  "Cardiovascular", "Respiratory", "Musculoskeletal", "Metabolic", "Stress",
  "Anxiety", "Libido", "Vision", "Dental", "Allergies",
];

// ─── Health Concern Options ─────────────────────────────────────────────────

const HEALTH_CONCERNS = [
  "Low Energy", "Poor Sleep", "Brain Fog", "Weight Management",
  "Digestive Issues", "Chronic Pain", "Skin Problems", "Hair Loss",
  "Hormonal Imbalance", "Immune Support", "Cardiovascular Health",
  "Stress Management", "Anxiety", "Depression", "Joint Health",
  "Metabolic Syndrome", "Autoimmune", "Detoxification",
];

const FAMILY_HISTORY = [
  "Heart Disease", "Diabetes", "Cancer", "Alzheimer's",
  "Autoimmune Disorders", "Mental Health", "Obesity", "High Blood Pressure",
];

// ─── Lifestyle Options ──────────────────────────────────────────────────────

const DIET_TYPES = ["Standard", "Vegetarian", "Vegan", "Keto", "Paleo", "Mediterranean", "Carnivore", "Gluten-Free", "Other"];
const EXERCISE_FREQ = ["Never", "1-2x/week", "3-4x/week", "5-6x/week", "Daily"];
const STRESS_LEVELS = ["Very Low", "Low", "Moderate", "High", "Very High"];
const INTAKE_LEVELS = ["None", "Occasional", "Moderate", "Heavy"];

// ─── Goal Options ───────────────────────────────────────────────────────────

const WELLNESS_GOALS = [
  "Increase Energy", "Improve Sleep", "Sharpen Cognition", "Lose Weight",
  "Build Muscle", "Reduce Stress", "Improve Digestion", "Boost Immunity",
  "Hormonal Balance", "Anti-Aging", "Detoxification", "Cardiovascular Health",
  "Joint & Mobility", "Skin & Hair Health", "Mood Support", "Athletic Performance",
];

const SUPPLEMENT_FORMS = ["Capsule", "Liquid", "Powder", "Gummy", "No Preference"];

// ─── Common Medications (for autocomplete) ──────────────────────────────────

const COMMON_MEDICATIONS = [
  "Metformin", "Lisinopril", "Atorvastatin", "Levothyroxine", "Amlodipine",
  "Metoprolol", "Omeprazole", "Losartan", "Albuterol", "Gabapentin",
  "Sertraline", "Fluoxetine", "Escitalopram", "Duloxetine", "Bupropion",
  "Prednisone", "Ibuprofen", "Acetaminophen", "Aspirin", "Warfarin",
];

// ─── Types ──────────────────────────────────────────────────────────────────

type DemographicsData = {
  name: string;
  age: string;
  sex: string;
  height: string;
  weight: string;
  ethnicity: string;
  bloodType: string;
  concerns: string[];
  familyHistory: string[];
};

type SymptomsData = Record<string, number>;

type LifestyleData = {
  diet: string;
  exercise: string;
  sleepHours: string;
  stressLevel: string;
  alcohol: string;
  smoking: string;
  caffeine: string;
  waterIntake: string;
  screenTime: string;
  sunExposure: string;
};

type SupplementEntry = { name: string; mg: string };

type MedicationsData = {
  medications: string[];
  supplements: SupplementEntry[];
  allergies: string[];
  adverseReactions: string;
};

type GoalsData = {
  goals: string[];
  supplementForm: string;
  budgetRange: number;
  communicationPref: string;
};

// ─── Vitality Score Calculator ──────────────────────────────────────────────

function calculateVitalityScore(
  symptoms: SymptomsData,
  lifestyle: LifestyleData,
  goals: GoalsData
): number {
  // Base score from symptom severity (lower symptoms = higher score)
  const symptomValues = Object.values(symptoms);
  const avgSymptom = symptomValues.length > 0
    ? symptomValues.reduce((a, b) => a + b, 0) / symptomValues.length
    : 5;
  const symptomScore = Math.max(0, 100 - avgSymptom * 10);

  // Lifestyle bonus
  let lifestyleScore = 50;
  if (lifestyle.exercise === "3-4x/week" || lifestyle.exercise === "5-6x/week" || lifestyle.exercise === "Daily") lifestyleScore += 15;
  if (lifestyle.stressLevel === "Low" || lifestyle.stressLevel === "Very Low") lifestyleScore += 10;
  if (lifestyle.smoking === "None") lifestyleScore += 10;
  if (lifestyle.alcohol === "None" || lifestyle.alcohol === "Occasional") lifestyleScore += 5;
  const sleepH = parseFloat(lifestyle.sleepHours) || 0;
  if (sleepH >= 7 && sleepH <= 9) lifestyleScore += 10;

  // Goal engagement bonus
  const goalBonus = Math.min(goals.goals.length * 2, 10);

  const raw = (symptomScore * 0.5 + lifestyleScore * 0.4 + goalBonus);
  return Math.round(Math.min(100, Math.max(0, raw)));
}

function determineConstitutionalType(symptoms: SymptomsData): string {
  const stressAnxiety = (symptoms["Stress"] || 0) + (symptoms["Anxiety"] || 0);
  const energy = symptoms["Energy"] || 0;
  const digestion = symptoms["Digestion"] || 0;

  if (stressAnxiety > 12) return "Vata (Air)";
  if (energy > 6 && digestion > 5) return "Pitta (Fire)";
  return "Kapha (Earth)";
}

// ─── Shared input class ─────────────────────────────────────────────────────

const inputClass = "w-full h-10 bg-dark-surface border border-dark-border rounded-lg px-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-copper/50 focus:border-copper/50 transition-colors";
const selectClass = "w-full h-10 bg-dark-surface border border-dark-border rounded-lg px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-copper/50 focus:border-copper/50 transition-colors appearance-none";

// ─── Main Component ─────────────────────────────────────────────────────────

export default function OnboardingStepPage() {
  const params = useParams();
  const router = useRouter();
  const stepId = params.step as string;
  const currentIndex = PHASES.findIndex((s) => s.id === stepId);
  const phase = PHASES[currentIndex];

  const [isLoading, setIsLoading] = useState(false);

  // Phase 1 state
  const [demographics, setDemographics] = useState<DemographicsData>({
    name: "", age: "", sex: "", height: "", weight: "",
    ethnicity: "", bloodType: "", concerns: [], familyHistory: [],
  });
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("ft");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("lbs");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");

  // Phase 2 state
  const [symptoms, setSymptoms] = useState<SymptomsData>(() => {
    const init: SymptomsData = {};
    SYMPTOM_CATEGORIES.forEach((c) => (init[c] = 0));
    return init;
  });

  // Phase 3 state
  const [lifestyle, setLifestyle] = useState<LifestyleData>({
    diet: "", exercise: "", sleepHours: "", stressLevel: "",
    alcohol: "", smoking: "", caffeine: "", waterIntake: "",
    screenTime: "", sunExposure: "",
  });

  // Phase 4 state
  const [medications, setMedications] = useState<MedicationsData>({
    medications: [], supplements: [], allergies: [], adverseReactions: "",
  });
  const [medSearch, setMedSearch] = useState("");
  const [suppInput, setSuppInput] = useState("");
  const [suppMgInput, setSuppMgInput] = useState("");
  const [allergyInput, setAllergyInput] = useState("");

  // Phase 5 state
  const [goals, setGoals] = useState<GoalsData>({
    goals: [], supplementForm: "", budgetRange: 50, communicationPref: "email",
  });

  // Medication autocomplete
  const medSuggestions = useMemo(() => {
    if (!medSearch.trim()) return [];
    const q = medSearch.toLowerCase();
    return COMMON_MEDICATIONS.filter(
      (m) => m.toLowerCase().includes(q) && !medications.medications.includes(m)
    ).slice(0, 5);
  }, [medSearch, medications.medications]);

  const isLast = stepId === "5"; // Phase 5 is last questionnaire phase; "complete" is the results page
  const prevHref = currentIndex > 0 ? `/onboarding/${PHASES[currentIndex - 1].id}` : null;

  // Toggle chip
  function toggleChip(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  // Save phase to Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function savePhase(phaseId: string, data: any) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("assessment_results").upsert({
      user_id: user.id,
      phase: parseInt(phaseId),
      data,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,phase" });
  }

  // Handle next / complete
  const handleNext = useCallback(async () => {
    setIsLoading(true);
    try {
      // Save current phase
      switch (stepId) {
        case "1": await savePhase("1", demographics); break;
        case "2": await savePhase("2", symptoms); break;
        case "3": await savePhase("3", lifestyle); break;
        case "4": await savePhase("4", medications); break;
        case "5": {
          await savePhase("5", goals);
          // Calculate vitality score
          const vitalityScore = calculateVitalityScore(symptoms, lifestyle, goals);
          const constitutionalType = determineConstitutionalType(symptoms);
          // Save summary
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("assessment_results").upsert({
              user_id: user.id,
              phase: 0, // Summary phase
              data: { vitality_score: vitalityScore, constitutional_type: constitutionalType, completed_at: new Date().toISOString() },
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id,phase" });

            // Write vitality score and completion flag to profiles table
            // (this is what the dashboard gauge reads)
            await supabase.from("profiles").update({
              vitality_score: vitalityScore,
              assessment_completed: true,
              updated_at: new Date().toISOString(),
            }).eq("id", user.id);
          }
          toast.success(`Your Vitality Score: ${vitalityScore}/100`, { duration: 5000 });

          // Generate personalized supplement recommendations
          try {
            toast.loading("Generating your personalized protocol...", { id: "recs" });
            const res = await fetch("/api/recommendations/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            if (res.ok) {
              const data = await res.json();
              toast.success(`${data.recommendations_count} supplements recommended for you!`, { id: "recs", duration: 4000 });
            } else {
              toast.dismiss("recs");
            }
          } catch {
            toast.dismiss("recs");
          }

          router.push("/onboarding/complete");
          return;
        }
      }
      // Navigate to next phase
      router.push(`/onboarding/${PHASES[currentIndex + 1].id}`);
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, demographics, symptoms, lifestyle, medications, goals, currentIndex, router]);

  // Redirect if invalid step (after all hooks)
  if (!phase) {
    router.replace("/onboarding/1");
    return null;
  }

  return (
    <div className="w-full max-w-[720px] mx-auto">
      {/* Logo */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white">
          <span className="text-copper">Via</span>Connect
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Clinical Assessment Questionnaire</p>
      </div>

      {/* Full-width progress bar (5 questionnaire phases only) */}
      <div className="flex gap-1.5 mb-6">
        {PHASES.filter(s => s.id !== "complete").map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= currentIndex || stepId === "complete" ? "bg-copper" : "bg-dark-border"
            }`}
          />
        ))}
      </div>

      <div className={`glass rounded-2xl ${stepId === "complete" ? "p-6 lg:p-8 max-w-4xl mx-auto" : "p-6 lg:p-8"}`}>
        {/* Phase header (hidden on complete page — it has its own) */}
        {stepId !== "complete" && (
          <div className="mb-6">
            <p className="text-xs text-copper font-semibold uppercase tracking-wider">
              Phase {phase.id} of 5
            </p>
            <h2 className="text-xl font-bold text-white mt-1">{phase.title}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{phase.description}</p>
          </div>
        )}

        {/* ── Phase 1: Demographics ── */}
        {stepId === "1" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                <input value={demographics.name} onChange={(e) => setDemographics({ ...demographics, name: e.target.value })} className={inputClass} placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Age</label>
                <input type="number" value={demographics.age} onChange={(e) => setDemographics({ ...demographics, age: e.target.value })} className={inputClass} placeholder="25" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Sex</label>
                <select value={demographics.sex} onChange={(e) => setDemographics({ ...demographics, sex: e.target.value })} className={selectClass}>
                  <option value="">Select...</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Blood Type</label>
                <select value={demographics.bloodType} onChange={(e) => setDemographics({ ...demographics, bloodType: e.target.value })} className={selectClass}>
                  <option value="">Select...</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map((bt) => (
                    <option key={bt}>{bt}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-300">Height</label>
                  <div className="flex items-center gap-1 p-0.5 rounded-md bg-dark-surface border border-dark-border">
                    <button type="button" onClick={() => { setHeightUnit("ft"); }} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${heightUnit === "ft" ? "bg-copper/20 text-copper" : "text-gray-500"}`}>ft/in</button>
                    <button type="button" onClick={() => { setHeightUnit("cm"); }} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${heightUnit === "cm" ? "bg-copper/20 text-copper" : "text-gray-500"}`}>cm</button>
                  </div>
                </div>
                {heightUnit === "cm" ? (
                  <input type="number" value={demographics.height} onChange={(e) => setDemographics({ ...demographics, height: e.target.value })} className={inputClass} placeholder="175" />
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input type="number" value={heightFt} onChange={(e) => { setHeightFt(e.target.value); const cm = Math.round(((parseFloat(e.target.value) || 0) * 30.48) + ((parseFloat(heightIn) || 0) * 2.54)); setDemographics({ ...demographics, height: String(cm || "") }); }} className={inputClass} placeholder="5" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">ft</span>
                    </div>
                    <div className="flex-1 relative">
                      <input type="number" value={heightIn} onChange={(e) => { setHeightIn(e.target.value); const cm = Math.round(((parseFloat(heightFt) || 0) * 30.48) + ((parseFloat(e.target.value) || 0) * 2.54)); setDemographics({ ...demographics, height: String(cm || "") }); }} className={inputClass} placeholder="10" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">in</span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-300">Weight</label>
                  <div className="flex items-center gap-1 p-0.5 rounded-md bg-dark-surface border border-dark-border">
                    <button type="button" onClick={() => setWeightUnit("lbs")} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${weightUnit === "lbs" ? "bg-copper/20 text-copper" : "text-gray-500"}`}>lbs</button>
                    <button type="button" onClick={() => setWeightUnit("kg")} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${weightUnit === "kg" ? "bg-copper/20 text-copper" : "text-gray-500"}`}>kg</button>
                  </div>
                </div>
                {weightUnit === "kg" ? (
                  <input type="number" value={demographics.weight} onChange={(e) => setDemographics({ ...demographics, weight: e.target.value })} className={inputClass} placeholder="70" />
                ) : (
                  <div className="relative">
                    <input type="number" value={demographics.weight ? String(Math.round(parseFloat(demographics.weight) * 2.20462)) : ""} onChange={(e) => { const lbs = parseFloat(e.target.value) || 0; setDemographics({ ...demographics, weight: String(Math.round(lbs / 2.20462) || "") }); }} className={inputClass} placeholder="154" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">lbs</span>
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Ethnicity</label>
                <input value={demographics.ethnicity} onChange={(e) => setDemographics({ ...demographics, ethnicity: e.target.value })} className={inputClass} placeholder="e.g. Caucasian, African American, Asian, Hispanic..." />
              </div>
            </div>

            {/* Health concerns chips */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Primary Health Concerns</label>
              <div className="flex flex-wrap gap-2">
                {HEALTH_CONCERNS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleChip(demographics.concerns, c, (v) => setDemographics({ ...demographics, concerns: v }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      demographics.concerns.includes(c)
                        ? "bg-copper/15 text-copper border-copper/30"
                        : "bg-dark-surface text-gray-400 border-dark-border hover:border-white/20"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Family history */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Family History</label>
              <div className="flex flex-wrap gap-2">
                {FAMILY_HISTORY.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      // If selecting a condition, remove "None of the above" if present
                      const filtered = demographics.familyHistory.filter((v) => v !== "None");
                      toggleChip(filtered.includes(c) ? filtered : filtered, c, (v) => setDemographics({ ...demographics, familyHistory: v.includes(c) ? v.filter((x) => x !== c) : [...v, c] }));
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      demographics.familyHistory.includes(c)
                        ? "bg-plum/15 text-plum-light border-plum/30"
                        : "bg-dark-surface text-gray-400 border-dark-border hover:border-white/20"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <button
                  onClick={() => setDemographics({ ...demographics, familyHistory: demographics.familyHistory.includes("None") ? [] : ["None"] })}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    demographics.familyHistory.includes("None")
                      ? "bg-portal-green/15 text-portal-green border-portal-green/30"
                      : "bg-dark-surface text-gray-400 border-dark-border hover:border-white/20"
                  }`}
                >
                  None of the above
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase 2: Symptoms ── */}
        {stepId === "2" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SYMPTOM_CATEGORIES.map((cat) => (
              <div key={cat} className="flex flex-col gap-1.5 p-3 rounded-lg bg-dark-surface/50 border border-white/[0.04]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{cat}</span>
                  <span className={`text-xs font-mono font-semibold ${
                    symptoms[cat] >= 7 ? "text-rose" : symptoms[cat] >= 4 ? "text-copper" : "text-portal-green"
                  }`}>
                    {symptoms[cat]}/10
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={symptoms[cat]}
                  onChange={(e) => setSymptoms({ ...symptoms, [cat]: parseInt(e.target.value) })}
                  className="w-full accent-copper h-1.5"
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Phase 3: Lifestyle ── */}
        {stepId === "3" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Diet Type</label>
              <select value={lifestyle.diet} onChange={(e) => setLifestyle({ ...lifestyle, diet: e.target.value })} className={selectClass}>
                <option value="">Select...</option>
                {DIET_TYPES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Exercise Frequency</label>
              <select value={lifestyle.exercise} onChange={(e) => setLifestyle({ ...lifestyle, exercise: e.target.value })} className={selectClass}>
                <option value="">Select...</option>
                {EXERCISE_FREQ.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Sleep (hours/night)</label>
              <input type="number" min={0} max={24} step={0.5} value={lifestyle.sleepHours} onChange={(e) => setLifestyle({ ...lifestyle, sleepHours: e.target.value })} className={inputClass} placeholder="7.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Stress Level</label>
              <select value={lifestyle.stressLevel} onChange={(e) => setLifestyle({ ...lifestyle, stressLevel: e.target.value })} className={selectClass}>
                <option value="">Select...</option>
                {STRESS_LEVELS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Alcohol Intake</label>
              <select value={lifestyle.alcohol} onChange={(e) => setLifestyle({ ...lifestyle, alcohol: e.target.value })} className={selectClass}>
                <option value="">Select...</option>
                {INTAKE_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Smoking Status</label>
              <select value={lifestyle.smoking} onChange={(e) => setLifestyle({ ...lifestyle, smoking: e.target.value })} className={selectClass}>
                <option value="">Select...</option>
                {INTAKE_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Caffeine Intake</label>
              <select value={lifestyle.caffeine} onChange={(e) => setLifestyle({ ...lifestyle, caffeine: e.target.value })} className={selectClass}>
                <option value="">Select...</option>
                {INTAKE_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Water Intake (glasses/day)</label>
              <input type="number" min={0} max={20} value={lifestyle.waterIntake} onChange={(e) => setLifestyle({ ...lifestyle, waterIntake: e.target.value })} className={inputClass} placeholder="8" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Screen Time (hours/day)</label>
              <input type="number" min={0} max={24} value={lifestyle.screenTime} onChange={(e) => setLifestyle({ ...lifestyle, screenTime: e.target.value })} className={inputClass} placeholder="6" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Sun Exposure (min/day)</label>
              <input type="number" min={0} max={480} value={lifestyle.sunExposure} onChange={(e) => setLifestyle({ ...lifestyle, sunExposure: e.target.value })} className={inputClass} placeholder="30" />
            </div>
          </div>
        )}

        {/* ── Phase 4: Medications ── */}
        {stepId === "4" && (
          <div className="space-y-6">
            {/* Medication search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Current Medications</label>
              <div className="relative">
                <input
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && medSearch.trim()) {
                      e.preventDefault();
                      setMedications({ ...medications, medications: [...medications.medications, medSearch.trim()] });
                      setMedSearch("");
                    }
                  }}
                  className={inputClass}
                  placeholder="Search medications..."
                />
                {medSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-lg border border-dark-border bg-dark-card shadow-xl overflow-hidden">
                    {medSuggestions.map((med) => (
                      <button
                        key={med}
                        onClick={() => {
                          setMedications({ ...medications, medications: [...medications.medications, med] });
                          setMedSearch("");
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.04] hover:text-white transition-colors"
                      >
                        {med}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {medications.medications.map((m) => (
                  <span key={m} className="flex items-center gap-1 text-xs bg-dark-surface text-gray-300 px-2.5 py-1 rounded-full border border-dark-border">
                    {m}
                    <button onClick={() => setMedications({ ...medications, medications: medications.medications.filter((x) => x !== m) })}>
                      <X className="w-3 h-3 text-gray-500 hover:text-white" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Supplements */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Current Supplements</label>
              <div className="flex gap-2">
                <input
                  value={suppInput}
                  onChange={(e) => setSuppInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && suppInput.trim()) {
                      e.preventDefault();
                      setMedications({ ...medications, supplements: [...medications.supplements, { name: suppInput.trim(), mg: suppMgInput.trim() || "unknown" }] });
                      setSuppInput(""); setSuppMgInput("");
                    }
                  }}
                  className={inputClass}
                  placeholder="Supplement name"
                />
                <div className="relative shrink-0 w-24">
                  <input
                    value={suppMgInput}
                    onChange={(e) => setSuppMgInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && suppInput.trim()) {
                        e.preventDefault();
                        setMedications({ ...medications, supplements: [...medications.supplements, { name: suppInput.trim(), mg: suppMgInput.trim() || "unknown" }] });
                        setSuppInput(""); setSuppMgInput("");
                      }
                    }}
                    className={inputClass}
                    placeholder="mg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">mg</span>
                </div>
                <button
                  onClick={() => {
                    if (suppInput.trim()) {
                      setMedications({ ...medications, supplements: [...medications.supplements, { name: suppInput.trim(), mg: suppMgInput.trim() || "unknown" }] });
                      setSuppInput(""); setSuppMgInput("");
                    }
                  }}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-dark-surface border border-dark-border text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {medications.supplements.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {medications.supplements.map((s, i) => (
                    <span key={`${s.name}-${i}`} className="flex items-center gap-1 text-xs bg-teal/10 text-teal-light px-2.5 py-1 rounded-full border border-teal/20">
                      {s.name} <span className="text-teal/60">{s.mg !== "unknown" ? `${s.mg}mg` : ""}</span>
                      <button onClick={() => setMedications({ ...medications, supplements: medications.supplements.filter((_, idx) => idx !== i) })}>
                        <X className="w-3 h-3 text-gray-500 hover:text-white" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Known Allergies</label>
              <div className="flex gap-2">
                <input
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && allergyInput.trim()) {
                      e.preventDefault();
                      setMedications({ ...medications, allergies: [...medications.allergies, allergyInput.trim()] });
                      setAllergyInput("");
                    }
                  }}
                  className={inputClass}
                  placeholder="Type allergy and press Enter"
                />
                <button
                  onClick={() => {
                    if (allergyInput.trim()) {
                      setMedications({ ...medications, allergies: [...medications.allergies, allergyInput.trim()] });
                      setAllergyInput("");
                    }
                  }}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-dark-surface border border-dark-border text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {medications.allergies.map((a) => (
                  <span key={a} className="flex items-center gap-1 text-xs bg-rose/10 text-rose px-2.5 py-1 rounded-full border border-rose/20">
                    {a}
                    <button onClick={() => setMedications({ ...medications, allergies: medications.allergies.filter((x) => x !== a) })}>
                      <X className="w-3 h-3 text-gray-500 hover:text-white" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Adverse reactions */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Previous Adverse Reactions</label>
              <textarea
                value={medications.adverseReactions}
                onChange={(e) => setMedications({ ...medications, adverseReactions: e.target.value })}
                rows={3}
                className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-copper/50 focus:border-copper/50 transition-colors resize-none"
                placeholder="Describe any previous adverse reactions to medications or supplements..."
              />
            </div>
          </div>
        )}

        {/* ── Phase 5: Goals ── */}
        {stepId === "5" && (
          <div className="space-y-6">
            {/* Wellness goals */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Wellness Goals</label>
              <div className="flex flex-wrap gap-2">
                {WELLNESS_GOALS.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleChip(goals.goals, g, (v) => setGoals({ ...goals, goals: v }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      goals.goals.includes(g)
                        ? "bg-copper/15 text-copper border-copper/30"
                        : "bg-dark-surface text-gray-400 border-dark-border hover:border-white/20"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Supplement form preference */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Supplement Form</label>
              <div className="flex flex-wrap gap-2">
                {SUPPLEMENT_FORMS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setGoals({ ...goals, supplementForm: f })}
                    className={`text-xs px-4 py-2 rounded-lg border transition-colors ${
                      goals.supplementForm === f
                        ? "bg-teal/15 text-teal-light border-teal/30"
                        : "bg-dark-surface text-gray-400 border-dark-border hover:border-white/20"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-300">Monthly Budget</label>
                <span className="text-sm font-mono text-copper">${goals.budgetRange}</span>
              </div>
              <input
                type="range"
                min={10}
                max={300}
                step={10}
                value={goals.budgetRange}
                onChange={(e) => setGoals({ ...goals, budgetRange: parseInt(e.target.value) })}
                className="w-full accent-copper h-1.5"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>$10</span>
                <span>$150</span>
                <span>$300</span>
              </div>
            </div>

            {/* Communication preference */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Communication Preferences</label>
              <div className="flex flex-wrap gap-2">
                {["email", "sms", "push", "all"].map((pref) => (
                  <button
                    key={pref}
                    onClick={() => setGoals({ ...goals, communicationPref: pref })}
                    className={`text-xs px-4 py-2 rounded-lg border transition-colors capitalize ${
                      goals.communicationPref === pref
                        ? "bg-plum/15 text-plum-light border-plum/30"
                        : "bg-dark-surface text-gray-400 border-dark-border hover:border-white/20"
                    }`}
                  >
                    {pref === "all" ? "All Channels" : pref.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Complete: Welcome + Results + Membership ── */}
        {stepId === "complete" && (
          <OnboardingComplete />
        )}

        {/* ── Navigation (hidden on complete page) ── */}
        {stepId !== "complete" && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
            {prevHref ? (
              <Link href={prevHref} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="flex items-center gap-1.5 h-9 px-5 bg-gradient-to-r from-copper to-copper/80 hover:from-copper/90 hover:to-copper/70 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : isLast ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Calculate Vitality Score
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Onboarding Complete Component ──────────────────────────────────────────

const HEALTH_INDICATORS = [
  { key: "energy", label: "Energy", icon: Zap, color: "#FBBF24", symptomKey: "Energy" },
  { key: "cognitive", label: "Cognitive", icon: Brain, color: "#A78BFA", symptomKey: "Cognition" },
  { key: "sleep", label: "Sleep", icon: Moon, color: "#22D3EE", symptomKey: "Sleep" },
  { key: "metabolic", label: "Metabolic", icon: Flame, color: "#F472B6", symptomKey: "Metabolic" },
  { key: "stress", label: "Stress", icon: Heart, color: "#4ADE80", symptomKey: "Stress" },
] as const;

const MEMBERSHIP_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/forever",
    features: [
      "Vitality Score assessment",
      "Basic supplement recommendations",
      "Community access",
      "Educational content",
    ],
    cta: "Get Started Free",
    accent: "border-gray-600",
    bg: "bg-white/[0.02]",
    ctaBg: "bg-white/[0.08] hover:bg-white/[0.12] text-white",
    popular: false,
  },
  {
    name: "Gold",
    price: "$8.88",
    period: "/month",
    features: [
      "Everything in Free",
      "Personalized protocol builder",
      "Monthly AI wellness check-in",
      "ViaTokens rewards (2x earn rate)",
      "Priority practitioner messaging",
      "Protocol adherence tracking",
    ],
    cta: "Start Gold Membership",
    accent: "border-amber-500/50",
    bg: "bg-amber-500/5",
    ctaBg: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-bg font-semibold",
    popular: false,
  },
  {
    name: "Platinum",
    price: "$28.88",
    period: "/month",
    features: [
      "Everything in Gold",
      "GeneX360 genetic panel discount (20% off)",
      "Unlimited AI Advisor access (all 3 models)",
      "ViaTokens rewards (5x earn rate)",
      "Dedicated practitioner matching",
      "Quarterly wellness review calls",
      "Early access to new formulations",
      "Free shipping on all orders",
    ],
    cta: "Start Platinum Membership",
    accent: "border-purple-500/50",
    bg: "bg-purple-500/5",
    ctaBg: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-semibold",
    popular: true,
  },
];

function OnboardingComplete() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("there");
  const [vitalityScore, setVitalityScore] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [savedSymptoms, setSavedSymptoms] = useState<SymptomsData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const name = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "there";
      setDisplayName(name.split(" ")[0]);

      // Load vitality score from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("vitality_score")
        .eq("id", user.id)
        .single();
      if (profile?.vitality_score) setVitalityScore(profile.vitality_score);

      // Load saved symptom data from assessment_results phase 2
      const { data: phase2 } = await supabase
        .from("assessment_results")
        .select("data")
        .eq("user_id", user.id)
        .eq("phase", 2)
        .single();
      if (phase2?.data) {
        setSavedSymptoms(phase2.data as SymptomsData);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // Animate score
  useEffect(() => {
    if (vitalityScore === 0) return;
    const duration = 2000;
    const start = Date.now();
    function tick() {
      const progress = Math.min((Date.now() - start) / duration, 1);
      setAnimatedScore(Math.round(vitalityScore * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [vitalityScore]);

  // Compute sub-scores from saved symptom data (invert: 0=no symptom=100 health, 10=severe=0 health)
  function getHealthScore(symptomKey: string): number {
    const raw = savedSymptoms[symptomKey] ?? 5;
    return Math.round(100 - raw * 10);
  }

  const scoreColor =
    vitalityScore >= 80 ? "#4ADE80" : vitalityScore >= 60 ? "#22D3EE" : vitalityScore >= 40 ? "#FBBF24" : "#F87171";
  const r = 80;
  const circ = 2 * Math.PI * r;
  const offset = circ - (animatedScore / 100) * circ;

  function handleSelectTier(tierName: string) {
    setSelectedTier(tierName);
    // For now, just navigate to dashboard. Stripe integration will come later.
    toast.success(`${tierName} membership selected!`, { duration: 3000 });
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-8 h-8 text-copper animate-spin" />
        <p className="text-gray-400 text-sm">Loading your results...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 -mt-2">
      {/* Welcome Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-copper/10 border border-copper/20 mb-4">
          <CheckCircle2 className="w-4 h-4 text-copper" />
          <span className="text-xs font-medium text-copper">Assessment Complete</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          Welcome, <span className="text-copper">{displayName}</span>!
        </h2>
        <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
          Your personalized wellness profile is ready. Here&apos;s a snapshot of your key health indicators.
        </p>
      </div>

      {/* Vitality Score Gauge */}
      <div className="flex flex-col items-center">
        <div className="relative w-[180px] h-[180px]">
          <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
            <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
            <circle cx="90" cy="90" r={r} fill="none" stroke={scoreColor} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 2s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 12px ${scoreColor}50)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold" style={{ color: scoreColor }}>{animatedScore}</span>
            <span className="text-[10px] text-gray-500 mt-0.5">Vitality Score</span>
          </div>
        </div>
      </div>

      {/* Health Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {HEALTH_INDICATORS.map((ind) => {
          const Icon = ind.icon;
          const score = getHealthScore(ind.symptomKey);
          return (
            <div key={ind.key} className="flex flex-col items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <Icon className="w-5 h-5 mb-2" style={{ color: ind.color }} />
              <span className="text-lg font-bold text-white">{score}</span>
              <span className="text-[10px] text-gray-500 mt-0.5">{ind.label}</span>
              <div className="w-full h-1 rounded-full bg-white/[0.06] mt-2">
                <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: ind.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap flex-shrink-0">Choose Your Plan</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* Membership Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
        {MEMBERSHIP_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`relative rounded-xl border ${tier.accent} ${tier.bg} p-5 pt-7 flex flex-col transition-all hover:scale-[1.02] hover:shadow-lg overflow-hidden`}
          >
            {tier.popular && (
              <div className="absolute top-0 left-0 right-0 flex justify-center" style={{ transform: "translateY(-1px)" }}>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-b-lg bg-amber-500 text-dark-bg text-[10px] font-bold uppercase">
                  <Star className="w-3 h-3" /> Most Popular
                </span>
              </div>
            )}

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {tier.name === "Gold" && <Crown className="w-4 h-4 text-amber-400" />}
                {tier.name === "Platinum" && <Crown className="w-4 h-4 text-purple-400" />}
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{tier.price}</span>
                <span className="text-sm text-gray-500">{tier.period}</span>
              </div>
            </div>

            <ul className="space-y-2.5 mb-6 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-copper mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-300">{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectTier(tier.name)}
              disabled={selectedTier !== null}
              className={`w-full py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 ${tier.ctaBg}`}
            >
              {selectedTier === tier.name ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up...
                </span>
              ) : (
                tier.cta
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Skip */}
      <div className="text-center pb-4">
        <button
          onClick={() => { router.push("/dashboard"); router.refresh(); }}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Skip for now &mdash; go to dashboard
        </button>
      </div>
    </div>
  );
}
