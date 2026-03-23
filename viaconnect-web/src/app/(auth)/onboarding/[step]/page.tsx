"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ArrowRight, Loader2, Plus, X, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

// ─── Phase Definitions ──────────────────────────────────────────────────────

const PHASES = [
  { id: "1", title: "Demographics", description: "Basic health profile information" },
  { id: "2", title: "Symptoms", description: "Current symptom assessment by category" },
  { id: "3", title: "Lifestyle", description: "Daily habits and routines" },
  { id: "4", title: "Medications", description: "Current medications, supplements, and allergies" },
  { id: "5", title: "Goals", description: "Wellness goals and preferences" },
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

type MedicationsData = {
  medications: string[];
  supplements: string[];
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

  const isLast = currentIndex === PHASES.length - 1;
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
          }
          toast.success(`Your Vitality Score: ${vitalityScore}/100`, { duration: 5000 });
          router.push("/dashboard");
          router.refresh();
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

      {/* Full-width progress bar */}
      <div className="flex gap-1.5 mb-6">
        {PHASES.map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= currentIndex ? "bg-copper" : "bg-dark-border"
            }`}
          />
        ))}
      </div>

      <div className="glass rounded-2xl p-6 lg:p-8">
        {/* Phase header */}
        <div className="mb-6">
          <p className="text-xs text-copper font-semibold uppercase tracking-wider">
            Phase {phase.id} of {PHASES.length}
          </p>
          <h2 className="text-xl font-bold text-white mt-1">{phase.title}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{phase.description}</p>
        </div>

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
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Height (cm)</label>
                <input type="number" value={demographics.height} onChange={(e) => setDemographics({ ...demographics, height: e.target.value })} className={inputClass} placeholder="175" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Weight (kg)</label>
                <input type="number" value={demographics.weight} onChange={(e) => setDemographics({ ...demographics, weight: e.target.value })} className={inputClass} placeholder="70" />
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
                    onClick={() => toggleChip(demographics.familyHistory, c, (v) => setDemographics({ ...demographics, familyHistory: v }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      demographics.familyHistory.includes(c)
                        ? "bg-plum/15 text-plum-light border-plum/30"
                        : "bg-dark-surface text-gray-400 border-dark-border hover:border-white/20"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Phase 2: Symptoms ── */}
        {stepId === "2" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden">
            {SYMPTOM_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-2 p-3 rounded-lg bg-dark-surface/50 min-w-0 overflow-hidden">
                <span className="text-sm text-gray-300 w-[90px] shrink-0 truncate">{cat}</span>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={symptoms[cat]}
                    onChange={(e) => setSymptoms({ ...symptoms, [cat]: parseInt(e.target.value) })}
                    className="block w-full accent-copper h-1.5"
                  />
                </div>
                <span className={`text-xs font-mono w-6 shrink-0 text-right ${
                  symptoms[cat] >= 7 ? "text-rose" : symptoms[cat] >= 4 ? "text-copper" : "text-portal-green"
                }`}>
                  {symptoms[cat]}
                </span>
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
                      setMedications({ ...medications, supplements: [...medications.supplements, suppInput.trim()] });
                      setSuppInput("");
                    }
                  }}
                  className={inputClass}
                  placeholder="Type supplement name and press Enter"
                />
                <button
                  onClick={() => {
                    if (suppInput.trim()) {
                      setMedications({ ...medications, supplements: [...medications.supplements, suppInput.trim()] });
                      setSuppInput("");
                    }
                  }}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-dark-surface border border-dark-border text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {medications.supplements.map((s) => (
                  <span key={s} className="flex items-center gap-1 text-xs bg-teal/10 text-teal-light px-2.5 py-1 rounded-full border border-teal/20">
                    {s}
                    <button onClick={() => setMedications({ ...medications, supplements: medications.supplements.filter((x) => x !== s) })}>
                      <X className="w-3 h-3 text-gray-500 hover:text-white" />
                    </button>
                  </span>
                ))}
              </div>
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

        {/* ── Navigation ── */}
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
      </div>
    </div>
  );
}
