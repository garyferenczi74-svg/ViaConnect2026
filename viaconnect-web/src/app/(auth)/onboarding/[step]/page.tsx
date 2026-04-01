"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ArrowRight, Loader2, Plus, X, Sparkles, Zap, Brain, Moon, Flame, Heart, CheckCircle2, Crown, Star, Calendar, ChevronDown, Info, Camera, FolderOpen, SkipForward, BrainCircuit } from "lucide-react";
import { ProgressMotivator } from "@/components/caq/ProgressMotivator";
import { VoiceInput } from "@/components/caq/VoiceInput";
import { CalmingHelixBackground } from "@/components/caq/CalmingHelixBackground";
import { BodyTypeSelector } from "@/components/caq/BodyTypeSelector";
import { shouldShowBodyTypeSelector } from "@/lib/caq/body-type-trigger";
import { completeCAQAndTriggerEngines } from "@/lib/caq/complete-caq";
import { CONVERSATIONAL_LABELS } from "@/config/caq-conversational-labels";
import { SMART_PLACEHOLDERS, DEFAULT_PLACEHOLDER } from "@/config/caq-smart-placeholders";
import toast from "react-hot-toast";
import { InterstitialScreen } from "@/components/onboarding/InterstitialScreen";
import { WelcomeDashboardScreen } from "@/components/onboarding/WelcomeDashboardScreen";
import { CAQ_INTERSTITIALS } from "@/config/caq-interstitials";
import { SEED_INGREDIENTS, FARMCEUTICA_CATEGORIES, normalizeIngredientName } from "@/config/farmceutica-ingredients";
import { InteractionBanner } from "@/components/interactions/InteractionBanner";
import { emitDataEvent } from "@/lib/ai/emit-event";

// ─── Phase Definitions ──────────────────────────────────────────────────────
// Interstitial steps use "i-<id>" as their step ID
// caqIndex references CAQ_INTERSTITIALS array positions

const PHASES = [
  { id: "i-caq-intro", title: "", description: "", caqIndex: 0 },
  { id: "1", title: "Your Body Profile", description: "Basic measurements and biological information" },
  { id: "i-caq-concerns", title: "", description: "", caqIndex: 1 },
  { id: "1b", title: "Health Concerns & Family History", description: "What you're experiencing and what runs in your family" },
  { id: "i-caq-physical", title: "", description: "", caqIndex: 2 },
  { id: "2a", title: "How Your Body Feels", description: "Rate the severity of each physical symptom you're currently experiencing" },
  { id: "i-caq-neuro", title: "", description: "", caqIndex: 3 },
  { id: "2b", title: "Your Mind & Nervous System", description: "Rate how these cognitive and neurological symptoms affect your daily life" },
  { id: "i-caq-emotional", title: "", description: "", caqIndex: 4 },
  { id: "2c", title: "Mood, Immunity & Hormones", description: "Rate how these emotional and systemic symptoms are affecting you" },
  { id: "i-caq-medications", title: "", description: "", caqIndex: 5 },
  { id: "4", title: "Medications, Supplements & Allergies", description: "Current medications, supplements, and known allergies" },
  { id: "i-caq-lifestyle", title: "", description: "", caqIndex: 6 },
  { id: "3", title: "Lifestyle & Goals", description: "Daily habits, routines, and wellness goals" },
  { id: "i-caq-complete", title: "", description: "", caqIndex: 7 },
  { id: "i-packages", title: "", description: "", caqIndex: 8 },
  { id: "complete", title: "Welcome", description: "Your personalized results" },
  { id: "i-welcome", title: "", description: "", caqIndex: 9 },
] as const;

// ─── Symptom Definitions (3 phases) ─────────────────────────────────────────

interface SymptomField {
  id: string;
  label: string;
  description: string;
  sliderLabels: [string, string];
}

const PHYSICAL_SYMPTOMS: SymptomField[] = [
  { id: "fatigue_severity", label: "Fatigue / Low Energy", description: "Overall energy levels throughout the day", sliderLabels: ["None", "Severe"] },
  { id: "pain_severity", label: "Body Pain / Aches", description: "Joints, muscles, back, neck, or general body pain", sliderLabels: ["None", "Severe"] },
  { id: "headache_severity", label: "Headaches / Migraines", description: "Frequency and intensity of headaches", sliderLabels: ["Never", "Daily/Severe"] },
  { id: "digestive_severity", label: "Digestive Issues", description: "Bloating, gas, nausea, acid reflux, irregular bowel movements", sliderLabels: ["None", "Severe"] },
  { id: "respiratory_severity", label: "Breathing / Respiratory", description: "Shortness of breath, wheezing, chest tightness", sliderLabels: ["None", "Severe"] },
  { id: "cardiovascular_severity", label: "Heart / Circulation", description: "Heart palpitations, dizziness, cold hands/feet, swelling", sliderLabels: ["None", "Severe"] },
  { id: "skin_severity", label: "Skin Issues", description: "Rashes, dryness, acne, eczema, itching, slow wound healing", sliderLabels: ["None", "Severe"] },
  { id: "weight_severity", label: "Unexplained Weight Changes", description: "Unintentional weight gain or loss in the past 6 months", sliderLabels: ["None", "Significant"] },
];

const NEUROLOGICAL_SYMPTOMS: SymptomField[] = [
  { id: "brain_fog_severity", label: "Brain Fog", description: "Difficulty thinking clearly, mental cloudiness", sliderLabels: ["None", "Constant"] },
  { id: "focus_severity", label: "Focus / Concentration", description: "Ability to sustain attention on tasks", sliderLabels: ["Strong", "Very Poor"] },
  { id: "memory_severity", label: "Memory Issues", description: "Forgetting names, tasks, or recent events", sliderLabels: ["None", "Frequent"] },
  { id: "sleep_onset_severity", label: "Falling Asleep", description: "Difficulty falling asleep at night", sliderLabels: ["Easy", "Very Difficult"] },
  { id: "sleep_quality_severity", label: "Sleep Quality", description: "Waking during the night, restless sleep, unrefreshing sleep", sliderLabels: ["Excellent", "Very Poor"] },
  { id: "numbness_severity", label: "Numbness / Tingling", description: "Pins and needles, numbness in extremities", sliderLabels: ["None", "Frequent"] },
  { id: "vision_severity", label: "Vision Changes", description: "Blurry vision, eye strain, light sensitivity", sliderLabels: ["None", "Significant"] },
  { id: "tinnitus_severity", label: "Tinnitus / Ear Issues", description: "Ringing in ears, hearing changes, ear pressure", sliderLabels: ["None", "Constant"] },
];

const EMOTIONAL_SYMPTOMS: SymptomField[] = [
  { id: "anxiety_severity", label: "Anxiety / Nervousness", description: "Worry, restlessness, panic, racing thoughts", sliderLabels: ["None", "Severe"] },
  { id: "depression_severity", label: "Low Mood / Depression", description: "Sadness, hopelessness, loss of interest", sliderLabels: ["None", "Severe"] },
  { id: "irritability_severity", label: "Irritability / Mood Swings", description: "Frequent frustration, emotional volatility", sliderLabels: ["None", "Severe"] },
  { id: "stress_severity", label: "Stress Level", description: "Overall stress from work, life, relationships, finances", sliderLabels: ["None", "Overwhelming"] },
  { id: "immune_severity", label: "Frequent Illness", description: "Colds, infections, slow recovery from illness", sliderLabels: ["Never", "Very Often"] },
  { id: "inflammation_severity", label: "Inflammation / Swelling", description: "Chronic inflammation, puffy face, swollen joints, water retention", sliderLabels: ["None", "Severe"] },
  { id: "hormonal_severity", label: "Hormonal Symptoms", description: "Hot flashes, night sweats, libido changes, menstrual irregularity, stubborn fat, weight gain", sliderLabels: ["None", "Severe"] },
  { id: "hair_nail_severity", label: "Hair & Nail Health", description: "Hair thinning/loss, brittle nails, slow growth", sliderLabels: ["None", "Significant"] },
];

// ─── Health Concern Options (grouped by category) ──────────────────────────

const HEALTH_CONCERN_CATEGORIES = [
  { category: "Energy & Vitality", concerns: [
    { value: "low_energy", label: "Low Energy / Fatigue" },
    { value: "afternoon_crash", label: "Afternoon Energy Crash" },
    { value: "chronic_fatigue", label: "Chronic Fatigue" },
  ]},
  { category: "Sleep", concerns: [
    { value: "poor_sleep", label: "Poor Sleep Quality" },
    { value: "insomnia", label: "Insomnia / Trouble Falling Asleep" },
    { value: "waking_up_tired", label: "Waking Up Tired" },
    { value: "sleep_apnea", label: "Sleep Apnea" },
  ]},
  { category: "Cognitive", concerns: [
    { value: "brain_fog", label: "Brain Fog" },
    { value: "poor_focus", label: "Poor Focus / Concentration" },
    { value: "memory_issues", label: "Memory Issues" },
  ]},
  { category: "Stress & Mood", concerns: [
    { value: "high_stress", label: "High Stress" },
    { value: "anxiety", label: "Anxiety" },
    { value: "low_mood", label: "Low Mood / Depression" },
    { value: "mood_swings", label: "Mood Swings" },
  ]},
  { category: "Metabolic", concerns: [
    { value: "weight_management", label: "Weight Management" },
    { value: "slow_metabolism", label: "Slow Metabolism" },
    { value: "blood_sugar", label: "Blood Sugar Balance" },
    { value: "high_cholesterol", label: "High Cholesterol" },
  ]},
  { category: "Digestive", concerns: [
    { value: "bloating", label: "Bloating / Gas" },
    { value: "ibs", label: "IBS / Irregular Digestion" },
    { value: "food_sensitivities", label: "Food Sensitivities" },
  ]},
  { category: "Immunity", concerns: [
    { value: "frequent_illness", label: "Frequent Illness" },
    { value: "chronic_inflammation", label: "Chronic Inflammation" },
    { value: "autoimmune", label: "Autoimmune Concerns" },
  ]},
  { category: "Musculoskeletal", concerns: [
    { value: "joint_pain", label: "Joint Pain / Stiffness" },
    { value: "muscle_recovery", label: "Slow Muscle Recovery" },
    { value: "bone_health", label: "Bone Health Concerns" },
  ]},
  { category: "Hormonal", concerns: [
    { value: "hormonal_imbalance", label: "Hormonal Imbalance" },
    { value: "menopause", label: "Menopause / Perimenopause" },
    { value: "low_testosterone", label: "Low Testosterone" },
    { value: "thyroid", label: "Thyroid Issues" },
  ]},
  { category: "Longevity & General", concerns: [
    { value: "anti_aging", label: "Anti-Aging / Longevity" },
    { value: "skin_health", label: "Skin Health" },
    { value: "hair_nails", label: "Hair & Nail Health" },
    { value: "general_wellness", label: "General Wellness Optimization" },
    { value: "athletic_performance", label: "Athletic Performance" },
  ]},
] as const;

const FAMILY_HISTORY_CONDITIONS = [
  { value: "heart_disease", label: "Heart Disease / CVD" },
  { value: "type2_diabetes", label: "Type 2 Diabetes" },
  { value: "type1_diabetes", label: "Type 1 Diabetes" },
  { value: "cancer_breast", label: "Breast Cancer" },
  { value: "cancer_colon", label: "Colon Cancer" },
  { value: "cancer_lung", label: "Lung Cancer" },
  { value: "cancer_prostate", label: "Prostate Cancer" },
  { value: "cancer_other", label: "Other Cancer" },
  { value: "stroke", label: "Stroke" },
  { value: "hypertension", label: "High Blood Pressure" },
  { value: "high_cholesterol", label: "High Cholesterol" },
  { value: "alzheimers", label: "Alzheimer's / Dementia" },
  { value: "parkinsons", label: "Parkinson's Disease" },
  { value: "autoimmune", label: "Autoimmune Disease" },
  { value: "thyroid", label: "Thyroid Disorder" },
  { value: "mental_health", label: "Depression / Anxiety / Bipolar" },
  { value: "osteoporosis", label: "Osteoporosis" },
  { value: "kidney_disease", label: "Kidney Disease" },
  { value: "liver_disease", label: "Liver Disease" },
  { value: "mthfr", label: "MTHFR Variant (known)" },
  { value: "celiac", label: "Celiac Disease" },
  { value: "substance_abuse", label: "Substance Abuse / Addiction" },
  { value: "none_known", label: "None Known" },
  { value: "prefer_not_to_say", label: "Prefer Not to Say" },
] as const;

const FAMILY_RELATIONSHIPS = [
  "Mother", "Father", "Sister", "Brother",
  "Maternal Grandmother", "Maternal Grandfather",
  "Paternal Grandmother", "Paternal Grandfather",
] as const;

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
  "Acetaminophen", "Acyclovir", "Adderall", "Albuterol", "Alendronate",
  "Allopurinol", "Alprazolam", "Amitriptyline", "Amlodipine", "Amoxicillin",
  "Anastrozole", "Apixaban", "Aripiprazole", "Aspirin", "Atenolol",
  "Atorvastatin", "Azithromycin", "Baclofen", "Benazepril", "Bisoprolol",
  "Budesonide", "Bupropion", "Buspirone", "Carvedilol", "Cefdinir",
  "Celecoxib", "Cephalexin", "Cetirizine", "Citalopram", "Clindamycin",
  "Clobetasol", "Clonazepam", "Clonidine", "Clopidogrel", "Cyclobenzaprine",
  "Cymbalta", "Dexamethasone", "Diazepam", "Diclofenac", "Diltiazem",
  "Divalproex", "Donepezil", "Doxycycline", "Duloxetine", "Eliquis",
  "Enalapril", "Escitalopram", "Esomeprazole", "Estradiol", "Ezetimibe",
  "Famotidine", "Fenofibrate", "Fexofenadine", "Finasteride", "Fluconazole",
  "Fluoxetine", "Fluticasone", "Furosemide", "Gabapentin", "Glimepiride",
  "Glipizide", "Guanfacine", "Hydrochlorothiazide", "Hydrocodone",
  "Hydroxychloroquine", "Hydroxyzine", "Ibuprofen", "Insulin Glargine",
  "Insulin Lispro", "Irbesartan", "Januvia", "Jardiance", "Ketoconazole",
  "Lamotrigine", "Lansoprazole", "Latanoprost", "Levetiracetam",
  "Levofloxacin", "Levothyroxine", "Lexapro", "Linagliptin", "Lisinopril",
  "Lithium", "Loperamide", "Loratadine", "Lorazepam", "Losartan",
  "Lovastatin", "Melatonin", "Meloxicam", "Memantine", "Metformin",
  "Methadone", "Methocarbamol", "Methotrexate", "Methylphenidate",
  "Metoprolol", "Metronidazole", "Mirtazapine", "Montelukast", "Morphine",
  "Naproxen", "Nifedipine", "Nitrofurantoin", "Norvasc", "Nystatin",
  "Olanzapine", "Olmesartan", "Omeprazole", "Ondansetron", "Oxycodone",
  "Ozempic", "Pantoprazole", "Paroxetine", "Penicillin", "Pioglitazone",
  "Potassium Chloride", "Pravastatin", "Prednisolone", "Prednisone",
  "Pregabalin", "Progesterone", "Propranolol", "Quetiapine", "Ramipril",
  "Ranitidine", "Risperidone", "Rivaroxaban", "Rosuvastatin", "Semaglutide",
  "Sertraline", "Sildenafil", "Simvastatin", "Sitagliptin", "Spironolactone",
  "Sulfamethoxazole", "Sumatriptan", "Tadalafil", "Tamoxifen", "Tamsulosin",
  "Telmisartan", "Temazepam", "Tirzepatide", "Topiramate", "Tramadol",
  "Trazodone", "Triamcinolone", "Trimethoprim", "Valacyclovir", "Valsartan",
  "Venlafaxine", "Verapamil", "Vitamin D3", "Warfarin", "Wegovy",
  "Wellbutrin", "Xanax", "Xarelto", "Zoloft", "Zolpidem",
];

// ─── Ethnicity Options ─────────────────────────────────────────────────────

const ETHNICITY_OPTIONS = [
  { value: "white_caucasian", label: "White / Caucasian" },
  { value: "black_african_american", label: "Black / African American" },
  { value: "hispanic_latino", label: "Hispanic / Latino" },
  { value: "east_asian", label: "East Asian" },
  { value: "south_asian", label: "South Asian" },
  { value: "southeast_asian", label: "Southeast Asian" },
  { value: "middle_eastern_north_african", label: "Middle Eastern / North African" },
  { value: "native_american_alaska_native", label: "Native American / Alaska Native" },
  { value: "native_hawaiian_pacific_islander", label: "Native Hawaiian / Pacific Islander" },
  { value: "mixed_multiracial", label: "Mixed / Multiracial" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

function calculateAge(dobString: string): number {
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// ─── Types ──────────────────────────────────────────────────────────────────

type DemographicsData = {
  name: string;
  dob: string;
  age: string;
  sex: string;
  height: string;
  weight: string;
  ethnicity: string[];
  bloodType: string;
  concerns: string[];
  familyHistory: string[];
};

type SymptomsData = Record<string, number>;

type SymptomPhaseData = Record<string, { score: number; description: string }>;

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

// ─── Bio Optimization Score Calculator ──────────────────────────────────────────────

function calculateBioOptimizationScore(
  symptoms: SymptomsData,
  lifestyle: LifestyleData,
  goals: GoalsData
): number {
  // Base score from symptoms (1=bad, 10=good → scale to 0-100)
  const symptomValues = Object.values(symptoms);
  const avgSymptom = symptomValues.length > 0
    ? symptomValues.reduce((a, b) => a + b, 0) / symptomValues.length
    : 5;
  const symptomScore = Math.max(0, Math.min(100, (avgSymptom / 10) * 100));

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
  // Scale: 1=bad, 10=good. Low scores = more issues in that area.
  const stressAnxiety = (symptoms["Stress"] || 5) + (symptoms["Anxiety"] || 5);
  const energy = symptoms["Energy"] || 5;
  const digestion = symptoms["Digestion"] || 5;

  if (stressAnxiety < 8) return "Vata (Air)";    // Low stress+anxiety scores = high stress
  if (energy > 6 && digestion < 5) return "Pitta (Fire)"; // High energy, poor digestion
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
  const [showProcessing, setShowProcessing] = useState(false);

  // Phase 1 state
  const [demographics, setDemographics] = useState<DemographicsData>({
    name: "", dob: "", age: "", sex: "", height: "", weight: "",
    ethnicity: [], bloodType: "", concerns: [], familyHistory: [],
  });
  const [ethnicityOpen, setEthnicityOpen] = useState(false);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("ft");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("lbs");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [bodyType, setBodyType] = useState<string | null>(null);

  // Phase 1b state — Health Concerns & Family History
  const [healthConcerns, setHealthConcerns] = useState<string[]>([]);
  const [familyHistory, setFamilyHistory] = useState<{ condition: string; relationships: string[] }[]>([]);

  // Symptom phase states (3 phases: physical, neurological, emotional)
  function initSymptomPhase(fields: SymptomField[]): SymptomPhaseData {
    const init: SymptomPhaseData = {};
    fields.forEach((f) => { init[f.id] = { score: 0, description: "" }; });
    return init;
  }
  const [symptomsPhysical, setSymptomsPhysical] = useState<SymptomPhaseData>(() => initSymptomPhase(PHYSICAL_SYMPTOMS));
  const [symptomsNeuro, setSymptomsNeuro] = useState<SymptomPhaseData>(() => initSymptomPhase(NEUROLOGICAL_SYMPTOMS));
  const [symptomsEmotional, setSymptomsEmotional] = useState<SymptomPhaseData>(() => initSymptomPhase(EMOTIONAL_SYMPTOMS));

  // Legacy symptoms for bio optimization score calculation (derived from new data)
  const symptoms: SymptomsData = {
    Energy: 10 - (symptomsPhysical.fatigue_severity?.score ?? 0),
    Sleep: 10 - (symptomsNeuro.sleep_quality_severity?.score ?? 0),
    Stress: 10 - (symptomsEmotional.stress_severity?.score ?? 0),
    Anxiety: 10 - (symptomsEmotional.anxiety_severity?.score ?? 0),
    Digestion: 10 - (symptomsPhysical.digestive_severity?.score ?? 0),
    Cognition: 10 - (symptomsNeuro.brain_fog_severity?.score ?? 0),
  };

  // Phase 3 state (Lifestyle)
  const [lifestyle, setLifestyle] = useState<LifestyleData>({
    diet: "", exercise: "", sleepHours: "", stressLevel: "",
    alcohol: "", smoking: "", caffeine: "", waterIntake: "",
    screenTime: "", sunExposure: "",
  });

  // Phase 4b state — Current Supplements (FarmCeutica search + AI product lookup)
  const [userSupplements, setUserSupplements] = useState<{ name: string; brand: string; source: string; deliveryMethod: string; dosage: string; unit: string; frequency: string; reason: string; ingredientBreakdown?: { name: string; amount: number; unit: string; category?: string; dailyValuePercent?: number | null }[] }[]>([]);
  const [suppSearchQuery, setSuppSearchQuery] = useState("");
  const [suppSearchResults, setSuppSearchResults] = useState<{ name: string; search_name: string; category: string; delivery_method: string }[]>([]);
  const [showDosageModal, setShowDosageModal] = useState<string | null>(null);
  const [dosageForm, setDosageForm] = useState({ deliveryMethod: "", dosage: "", unit: "mg", frequency: "", reason: "" });
  // AI product lookup state
  const [aiLookupLoading, setAiLookupLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aiLookupResult, setAiLookupResult] = useState<any>(null);
  const [aiLookupError, setAiLookupError] = useState("");
  const [aiEditMode, setAiEditMode] = useState(false);
  // Photo upload state
  const [productPhotos, setProductPhotos] = useState<File[]>([]);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);

  // Phase 4 state
  const [medications, setMedications] = useState<MedicationsData>({
    medications: [], supplements: [], allergies: [], adverseReactions: "",
  });
  const [medSearch, setMedSearch] = useState("");
  const [suppInput, setSuppInput] = useState("");
  const [suppMgInput, setSuppMgInput] = useState("");
  const [allergyInput, setAllergyInput] = useState("");
  // Interaction check state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [interactionResults, setInteractionResults] = useState<any[]>([]);
  const [interactionSummary, setInteractionSummary] = useState({ major: 0, moderate: 0, minor: 0, synergistic: 0 });

  // Phase 5 state
  const [goals, setGoals] = useState<GoalsData>({
    goals: [], supplementForm: "", budgetRange: 50, communicationPref: "email",
  });

  // Medication autocomplete
  const medSuggestions = useMemo(() => {
    if (!medSearch.trim()) return [];
    const q = medSearch.toLowerCase();
    const matches = COMMON_MEDICATIONS.filter(
      (m) => m.toLowerCase().includes(q) && !medications.medications.includes(m)
    );
    // Sort: starts-with first, then contains
    matches.sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.localeCompare(b);
    });
    return matches.slice(0, 8);
  }, [medSearch, medications.medications]);

  // Pre-populate full name from auth metadata for Demographics page
  useEffect(() => {
    if (stepId === "1" && !demographics.name) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.user_metadata?.full_name) {
          setDemographics((prev) => ({ ...prev, name: user.user_metadata.full_name }));
        }
      });
    }
  }, [stepId, demographics.name]);

  // Real-time interaction check when medications or supplements change
  useEffect(() => {
    if (stepId !== "4") return;
    const meds = medications.medications.filter((m) => m !== "None");
    const supps = userSupplements.filter((s) => s.name !== "None").map((s) => s.name);
    if (meds.length === 0 || supps.length === 0) { setInteractionResults([]); setInteractionSummary({ major: 0, moderate: 0, minor: 0, synergistic: 0 }); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai/check-interactions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ medications: meds, supplements: supps, recommendations: [], allergies: medications.allergies.filter((a) => a !== "None") }),
        });
        const data = await res.json();
        setInteractionResults(data.interactions || []);
        setInteractionSummary(data.summary || { major: 0, moderate: 0, minor: 0, synergistic: 0 });
      } catch { /* silent fail */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [stepId, medications.medications, medications.allergies, userSupplements]);

  // Close ethnicity dropdown on outside click
  useEffect(() => {
    if (!ethnicityOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-ethnicity-dropdown]")) setEthnicityOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ethnicityOpen]);

  const isLast = stepId === "3"; // Lifestyle & Goals is last questionnaire phase
  // For "Back" navigation, skip interstitials
  const prevFormIndex = (() => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!PHASES[i].id.startsWith("i-")) return i;
    }
    return -1;
  })();
  const prevHref = prevFormIndex >= 0 ? `/onboarding/${PHASES[prevFormIndex].id}` : null;

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
        case "1": await savePhase("1", { ...demographics, bodyType }); break;
        case "1b": await savePhase("6", { healthConcerns, familyHistory }); break;
        case "2a": await savePhase("7", symptomsPhysical); break;
        case "2b": await savePhase("8", symptomsNeuro); break;
        case "2c": await savePhase("9", symptomsEmotional); break;
        case "4": await savePhase("4", { ...medications, userSupplements }); break;
        case "3": {
          await savePhase("3", { ...lifestyle, goals: goals.goals, supplementForm: goals.supplementForm, budgetRange: goals.budgetRange });

          // Show Ultrathink processing animation immediately
          setShowProcessing(true);

          // ═══ Calculate Bio Optimization Score ═══
          let bioScore = 0;
          try {
            const bioRes = await fetch("/api/ai/calculate-bio-optimization", { method: "POST" });
            if (bioRes.ok) {
              const bioData = await bioRes.json();
              bioScore = bioData.score || 0;
            }
          } catch {
            bioScore = calculateBioOptimizationScore(symptoms, lifestyle, goals);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("profiles").update({ bio_optimization_score: bioScore, assessment_completed: true }).eq("id", user.id);
            }
          }
          toast.success(`Your Bio Optimization Score: ${bioScore}/100`, { duration: 5000 });

          // ═══ Fire ALL downstream AI engines ═══
          try {
            const triggerResult = await completeCAQAndTriggerEngines();
            if (triggerResult.errors.length > 0) {
              console.warn("Engine warnings:", triggerResult.errors);
            }
          } catch (err) {
            console.error("Engine trigger error:", err);
          }

          // ═══ Generate Supplement Recommendations ═══
          try {
            const res = await fetch("/api/recommendations/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            if (res.ok) {
              const data = await res.json();
              toast.success(`${data.recommendations_count} supplements recommended for you!`, { duration: 4000 });
            }
          } catch { /* protocol generation optional */ }

          return;
        }
      }
      // Navigate to next phase (form or interstitial)
      router.push(`/onboarding/${PHASES[currentIndex + 1].id}`);
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, demographics, healthConcerns, familyHistory, symptomsPhysical, symptomsNeuro, symptomsEmotional, symptoms, lifestyle, medications, userSupplements, goals, currentIndex, router]);

  // Check if current step is an interstitial
  const isInterstitial = stepId.startsWith("i-");
  const interstitialConfig = isInterstitial && phase && "caqIndex" in phase
    ? CAQ_INTERSTITIALS[phase.caqIndex as number]
    : null;

  // Redirect if invalid step (after all hooks)
  if (!phase) {
    router.replace("/onboarding/i-caq-intro");
    return null;
  }

  // Render personalized welcome dashboard (special interstitial)
  if (stepId === "i-welcome") {
    return <WelcomeDashboardScreen />;
  }

  // Auto-navigate after processing animation
  useEffect(() => {
    if (!showProcessing) return;
    const timer = setTimeout(() => {
      router.push(`/onboarding/${PHASES[currentIndex + 1].id}`);
    }, 10000);
    return () => clearTimeout(timer);
  }, [showProcessing, currentIndex, router]);

  // Render Ultrathink processing animation (after last CAQ phase)
  if (showProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin" style={{ animationDuration: "8s" }}>
          <svg className="w-16 h-16 text-teal-400/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M6 9l6-6 6 6M6 15l6 6 6-6" />
          </svg>
        </div>
        <div className="mt-8 space-y-3">
          {[
            { text: "Absorbing your assessment data...", delay: "0s" },
            { text: "Cross-referencing 14 specialty lenses...", delay: "2.5s" },
            { text: "Identifying your master patterns...", delay: "5s" },
            { text: "Generating your personalized blueprint...", delay: "7.5s" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: step.delay, opacity: 0, animationFillMode: "forwards" }}>
              <Brain className="w-4 h-4 text-teal-400" strokeWidth={1.5} />
              <span className="text-sm text-white/60">{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render interstitial screen (full-bleed, no form chrome)
  if (isInterstitial && interstitialConfig) {
    return (
      <InterstitialScreen
        config={interstitialConfig}
        onContinue={() => router.push(`/onboarding/${PHASES[currentIndex + 1].id}`)}
        celebrationMode={stepId === "i-caq-complete"}
      />
    );
  }

  // Form phases only (exclude interstitials and "complete" from progress bar)
  const formPhases = PHASES.filter((s) => !s.id.startsWith("i-") && s.id !== "complete");
  const currentFormIndex = formPhases.findIndex((s) => s.id === stepId);

  return (
    <div className={`relative w-full mx-auto ${stepId === "complete" ? "max-w-4xl" : "max-w-[720px]"}`}>
      {/* Calming helix background */}
      {stepId !== "complete" && (
        <CalmingHelixBackground phase={currentFormIndex + 1} totalPhases={formPhases.length} />
      )}
      {/* Logo */}
      <div className="text-center mb-6 relative z-10">
        <h1 className="text-3xl font-bold text-white">
          <span className="text-copper">Via</span>Connect
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Clinical Assessment Questionnaire</p>
      </div>

      {/* Animated progress bar with motivation */}
      {stepId !== "complete" && (
        <ProgressMotivator
          currentPhase={currentFormIndex + 1}
          totalPhases={formPhases.length}
          partialData={{
            symptomsPhysical: symptomsPhysical,
            symptomsNeurological: symptomsNeuro,
            symptomsEmotional: symptomsEmotional,
            medications: medications.medications.map(m => ({ name: m })),
          }}
        />
      )}

      <div className={`glass rounded-2xl ${stepId === "complete" ? "p-6 lg:p-8" : "p-6 lg:p-8"}`}>
        {/* Phase header (hidden on complete page — it has its own) */}
        {stepId !== "complete" && (
          <div className="mb-6">
            <p className="text-xs text-copper font-semibold uppercase tracking-wider">
              Phase {currentFormIndex + 1} of {formPhases.length}
            </p>
            <h2 className="text-xl font-bold text-white mt-1">{phase.title}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{phase.description}</p>
          </div>
        )}

        {/* ── Phase 1: Demographics (Health Profile) ── */}
        {stepId === "1" && (
          <div className="space-y-5">
            {/* Full Name — read-only, pre-populated from signup */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Full Name</label>
              <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-white/60 cursor-not-allowed flex items-center justify-between" aria-readonly="true">
                <span>{demographics.name || "Loading..."}</span>
                {demographics.name && (
                  <span className="text-xs text-teal-400/60 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> From previous step
                  </span>
                )}
              </div>
            </div>

            {/* Date of Birth — Month / Day / Year dropdowns */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Date of Birth *</label>
              <div className="grid grid-cols-3 gap-3">
                {/* Month */}
                <select
                  value={demographics.dob ? String(parseInt(demographics.dob.split("-")[1])) : ""}
                  onChange={(e) => {
                    const parts = (demographics.dob || "--").split("-");
                    const y = parts[0] || "";
                    const d = parts[2] || "";
                    const m = e.target.value.padStart(2, "0");
                    if (y && m && d) {
                      const dob = `${y}-${m}-${d}`;
                      setDemographics({ ...demographics, dob, age: String(calculateAge(dob)) });
                    } else {
                      setDemographics({ ...demographics, dob: `${y}-${m}-${d}` });
                    }
                  }}
                  className={"w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-copper/50 focus:border-copper/50 transition-colors appearance-none"}
                >
                  <option value="">Month</option>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                    <option key={m} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
                {/* Day */}
                <select
                  value={demographics.dob ? String(parseInt(demographics.dob.split("-")[2])) : ""}
                  onChange={(e) => {
                    const parts = (demographics.dob || "--").split("-");
                    const y = parts[0] || "";
                    const m = parts[1] || "";
                    const d = e.target.value.padStart(2, "0");
                    if (y && m && d) {
                      const dob = `${y}-${m}-${d}`;
                      setDemographics({ ...demographics, dob, age: String(calculateAge(dob)) });
                    } else {
                      setDemographics({ ...demographics, dob: `${y}-${m}-${d}` });
                    }
                  }}
                  className={"w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-copper/50 focus:border-copper/50 transition-colors appearance-none"}
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                  ))}
                </select>
                {/* Year */}
                <select
                  value={demographics.dob ? demographics.dob.split("-")[0] : ""}
                  onChange={(e) => {
                    const parts = (demographics.dob || "--").split("-");
                    const m = parts[1] || "";
                    const d = parts[2] || "";
                    const y = e.target.value;
                    if (y && m && d) {
                      const dob = `${y}-${m}-${d}`;
                      setDemographics({ ...demographics, dob, age: String(calculateAge(dob)) });
                    } else {
                      setDemographics({ ...demographics, dob: `${y}-${m}-${d}` });
                    }
                  }}
                  className={"w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-copper/50 focus:border-copper/50 transition-colors appearance-none"}
                >
                  <option value="">Year</option>
                  {Array.from({ length: new Date().getFullYear() - 1919 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={String(year)}>{year}</option>;
                  })}
                </select>
              </div>
              {demographics.dob && demographics.dob.split("-").every(p => p && p !== "") && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-teal-400/10 border border-teal-400/20 text-teal-400 text-sm font-medium">
                    Age: {demographics.age}
                  </span>
                  {parseInt(demographics.age) < 18 && parseInt(demographics.age) > 0 && (
                    <span className="text-xs text-orange-400">* Parental consent may be required</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Biological Sex — pill selector */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-white/70">Biological Sex *</label>
                <div className="flex flex-wrap gap-2">
                  {["Male", "Female", "Intersex", "Prefer not to say"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDemographics({ ...demographics, sex: opt.toLowerCase().replace(/ /g, "_") })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        demographics.sex === opt.toLowerCase().replace(/ /g, "_")
                          ? "bg-teal-400/15 text-teal-400 border-teal-400/30"
                          : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ethnicity — multi-select dropdown */}
              <div className="md:col-span-2 space-y-2 relative" data-ethnicity-dropdown>
                <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                  Ethnicity <span className="text-white/30">(optional)</span>
                  <span className="group relative">
                    <Info className="w-3.5 h-3.5 text-white/30 cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 rounded-lg bg-[#1E2D4A] border border-white/10 text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      Ethnicity helps identify genetic predispositions and tailor supplement recommendations. This data is encrypted and never shared.
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setEthnicityOpen(!ethnicityOpen)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left hover:border-white/20 focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none transition-all flex items-center justify-between"
                >
                  <span className={demographics.ethnicity.length ? "text-white" : "text-white/30"}>
                    {demographics.ethnicity.length
                      ? demographics.ethnicity.map((v) => ETHNICITY_OPTIONS.find((o) => o.value === v)?.label).join(", ")
                      : "Select ethnicity..."}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${ethnicityOpen ? "rotate-180" : ""}`} />
                </button>
                {ethnicityOpen && (
                  <div className="absolute z-50 w-full mt-1 rounded-xl bg-[#1E2D4A] border border-white/10 shadow-2xl shadow-black/40 max-h-64 overflow-y-auto">
                    {ETHNICITY_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={demographics.ethnicity.includes(option.value)}
                          onChange={() => {
                            const newEth = demographics.ethnicity.includes(option.value)
                              ? demographics.ethnicity.filter((v) => v !== option.value)
                              : [...demographics.ethnicity, option.value];
                            setDemographics({ ...demographics, ethnicity: newEth });
                            setEthnicityOpen(false);
                          }}
                          className="rounded border-white/20 bg-white/5 text-teal-400 focus:ring-teal-400/30"
                        />
                        <span className="text-sm text-white/80">{option.label}</span>
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEthnicityOpen(false)}
                      className="w-full py-2.5 text-sm font-medium text-teal-400 border-t border-white/10 hover:bg-white/5 transition-colors sticky bottom-0 bg-[#1E2D4A]"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>

              {/* Blood Type */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Blood Type</label>
                <select value={demographics.bloodType} onChange={(e) => setDemographics({ ...demographics, bloodType: e.target.value })} className={selectClass}>
                  <option value="">Select...</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map((bt) => (
                    <option key={bt}>{bt}</option>
                  ))}
                </select>
              </div>

              {/* Height */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-white/70">Height <span className="text-white/30">(optional)</span></label>
                  <div className="flex items-center gap-1 p-0.5 rounded-md bg-dark-surface border border-dark-border">
                    <button type="button" onClick={() => setHeightUnit("ft")} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${heightUnit === "ft" ? "bg-copper/20 text-copper" : "text-gray-500"}`}>ft/in</button>
                    <button type="button" onClick={() => setHeightUnit("cm")} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${heightUnit === "cm" ? "bg-copper/20 text-copper" : "text-gray-500"}`}>cm</button>
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

              {/* Weight */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-white/70">Weight <span className="text-white/30">(optional)</span></label>
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
            </div>

            {/* BMI indicator */}
            {demographics.height && demographics.weight && parseFloat(demographics.height) > 0 && parseFloat(demographics.weight) > 0 && (() => {
              const h = parseFloat(demographics.height) / 100;
              const w = parseFloat(demographics.weight);
              const bmi = w / (h * h);
              if (!isFinite(bmi) || bmi <= 0) return null;
              return (
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-white/30">
                    BMI: <span className={`font-medium ${bmi < 18.5 ? "text-amber-400" : bmi < 25 ? "text-teal-400" : "text-orange-400"}`}>{bmi.toFixed(1)}</span>
                    {bmi < 18.5 && <span className="text-amber-400/60 ml-2">(Underweight)</span>}
                  </p>
                </div>
              );
            })()}

            {/* Conditional Body Type Selector — appears when underweight */}
            {shouldShowBodyTypeSelector({
              height: demographics.height,
              weight: demographics.weight,
              heightUnit: heightUnit === "ft" ? "ft" : "cm",
              weightUnit: weightUnit,
            }) && (
              <BodyTypeSelector value={bodyType} onChange={setBodyType} />
            )}

          </div>
        )}

        {/* ── Phase 1b: Health Concerns & Family History ── */}
        {stepId === "1b" && (
          <div className="space-y-6">
            {/* Sub-section A: Health Concerns */}
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-white/40 font-semibold mb-1">Primary Health Concerns</p>
              <p className="text-sm text-gray-400 mb-4">Select all that apply to you right now</p>
              {HEALTH_CONCERN_CATEGORIES.map((cat) => (
                <div key={cat.category} className="mb-5">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/40 font-semibold mb-3">{cat.category}</p>
                  <div className="flex flex-wrap gap-2">
                    {cat.concerns.map((c) => {
                      const selected = healthConcerns.includes(c.value) && !healthConcerns.includes("none_of_the_above");
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setHealthConcerns((prev) => {
                            const filtered = prev.filter((v) => v !== "none_of_the_above");
                            return filtered.includes(c.value) ? filtered.filter((v) => v !== c.value) : [...filtered, c.value];
                          })}
                          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm font-medium transition-all duration-200 ${
                            selected
                              ? "bg-teal-400/10 border-teal-400/40 text-teal-400"
                              : "bg-white/5 border-white/10 text-white/70 hover:border-white/20"
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* None of the above */}
              <button
                type="button"
                onClick={() => setHealthConcerns((prev) =>
                  prev.includes("none_of_the_above") ? [] : ["none_of_the_above"]
                )}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm font-medium transition-all duration-200 ${
                  healthConcerns.includes("none_of_the_above")
                    ? "bg-portal-green/15 border-portal-green/30 text-portal-green"
                    : "bg-white/5 border-white/10 text-white/70 hover:border-white/20"
                }`}
              >
                None of the above
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-grow h-px bg-white/10" />
              <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium">Family History</span>
              <div className="flex-grow h-px bg-white/10" />
            </div>

            {/* Sub-section B: Family History */}
            <div>
              <p className="text-sm text-gray-400 mb-4">Select conditions that immediate family members have been diagnosed with</p>
              <div className="space-y-2">
                {FAMILY_HISTORY_CONDITIONS.map((cond) => {
                  const entry = familyHistory.find((e) => e.condition === cond.value);
                  const isSelected = !!entry;
                  const isExclusive = cond.value === "none_known" || cond.value === "prefer_not_to_say";
                  return (
                    <div
                      key={cond.value}
                      className={`rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "bg-white/5 border-teal-400/30"
                          : "bg-white/[0.02] border-white/5 hover:border-white/10"
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isExclusive) {
                              setFamilyHistory(isSelected ? [] : [{ condition: cond.value, relationships: [] }]);
                            } else {
                              setFamilyHistory((prev) => {
                                const filtered = prev.filter((e) => e.condition !== "none_known" && e.condition !== "prefer_not_to_say");
                                return isSelected
                                  ? filtered.filter((e) => e.condition !== cond.value)
                                  : [...filtered, { condition: cond.value, relationships: [] }];
                              });
                            }
                          }}
                          className="rounded border-white/20 bg-white/5 text-teal-400 focus:ring-teal-400/30 w-5 h-5"
                        />
                        <span className="text-sm text-white/80 font-medium">{cond.label}</span>
                      </label>
                      {isSelected && !isExclusive && (
                        <div className="mt-3 ml-8 flex flex-wrap gap-2">
                          <span className="text-xs text-white/40 mr-1 self-center">Who?</span>
                          {FAMILY_RELATIONSHIPS.map((rel) => {
                            const relSelected = entry?.relationships.includes(rel) ?? false;
                            return (
                              <button
                                key={rel}
                                type="button"
                                onClick={() => {
                                  setFamilyHistory((prev) =>
                                    prev.map((e) =>
                                      e.condition === cond.value
                                        ? {
                                            ...e,
                                            relationships: relSelected
                                              ? e.relationships.filter((r) => r !== rel)
                                              : [...e.relationships, rel],
                                          }
                                        : e
                                    )
                                  );
                                }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                  relSelected
                                    ? "bg-teal-400/15 border border-teal-400/30 text-teal-400"
                                    : "bg-white/5 border border-white/10 text-white/50 hover:text-white/70"
                                }`}
                              >
                                {rel}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Symptom Phases (2a, 2b, 2c) ── */}
        {(stepId === "2a" || stepId === "2b" || stepId === "2c") && (() => {
          const phaseMap = {
            "2a": { fields: PHYSICAL_SYMPTOMS, data: symptomsPhysical, setData: setSymptomsPhysical },
            "2b": { fields: NEUROLOGICAL_SYMPTOMS, data: symptomsNeuro, setData: setSymptomsNeuro },
            "2c": { fields: EMOTIONAL_SYMPTOMS, data: symptomsEmotional, setData: setSymptomsEmotional },
          } as const;
          const { fields, data, setData } = phaseMap[stepId as "2a" | "2b" | "2c"];
          return (
            <div className="space-y-4">
              {/* AI quality badge */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-400/5 border border-teal-400/15 mb-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-400/10 flex items-center justify-center mt-0.5">
                  <Brain className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-teal-400 font-medium">More detail = smarter protocol</p>
                  <p className="text-xs text-white/40 mt-0.5">The sliders are enough on their own, but adding a brief description helps our AI build a more precise and personalized protocol for you. Descriptions are completely optional.</p>
                </div>
              </div>

              {/* Symptom cards */}
              <div className="space-y-3">
                {fields.map((symptom) => {
                  const entry = data[symptom.id] ?? { score: 0, description: "" };
                  const fillPct = (entry.score / 10) * 100;
                  const wordCount = entry.description.trim() ? entry.description.trim().split(/\s+/).length : 0;
                  return (
                    <div key={symptom.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-5 hover:border-white/10 transition-colors">
                      <div className="mb-4">
                        <h3 className="text-base font-medium text-white/90">
                          {CONVERSATIONAL_LABELS[symptom.id]?.conversational || symptom.label}
                        </h3>
                        <p className="text-xs text-white/35 mt-0.5">{symptom.description}</p>
                      </div>
                      {/* Slider */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-white/30">{symptom.sliderLabels[0]}</span>
                          <span className="text-sm font-semibold text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-full min-w-[2rem] text-center">{entry.score}</span>
                          <span className="text-xs text-white/30">{symptom.sliderLabels[1]}</span>
                        </div>
                        <input
                          type="range" min={0} max={10} value={entry.score}
                          onChange={(e) => setData((prev) => ({ ...prev, [symptom.id]: { ...prev[symptom.id], score: parseInt(e.target.value) } }))}
                          className="w-full h-2 symptom-slider rounded-full"
                          style={{
                            background: `linear-gradient(to right, #2DA5A0 0%, #2DA5A0 ${fillPct}%, rgba(255,255,255,0.1) ${fillPct}%, rgba(255,255,255,0.1) 100%)`,
                            borderRadius: "9999px",
                            WebkitAppearance: "none",
                            appearance: "none",
                          }}
                        />
                      </div>
                      {/* Optional description */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs text-white/30">Optional: describe your experience</label>
                          <span className={`text-xs ${wordCount > 200 ? "text-red-400" : "text-white/20"}`}>{wordCount}/200 words</span>
                        </div>
                        <div className="flex gap-2">
                          <textarea
                            value={entry.description}
                            onChange={(e) => {
                              const words = e.target.value.trim().split(/\s+/);
                              if (words.length <= 200 || e.target.value.length < entry.description.length) {
                                setData((prev) => ({ ...prev, [symptom.id]: { ...prev[symptom.id], description: e.target.value } }));
                              }
                            }}
                            placeholder={SMART_PLACEHOLDERS[symptom.id] || DEFAULT_PLACEHOLDER}
                            rows={2}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-sm text-white/70 placeholder:text-white/20 resize-none focus:border-teal-400/30 focus:ring-1 focus:ring-teal-400/20 focus:outline-none transition-all"
                          />
                          <VoiceInput onTranscript={(text) => setData((prev) => ({ ...prev, [symptom.id]: { ...prev[symptom.id], description: prev[symptom.id].description ? prev[symptom.id].description + " " + text : text } }))} />
                        </div>
                        {/* Pulsing brain indicator */}
                        {entry.description.trim().length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <BrainCircuit className="w-3.5 h-3.5 text-teal-400/60 animate-pulse" strokeWidth={1.5} />
                            <span className="text-[10px] text-teal-400/40 font-medium">Ultrathink is absorbing your insight</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Phase 3: Lifestyle & Goals (combined) ── */}
        {stepId === "3" && (
          <div className="space-y-6">
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

            {/* Divider — Goals */}
            <div className="flex items-center gap-4">
              <div className="flex-grow h-px bg-white/10" />
              <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium">Wellness Goals</span>
              <div className="flex-grow h-px bg-white/10" />
            </div>

            {/* Wellness goals */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">What are your top wellness goals?</label>
              <div className="flex flex-wrap gap-2">
                {WELLNESS_GOALS.map((g) => (
                  <button key={g} type="button"
                    onClick={() => toggleChip(goals.goals, g, (v) => setGoals({ ...goals, goals: v }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      goals.goals.includes(g) ? "bg-copper/15 text-copper border-copper/30" : "bg-dark-surface text-gray-400 border-dark-border hover:border-white/20"
                    }`}>{g}</button>
                ))}
              </div>
            </div>

            {/* Supplement form preference */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Supplement Form</label>
              <div className="flex flex-wrap gap-2">
                {SUPPLEMENT_FORMS.map((f) => (
                  <button key={f} type="button"
                    onClick={() => setGoals({ ...goals, supplementForm: f })}
                    className={`text-xs px-4 py-2 rounded-lg border transition-colors ${
                      goals.supplementForm === f ? "bg-teal/15 text-teal-light border-teal/30" : "bg-dark-surface text-gray-400 border-dark-border hover:border-white/20"
                    }`}>{f}</button>
                ))}
              </div>
            </div>

            {/* Budget slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-300">Monthly Budget</label>
                <span className="text-sm font-mono text-copper">${goals.budgetRange}</span>
              </div>
              <input type="range" min={10} max={300} step={10} value={goals.budgetRange}
                onChange={(e) => setGoals({ ...goals, budgetRange: parseInt(e.target.value) })}
                className="w-full accent-copper h-1.5" />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>$10</span><span>$150</span><span>$300</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase 4: Medications ── */}
        {stepId === "4" && (
          <div className="space-y-6">
            {/* Interaction Banner (shown when interactions detected) */}
            {interactionResults.length > 0 && (
              <InteractionBanner interactions={interactionResults} />
            )}

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
                {medSearch.trim().length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-lg border border-dark-border bg-dark-card shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                    {medSuggestions.map((med) => (
                      <button
                        key={med}
                        onClick={() => {
                          setMedications({ ...medications, medications: [...medications.medications, med] });
                          setMedSearch("");
                          createClient().auth.getUser().then(({ data: { user } }) => { if (user) emitDataEvent(user.id, "medication_added", { name: med }); });
                        }}
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-white/[0.04] hover:text-white transition-colors border-b border-white/[0.03] last:border-0"
                      >
                        {med}
                      </button>
                    ))}
                    {/* Add custom medication when no match or user wants custom */}
                    <button
                      onClick={() => {
                        setMedications({ ...medications, medications: [...medications.medications, medSearch.trim()] });
                        setMedSearch("");
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm font-medium text-teal-400 hover:bg-teal-400/5 transition-colors flex items-center gap-2 border-t border-white/10"
                    >
                      <Plus className="w-4 h-4" />
                      Add &quot;{medSearch.trim()}&quot;
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {medications.medications.map((m) => (
                  <span key={m} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${m === "None" ? "bg-portal-green/15 text-portal-green border-portal-green/30" : "bg-dark-surface text-gray-300 border-dark-border"}`}>
                    {m}
                    <button onClick={() => setMedications({ ...medications, medications: medications.medications.filter((x) => x !== m) })}>
                      <X className="w-3 h-3 text-gray-500 hover:text-white" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMedications({ ...medications, medications: medications.medications.includes("None") ? [] : ["None"] })}
                className={`mt-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  medications.medications.includes("None")
                    ? "bg-portal-green/15 border-portal-green/30 text-portal-green"
                    : "bg-white/5 border-white/10 text-white/70 hover:border-white/20"
                }`}
              >
                No current medications
              </button>
            </div>

            {/* Supplements — FarmCeutica Search */}
            <div>
              <label className="block text-base font-semibold text-white mb-1">What You Are Currently Taking</label>
              <p className="text-sm text-white/40 mb-3">Add every supplement, vitamin, and mineral you take regularly</p>

              {/* Search Input — reacts on EVERY keystroke including first */}
              {!showDosageModal && !userSupplements.some(s => s.name === "None") && (
                <div className="relative mb-3">
                  <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-400/50 pointer-events-none" />
                  <input
                    type="text"
                    value={suppSearchQuery}
                    onChange={(e) => setSuppSearchQuery(e.target.value)}
                    onFocus={() => { if (suppSearchQuery.trim()) setSuppSearchResults([]); }}
                    placeholder="Search your current vitamins and minerals by brand or ingredient"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-teal-400/30 text-base text-white placeholder:text-white/30 focus:border-teal-400/60 focus:ring-1 focus:ring-teal-400/30 focus:outline-none transition-all"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              )}

              {/* Search Results — instant client-side filtering, alphabetical */}
              {!showDosageModal && suppSearchQuery.trim().length > 0 && (() => {
                const q = suppSearchQuery.toLowerCase().trim();
                const filtered = SEED_INGREDIENTS
                  .filter((i) => {
                    const name = i.search_name.toLowerCase();
                    return name.startsWith(q) || name.split(/[\s\-\(\)\/]+/).some(word => word.startsWith(q));
                  })
                  .sort((a, b) => {
                    const aStarts = a.search_name.toLowerCase().startsWith(q) ? 0 : 1;
                    const bStarts = b.search_name.toLowerCase().startsWith(q) ? 0 : 1;
                    if (aStarts !== bStarts) return aStarts - bStarts;
                    return a.search_name.localeCompare(b.search_name);
                  })
                  .slice(0, 15);
                return (
                  <div className="rounded-xl bg-[#1E2D4A] border border-white/10 shadow-2xl shadow-black/40 max-h-[320px] overflow-y-auto mb-3 z-50 relative">
                    {filtered.map((item) => {
                      // Highlight matching text
                      const name = item.search_name;
                      const lowerName = name.toLowerCase();
                      let matchIdx = lowerName.indexOf(q);
                      if (matchIdx === -1) {
                        const words = lowerName.split(/[\s\-\(\)\/]+/);
                        let pos = 0;
                        for (const word of words) {
                          const wIdx = lowerName.indexOf(word, pos);
                          if (word.startsWith(q)) { matchIdx = wIdx; break; }
                          pos = wIdx + word.length;
                        }
                      }
                      return (
                        <button key={item.name} type="button"
                          onClick={() => {
                            setShowDosageModal(item.name);
                            setDosageForm({ deliveryMethod: item.delivery_method === "Liposomal" ? "liposomal_delivery" : item.delivery_method === "Micellar" ? "micellar_delivery" : "standard_actives", dosage: "", unit: "mg", frequency: "", reason: "" });
                            setSuppSearchQuery("");
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-white/5 active:bg-white/10 border-b border-white/[0.03] last:border-0 transition-colors flex items-center justify-between gap-3">
                          <span className="text-sm text-white/90 flex-1">
                            {matchIdx >= 0 ? <>{name.slice(0, matchIdx)}<span className="text-teal-400 font-medium">{name.slice(matchIdx, matchIdx + q.length)}</span>{name.slice(matchIdx + q.length)}</> : name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 bg-teal-400/10 border border-teal-400/20 text-teal-400/60">{item.delivery_method}</span>
                        </button>
                      );
                    })}
                    {/* Manual add */}
                    <button type="button"
                      onClick={() => {
                        setShowDosageModal(suppSearchQuery.trim());
                        setDosageForm({ deliveryMethod: "", dosage: "", unit: "mg", frequency: "", reason: "" });
                        setSuppSearchQuery("");
                        setAiLookupResult(null); setAiLookupError("");
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-copper hover:bg-copper/5 transition-colors flex items-center gap-2 border-t border-white/10">
                      <Plus className="w-3.5 h-3.5" />
                      Add &quot;{suppSearchQuery.trim()}&quot; manually
                    </button>
                    {filtered.length < 3 && (
                      <button type="button"
                        onClick={async () => {
                          const qAi = suppSearchQuery.trim();
                          setAiLookupLoading(true); setAiLookupError(""); setAiLookupResult(null);
                          setSuppSearchQuery("");
                          try {
                            const res = await fetch("/api/ai/product-lookup", {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ query: qAi }),
                            });
                            const data = await res.json();
                            if (data.found && data.product) { setAiLookupResult(data.product); }
                            else { setAiLookupError(data.error || "Product not found"); }
                          } catch { setAiLookupError("Search failed. Try manual entry."); }
                          setAiLookupLoading(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-teal-400 hover:bg-teal-400/5 transition-colors flex items-center gap-2 border-t border-white/10">
                        <Sparkles className="w-3.5 h-3.5" />
                        Search all supplement brands with AI
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* "or" Divider + Photo Upload */}
              {!showDosageModal && !aiLookupResult && !aiLookupLoading && !photoAnalyzing && !userSupplements.some(s => s.name === "None") && (
                <>
                  <div className="flex items-center gap-4 my-4">
                    <div className="flex-grow h-px bg-white/10" />
                    <span className="text-xs text-white/25 font-medium uppercase tracking-wider">or</span>
                    <div className="flex-grow h-px bg-white/10" />
                  </div>
                  <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center mb-3">
                    <div className="w-12 h-12 rounded-full bg-teal-400/10 flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-6 h-6 text-teal-400" />
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1">Add a photo of your product</h3>
                    <p className="text-xs text-white/40 mb-4">Take a picture of the front label or Supplement Facts panel</p>

                    {/* Photo previews */}
                    {productPhotos.length > 0 && (
                      <div className="flex gap-3 justify-center mb-4">
                        {productPhotos.map((photo, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={URL.createObjectURL(photo)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setProductPhotos(productPhotos.filter((_, idx) => idx !== i))}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                              <X className="w-2.5 h-2.5 text-white" />
                            </button>
                          </div>
                        ))}
                        {productPhotos.length < 3 && (
                          <label className="w-16 h-16 rounded-lg border border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-white/20">
                            <Plus className="w-4 h-4 text-white/30" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              if (e.target.files?.[0]) setProductPhotos([...productPhotos, e.target.files[0]]);
                            }} />
                          </label>
                        )}
                      </div>
                    )}

                    {productPhotos.length === 0 ? (
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <label className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-teal-400/10 border border-teal-400/30 text-teal-400 text-sm font-medium cursor-pointer hover:bg-teal-400/15 transition-all">
                          <Camera className="w-4 h-4" /> Take Photo
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                            if (e.target.files?.[0]) setProductPhotos([e.target.files[0]]);
                          }} />
                        </label>
                        <label className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium cursor-pointer hover:border-white/20 transition-all">
                          <FolderOpen className="w-4 h-4" /> Upload File
                          <input type="file" accept="image/jpeg,image/png,image/heic,image/webp" multiple className="hidden" onChange={(e) => {
                            if (e.target.files) setProductPhotos([...productPhotos, ...Array.from(e.target.files)].slice(0, 3));
                          }} />
                        </label>
                      </div>
                    ) : (
                      <button type="button" disabled={photoAnalyzing}
                        onClick={async () => {
                          setPhotoAnalyzing(true); setAiLookupError(""); setAiLookupResult(null);
                          try {
                            const formData = new FormData();
                            productPhotos.forEach((p) => formData.append("photos", p));
                            const res = await fetch("/api/ai/identify-product-photo", { method: "POST", body: formData });
                            const data = await res.json();
                            if (data.found && data.product) { setAiLookupResult(data.product); }
                            else { setAiLookupError(data.error || "Could not identify product from photo"); }
                          } catch { setAiLookupError("Photo analysis failed. Try searching by name."); }
                          setPhotoAnalyzing(false); setProductPhotos([]);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-teal-400/15 border border-teal-400/40 text-teal-400 font-medium text-sm hover:bg-teal-400/20 transition-all flex items-center gap-2 mx-auto">
                        <Sparkles className="w-4 h-4" /> Identify This Product
                      </button>
                    )}
                    <p className="text-[10px] text-white/20 mt-3">Tip: Include the Supplement Facts panel for best results</p>
                  </div>
                </>
              )}

              {/* Photo Analyzing State */}
              {photoAnalyzing && (
                <div className="rounded-xl border border-teal-400/10 bg-teal-400/[0.03] p-6 flex flex-col items-center gap-3 mb-3">
                  <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-teal-400">Analyzing your product photo...</p>
                  <p className="text-xs text-white/30">Reading label, identifying ingredients, and verifying amounts</p>
                </div>
              )}

              {/* AI Lookup Loading */}
              {aiLookupLoading && (
                <div className="rounded-xl border border-teal-400/10 bg-teal-400/[0.03] p-6 flex flex-col items-center gap-3 mb-3">
                  <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-teal-400">Searching for product details...</p>
                  <p className="text-xs text-white/30">Finding supplement facts, ingredients, and daily dose</p>
                </div>
              )}

              {/* AI Lookup Error — fallback to manual */}
              {aiLookupError && !aiLookupLoading && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 mb-3">
                  <p className="text-sm text-white/60 mb-3">{aiLookupError}</p>
                  <button type="button" onClick={() => { setAiLookupError(""); setShowDosageModal("External Supplement"); setDosageForm({ deliveryMethod: "", dosage: "", unit: "mg", frequency: "", reason: "" }); }}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-sm hover:border-white/20">Enter Manually Instead</button>
                </div>
              )}

              {/* AI Lookup Result Card */}
              {aiLookupResult && !aiLookupLoading && !aiEditMode && (
                <div className="rounded-xl border border-teal-400/20 bg-white/[0.03] overflow-hidden mb-3">
                  {/* Header */}
                  <div className="p-5 border-b border-white/5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-white">{aiLookupResult.fullName}</h3>
                        <p className="text-xs text-white/40 mt-0.5">by {aiLookupResult.brand}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-orange-400/10 border border-orange-400/20 text-orange-400 flex-shrink-0">External</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-teal-400/10 text-teal-400 font-medium">Recommended</span>
                      <span className="text-sm text-white/70">{aiLookupResult.recommendedDose}</span>
                    </div>
                    {aiLookupResult.confidence < 0.8 && (
                      <p className="mt-2 text-xs text-yellow-400/70 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" /> Some amounts may need verification
                      </p>
                    )}
                  </div>
                  {/* Ingredients */}
                  <div className="p-5">
                    <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-3">Supplement Facts · Per {aiLookupResult.servingSize}</p>
                    <div className="space-y-1">
                      {aiLookupResult.ingredients?.map((ing: { name: string; amount: number; unit: string; dailyValuePercent?: number | null; category?: string }, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                          <span className="text-sm text-white/80">{ing.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-white/90">{ing.amount} {ing.unit}</span>
                            {ing.dailyValuePercent && <span className="text-xs text-white/30 w-12 text-right">{ing.dailyValuePercent}% DV</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {aiLookupResult.otherIngredients?.length > 0 && (
                      <p className="mt-4 pt-3 border-t border-white/5 text-xs text-white/25">Other: {aiLookupResult.otherIngredients.join(", ")}</p>
                    )}
                    {aiLookupResult.allergenWarnings?.length > 0 && (
                      <p className="mt-2 text-xs text-yellow-400/70 flex items-center gap-1.5"><Info className="w-3 h-3" /> {aiLookupResult.allergenWarnings.join(", ")}</p>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="p-5 pt-0 flex gap-3">
                    <button type="button" onClick={() => {
                      setUserSupplements([...userSupplements, {
                        name: aiLookupResult.fullName, brand: aiLookupResult.brand, source: "ai_search",
                        deliveryMethod: "standard_actives", dosage: "1", unit: aiLookupResult.servingSize?.includes("capsule") ? "capsule" : "serving",
                        frequency: aiLookupResult.recommendedFrequency || "once_daily", reason: "",
                        ingredientBreakdown: aiLookupResult.ingredients,
                      }]);
                      setAiLookupResult(null);
                    }} className="flex-1 py-3 rounded-xl bg-teal-400/15 border border-teal-400/40 text-teal-400 font-medium text-sm hover:bg-teal-400/20 transition-all flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Add All Ingredients
                    </button>
                    <button type="button" onClick={() => setAiEditMode(true)}
                      className="py-3 px-5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:border-white/20 transition-all">Edit</button>
                    <button type="button" onClick={() => setAiLookupResult(null)}
                      className="py-3 px-5 rounded-xl bg-white/5 border border-white/10 text-white/30 text-sm hover:text-white/50 transition-all">Cancel</button>
                  </div>
                </div>
              )}

              {/* AI Edit Mode */}
              {aiLookupResult && aiEditMode && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3 mb-3">
                  <h4 className="text-sm font-medium text-white/70">Edit Ingredients — {aiLookupResult.fullName}</h4>
                  {aiLookupResult.ingredients?.map((ing: { name: string; amount: number; unit: string }, idx: number) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input value={ing.name} onChange={(e) => {
                        const updated = [...aiLookupResult.ingredients];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setAiLookupResult({ ...aiLookupResult, ingredients: updated });
                      }} className="col-span-6 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white" />
                      <input type="number" value={ing.amount} onChange={(e) => {
                        const updated = [...aiLookupResult.ingredients];
                        updated[idx] = { ...updated[idx], amount: Number(e.target.value) };
                        setAiLookupResult({ ...aiLookupResult, ingredients: updated });
                      }} className="col-span-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white text-center" />
                      <span className="col-span-2 text-xs text-white/40 text-center">{ing.unit}</span>
                      <button type="button" onClick={() => {
                        const updated = aiLookupResult.ingredients.filter((_: unknown, i: number) => i !== idx);
                        setAiLookupResult({ ...aiLookupResult, ingredients: updated });
                      }} className="col-span-1 flex justify-center"><X className="w-3.5 h-3.5 text-red-400/50 hover:text-red-400" /></button>
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => {
                      setUserSupplements([...userSupplements, {
                        name: aiLookupResult.fullName, brand: aiLookupResult.brand, source: "ai_search",
                        deliveryMethod: "standard_actives", dosage: "1", unit: "serving",
                        frequency: aiLookupResult.recommendedFrequency || "once_daily", reason: "",
                        ingredientBreakdown: aiLookupResult.ingredients,
                      }]);
                      setAiLookupResult(null); setAiEditMode(false);
                    }} className="flex-1 py-2.5 rounded-xl bg-teal-400/15 border border-teal-400/40 text-teal-400 text-sm font-medium">Save &amp; Add</button>
                    <button type="button" onClick={() => setAiEditMode(false)}
                      className="py-2.5 px-5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm">Back</button>
                  </div>
                </div>
              )}

              {/* Supplement Entry Form (shown after selecting a supplement) */}
              {showDosageModal && (() => {
                const isComplete = dosageForm.deliveryMethod && dosageForm.dosage && Number(dosageForm.dosage) > 0 && dosageForm.frequency;
                return (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-5 mb-3">
                    <div>
                      <p className="text-xs text-white/30 mb-1">Selected Supplement</p>
                      <h3 className="text-lg font-medium text-white">{showDosageModal}</h3>
                    </div>

                    {/* Delivery Method + Dosage (side by side on desktop) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Delivery Method Dropdown */}
                      <div>
                        <label className="text-xs text-white/40 mb-1.5 block">Delivery Method <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <select value={dosageForm.deliveryMethod}
                            onChange={(e) => setDosageForm({ ...dosageForm, deliveryMethod: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none transition-all [&>option]:bg-[#1E2D4A] [&>option]:text-white text-sm"
                            required>
                            <option value="" disabled>Select method...</option>
                            <option value="standard_actives">Standard Actives</option>
                            <option value="liposomal_delivery">Liposomal Delivery</option>
                            <option value="micellar_delivery">Micellar Delivery</option>
                            <option value="methylated_vitamins">Methylated Vitamins</option>
                            <option value="minerals_cofactors">Minerals &amp; Cofactors</option>
                            <option value="amino_acids">Amino Acids</option>
                            <option value="peptides">Peptides</option>
                            <option value="plant_extracts_botanicals">Plant Extracts &amp; Botanicals</option>
                            <option value="enzymes_probiotics">Enzymes &amp; Probiotics</option>
                            <option value="specialty_compounds">Specialty Compounds</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                        </div>
                        {!dosageForm.deliveryMethod && <p className="text-xs text-white/20 mt-1">Required for protocol accuracy</p>}
                      </div>

                      {/* Dosage Amount + Unit */}
                      <div>
                        <label className="text-xs text-white/40 mb-1.5 block">Dosage <span className="text-red-400">*</span></label>
                        <div className="flex gap-2">
                          <input type="number" value={dosageForm.dosage} placeholder="500" min={0} step="any"
                            onChange={(e) => setDosageForm({ ...dosageForm, dosage: e.target.value })}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none transition-all text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            required />
                          <select value={dosageForm.unit} onChange={(e) => setDosageForm({ ...dosageForm, unit: e.target.value })}
                            className="w-20 px-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center appearance-none cursor-pointer focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none transition-all text-sm [&>option]:bg-[#1E2D4A] [&>option]:text-white">
                            <option value="mg">mg</option><option value="mcg">mcg</option><option value="g">g</option>
                            <option value="IU">IU</option><option value="CFU">CFU</option><option value="ml">ml</option>
                          </select>
                        </div>
                        {!dosageForm.dosage && <p className="text-xs text-white/20 mt-1">Required for daily intake tracking</p>}
                      </div>
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="text-xs text-white/40 mb-2 block">How often? <span className="text-red-400">*</span></label>
                      <div className="flex flex-wrap gap-2">
                        {[{ v: "once_daily", l: "Once daily" }, { v: "twice_daily", l: "Twice daily" }, { v: "three_daily", l: "3x daily" }, { v: "weekly", l: "Weekly" }, { v: "as_needed", l: "As needed" }].map((freq) => (
                          <button key={freq.v} type="button" onClick={() => setDosageForm({ ...dosageForm, frequency: freq.v })}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              dosageForm.frequency === freq.v
                                ? "bg-teal-400/15 border border-teal-400/40 text-teal-400"
                                : "bg-white/5 border border-white/10 text-white/50 hover:border-white/20"
                            }`}>{freq.l}</button>
                        ))}
                      </div>
                    </div>

                    {/* Optional reason */}
                    <div>
                      <label className="text-xs text-white/30 mb-1.5 block">Why do you take this? <span className="text-white/15">(optional)</span></label>
                      <input type="text" value={dosageForm.reason} placeholder="e.g., for energy, doctor recommended, sleep support..."
                        onChange={(e) => setDosageForm({ ...dosageForm, reason: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white/70 placeholder:text-white/20 focus:border-teal-400/30 focus:ring-1 focus:ring-teal-400/20 focus:outline-none transition-all" />
                    </div>

                    {/* Add / Cancel */}
                    <div className="flex gap-3">
                      <button type="button" disabled={!isComplete}
                        onClick={() => {
                          const isFc = SEED_INGREDIENTS.some((ing) => ing.name === showDosageModal);
                          setUserSupplements([...userSupplements, {
                            name: showDosageModal, brand: isFc ? "FarmCeutica" : "External",
                            source: isFc ? "farmceutica" : "manual", deliveryMethod: dosageForm.deliveryMethod,
                            dosage: dosageForm.dosage, unit: dosageForm.unit, frequency: dosageForm.frequency, reason: dosageForm.reason,
                          }]);
                          setShowDosageModal(null);
                        }}
                        className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                          isComplete
                            ? "bg-teal-400/15 border border-teal-400/40 text-teal-400 hover:bg-teal-400/20 cursor-pointer"
                            : "bg-white/[0.02] border border-white/5 text-white/20 cursor-not-allowed"
                        }`}>
                        {isComplete ? "Add to My Supplements" : "Select delivery method and enter dosage to add"}
                      </button>
                      <button type="button" onClick={() => setShowDosageModal(null)}
                        className="py-3 px-6 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:text-white/70 transition-all">Cancel</button>
                    </div>
                  </div>
                );
              })()}

              {/* Added Supplements List */}
              {userSupplements.length > 0 && !userSupplements.some(s => s.name === "None") && (
                <div className="space-y-2 mt-3">
                  {userSupplements.map((supp, i) => {
                    const methodLabel = supp.deliveryMethod ? supp.deliveryMethod.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";
                    const hasBreakdown = supp.ingredientBreakdown && supp.ingredientBreakdown.length > 0;
                    return (
                      <div key={`${supp.name}-${i}`} className="rounded-lg border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between px-3 py-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white/90">{supp.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                supp.source === "farmceutica" ? "bg-teal-400/10 border-teal-400/20 text-teal-400"
                                : supp.source === "ai_search" ? "bg-purple-400/10 border-purple-400/20 text-purple-400"
                                : "bg-orange-400/10 border-orange-400/20 text-orange-400"
                              }`}>{supp.source === "farmceutica" ? "FC" : supp.source === "ai_search" ? "AI" : "Ext"}</span>
                            </div>
                            <p className="text-xs text-white/30 mt-0.5">
                              {supp.brand && `${supp.brand} · `}{methodLabel && `${methodLabel} · `}{supp.dosage}{supp.unit} · {supp.frequency.replace(/_/g, " ")}
                              {hasBreakdown && ` · ${supp.ingredientBreakdown!.length} ingredients`}
                            </p>
                          </div>
                          <button type="button" onClick={() => setUserSupplements(userSupplements.filter((_, idx) => idx !== i))}>
                            <X className="w-3.5 h-3.5 text-white/30 hover:text-white/70" />
                          </button>
                        </div>
                        {/* Expandable ingredient breakdown for AI-searched products */}
                        {hasBreakdown && (
                          <details className="border-t border-white/[0.03]">
                            <summary className="px-3 py-2 text-xs text-teal-400/60 cursor-pointer hover:text-teal-400/80">View ingredient breakdown</summary>
                            <div className="px-3 pb-3 space-y-0.5">
                              {supp.ingredientBreakdown!.map((ing, j) => (
                                <div key={j} className="flex justify-between text-xs">
                                  <span className="text-white/50">{ing.name}</span>
                                  <span className="text-white/40">{ing.amount} {ing.unit}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button type="button"
                onClick={() => setUserSupplements(userSupplements.some(s => s.name === "None") ? [] : [{ name: "None", brand: "", source: "manual", deliveryMethod: "", dosage: "", unit: "", frequency: "", reason: "" }])}
                className={`mt-3 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  userSupplements.some(s => s.name === "None")
                    ? "bg-portal-green/15 border-portal-green/30 text-portal-green"
                    : "bg-white/5 border-white/10 text-white/70 hover:border-white/20"
                }`}>
                I don&apos;t take any supplements
              </button>
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
                  <span key={a} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${a === "None" ? "bg-portal-green/15 text-portal-green border-portal-green/30" : "bg-rose/10 text-rose border-rose/20"}`}>
                    {a}
                    <button onClick={() => setMedications({ ...medications, allergies: medications.allergies.filter((x) => x !== a) })}>
                      <X className="w-3 h-3 text-gray-500 hover:text-white" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMedications({ ...medications, allergies: medications.allergies.includes("None") ? [] : ["None"] })}
                className={`mt-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  medications.allergies.includes("None")
                    ? "bg-portal-green/15 border-portal-green/30 text-portal-green"
                    : "bg-white/5 border-white/10 text-white/70 hover:border-white/20"
                }`}
              >
                No known allergies
              </button>
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

        {/* ── Phase 4b removed — supplements now in Phase 4 ── */}
        {false && (
          <div className="space-y-6">
            {/* AI quality badge */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-400/5 border border-teal-400/15 mb-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-400/10 flex items-center justify-center mt-0.5">
                <Brain className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-teal-400 font-medium">More supplements = smarter protocol</p>
                <p className="text-xs text-white/40 mt-0.5">Include everything you take regularly, even basic multivitamins from other brands. We&apos;ll identify gaps, redundancies, and upgrade opportunities.</p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                value={suppSearchQuery}
                onChange={(e) => {
                  setSuppSearchQuery(e.target.value);
                  const q = e.target.value.toLowerCase().trim();
                  if (q.length < 2) { setSuppSearchResults([]); return; }
                  const matches = SEED_INGREDIENTS.filter(
                    (ing) => ing.name.toLowerCase().includes(q) || ing.category.toLowerCase().includes(q)
                  ).slice(0, 10);
                  setSuppSearchResults(matches);
                }}
                placeholder="Search your current vitamins and minerals by brand or ingredient"
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none"
              />
            </div>

            {/* Category Quick Filters */}
            <div className="flex flex-wrap gap-2">
              {FARMCEUTICA_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSuppSearchQuery(cat);
                    setSuppSearchResults(SEED_INGREDIENTS.filter((ing) => ing.category === cat).slice(0, 10));
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:border-teal-400/30 hover:text-teal-400 transition-all"
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Results Dropdown */}
            {suppSearchQuery.length >= 2 && (
              <div className="rounded-xl bg-[#1E2D4A] border border-white/10 shadow-2xl max-h-64 overflow-y-auto">
                {suppSearchResults.map((ing) => (
                  <button
                    key={ing.name}
                    type="button"
                    onClick={() => {
                      setShowDosageModal(ing.name);
                      setDosageForm({ dosage: "", unit: "mg", frequency: "Once daily", reason: "" });
                      setSuppSearchQuery("");
                      setSuppSearchResults([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                  >
                    <span className="text-sm text-white/90">{ing.name}</span>
                    <span className="text-xs text-white/30 ml-2">{ing.category}</span>
                  </button>
                ))}
                {/* Add custom / not found */}
                {suppSearchQuery.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDosageModal(suppSearchQuery.trim());
                      setDosageForm({ dosage: "", unit: "mg", frequency: "Once daily", reason: "" });
                      setSuppSearchQuery("");
                      setSuppSearchResults([]);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-copper hover:bg-copper/5 transition-colors flex items-center gap-2 border-t border-white/10"
                  >
                    <Plus className="w-4 h-4" />
                    Add &quot;{suppSearchQuery.trim()}&quot; (external product)
                  </button>
                )}
              </div>
            )}

            {/* Dosage Entry Modal */}
            {showDosageModal && (
              <div className="rounded-xl bg-[#1E2D4A] border border-white/10 p-6 space-y-5">
                <h3 className="text-lg font-medium text-white">{showDosageModal}</h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-white/30 mb-1 block">Dosage</label>
                    <input type="number" placeholder="500" value={dosageForm.dosage}
                      onChange={(e) => setDosageForm({ ...dosageForm, dosage: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-teal-400/30 focus:outline-none" />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-white/30 mb-1 block">Unit</label>
                    <select value={dosageForm.unit}
                      onChange={(e) => setDosageForm({ ...dosageForm, unit: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-teal-400/30 focus:outline-none appearance-none">
                      <option value="mg">mg</option>
                      <option value="mcg">mcg</option>
                      <option value="IU">IU</option>
                      <option value="g">g</option>
                      <option value="CFU">CFU</option>
                      <option value="ml">ml</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/30 mb-2 block">How often?</label>
                  <div className="flex flex-wrap gap-2">
                    {["Once daily", "Twice daily", "3x daily", "Weekly", "As needed"].map((freq) => (
                      <button key={freq} type="button"
                        onClick={() => setDosageForm({ ...dosageForm, frequency: freq })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          dosageForm.frequency === freq
                            ? "bg-teal-400/15 border border-teal-400/30 text-teal-400"
                            : "bg-white/5 border border-white/10 text-white/60 hover:border-white/20"
                        }`}>
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/30 mb-1 block">Why do you take this? (optional)</label>
                  <input type="text" placeholder="e.g., for energy, doctor recommended..."
                    value={dosageForm.reason}
                    onChange={(e) => setDosageForm({ ...dosageForm, reason: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-teal-400/30 focus:outline-none" />
                </div>
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => {
                      const isFarmceutica = SEED_INGREDIENTS.some((ing) => ing.name === showDosageModal);
                      setUserSupplements([...userSupplements, {
                        name: showDosageModal,
                        brand: isFarmceutica ? "FarmCeutica" : "External",
                        source: isFarmceutica ? "farmceutica" : "manual",
                        dosage: dosageForm.dosage,
                        unit: dosageForm.unit,
                        frequency: dosageForm.frequency,
                        reason: dosageForm.reason,
                      }]);
                      setShowDosageModal(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-teal-400/10 border border-teal-400/30 text-teal-400 font-medium hover:bg-teal-400/15 transition-all">
                    Add to My Supplements
                  </button>
                  <button type="button" onClick={() => setShowDosageModal(null)}
                    className="py-3 px-6 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white/70 transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Current Supplement List */}
            {userSupplements.length > 0 && (
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-grow h-px bg-white/10" />
                  <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium">Your Supplements ({userSupplements.length})</span>
                  <div className="flex-grow h-px bg-white/10" />
                </div>
                <div className="space-y-2">
                  {userSupplements.map((supp, i) => (
                    <div key={`${supp.name}-${i}`} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-start justify-between hover:border-white/10 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white/90">{supp.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            supp.source === "farmceutica"
                              ? "bg-teal-400/10 border-teal-400/20 text-teal-400"
                              : "bg-orange-400/10 border-orange-400/20 text-orange-400"
                          }`}>
                            {supp.source === "farmceutica" ? "FC" : "External"}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 mt-0.5">
                          {supp.dosage && `${supp.dosage}${supp.unit}`} · {supp.frequency} · {supp.brand}
                          {supp.reason && ` · ${supp.reason}`}
                        </p>
                      </div>
                      <button type="button" onClick={() => setUserSupplements(userSupplements.filter((_, idx) => idx !== i))}
                        className="text-white/30 hover:text-white/70 transition-colors p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* None button */}
            <button
              type="button"
              onClick={() => setUserSupplements(userSupplements.some(s => s.name === "None") ? [] : [{ name: "None", brand: "", source: "manual", dosage: "", unit: "", frequency: "", reason: "" }])}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                userSupplements.some(s => s.name === "None")
                  ? "bg-portal-green/15 border-portal-green/30 text-portal-green"
                  : "bg-white/5 border-white/10 text-white/70 hover:border-white/20"
              }`}
            >
              I don&apos;t take any supplements
            </button>
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
                  Calculate Bio Optimization
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
    price: "0",
    billingCycle: "forever",
    features: [
      "Bio Optimization assessment",
      "Basic supplement recommendations",
      "Community access",
      "Educational content",
    ],
    cta: "Get Started Free",
    tier: "free" as const,
    popular: false,
  },
  {
    name: "Gold",
    price: "8.88",
    billingCycle: "month",
    features: [
      "Everything in Free",
      "Personalized protocol builder",
      "Monthly AI wellness check-in",
      "ViaTokens rewards (2x earn rate)",
      "Priority practitioner messaging",
      "Protocol adherence tracking",
    ],
    cta: "Start Gold Membership",
    tier: "gold" as const,
    popular: false,
  },
  {
    name: "Platinum",
    price: "28.88",
    billingCycle: "month",
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
    tier: "platinum" as const,
    popular: true,
  },
];

function OnboardingComplete() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("there");
  const [bioScore, setBioScore] = useState(0);
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

      // Load bio optimization score from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("bio_optimization_score")
        .eq("id", user.id)
        .single();
      if (profile?.bio_optimization_score) setBioScore(profile.bio_optimization_score);

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
    if (bioScore === 0) return;
    const duration = 2000;
    const start = Date.now();
    function tick() {
      const progress = Math.min((Date.now() - start) / duration, 1);
      setAnimatedScore(Math.round(bioScore * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [bioScore]);

  // Compute sub-scores from saved symptom data (1=bad, 10=good → scale to 0-100)
  function getHealthScore(symptomKey: string): number {
    const raw = savedSymptoms[symptomKey] ?? 5;
    return Math.round((raw / 10) * 100);
  }

  const scoreColor =
    bioScore >= 80 ? "#4ADE80" : bioScore >= 60 ? "#22D3EE" : bioScore >= 40 ? "#FBBF24" : "#F87171";
  const r = 80;
  const circ = 2 * Math.PI * r;
  const offset = circ - (animatedScore / 100) * circ;

  function handleSelectTier(tierName: string) {
    setSelectedTier(tierName);
    toast.success(`${tierName} membership selected!`, { duration: 3000 });
    setTimeout(() => {
      router.push("/onboarding/i-welcome");
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

      {/* Bio Optimization Gauge */}
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
            <span className="text-[10px] text-gray-500 mt-0.5">Bio Optimization</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mt-4">
        {MEMBERSHIP_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`relative flex flex-col rounded-2xl p-6 md:p-8 transition-all duration-300
              ${tier.tier === "gold"
                ? "border-2 border-copper/60 shadow-[0_0_24px_rgba(183,94,24,0.15)]"
                : tier.tier === "platinum"
                ? "border-2 border-teal/60 shadow-[0_0_32px_rgba(45,165,160,0.2)]"
                : "border border-white/[0.08]"
              }
              hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]`}
            style={{
              background: "rgba(26, 39, 68, 0.85)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            {/* Most Popular Badge */}
            {tier.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full
                  bg-gradient-to-r from-teal-400 to-teal-500 text-[#1A2744]
                  text-[10px] font-bold uppercase tracking-wider shadow-lg whitespace-nowrap">
                  <Star className="w-3 h-3" /> Most Popular
                </span>
              </div>
            )}

            {/* Tier Name + Price */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                {tier.tier === "gold" && <Crown className="w-4 h-4 text-copper-400" />}
                {tier.tier === "platinum" && <Crown className="w-4 h-4 text-teal-400" />}
                <h3 className="text-lg font-semibold text-white/70">{tier.name}</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-5xl font-bold text-white">${tier.price}</span>
                <span className="text-base text-white/50">/{tier.billingCycle}</span>
              </div>
            </div>

            {/* Feature List */}
            <ul className="flex-grow space-y-3 mb-8">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full
                    bg-gradient-to-br from-copper-400 to-copper-500
                    flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm md:text-base text-white/80 leading-snug">{f}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => handleSelectTier(tier.name)}
              disabled={selectedTier !== null}
              className={`mt-auto w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50
                ${tier.tier === "gold"
                  ? "bg-gradient-to-r from-[#B75E18] to-[#D4741F] text-white hover:shadow-lg hover:shadow-orange-500/25"
                  : tier.tier === "platinum"
                  ? "bg-gradient-to-r from-[#2DA5A0] to-[#38BDB6] text-white hover:shadow-lg hover:shadow-teal-500/25"
                  : "border border-white/20 text-white/80 hover:bg-white/5"
                }`}
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
          onClick={() => router.push("/onboarding/i-welcome")}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Skip for now &mdash; go to dashboard
        </button>
      </div>
    </div>
  );
}
