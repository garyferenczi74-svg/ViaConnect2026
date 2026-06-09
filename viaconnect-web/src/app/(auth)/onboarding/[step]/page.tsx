"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TIER_FEATURES } from "@/lib/pricing/tier-features";
import type { TierId } from "@/types/pricing";
import { ArrowLeft, ArrowRight, Loader2, Plus, X, Sparkles, Zap, Brain, Moon, Flame, Heart, CheckCircle2, Crown, Star, Calendar, ChevronDown, Info, Camera, FolderOpen, SkipForward, BrainCircuit, RefreshCw, Users } from "lucide-react";
import { ProgressMotivator } from "@/components/caq/ProgressMotivator";
import { VoiceInput } from "@/components/caq/VoiceInput";
import { CalmingHelixBackground } from "@/components/caq/CalmingHelixBackground";
import { BodyTypeSelector } from "@/components/caq/BodyTypeSelector";
import { shouldShowBodyTypeSelector } from "@/lib/caq/body-type-trigger";
import { completeCAQAndTriggerEngines } from "@/lib/caq/complete-caq";
import { fetchPreviousCAQ } from "@/lib/caq/fetchPreviousCAQ";
import SupplementPhotoUpload from "@/components/caq/phase6/SupplementPhotoUpload";
import { CONVERSATIONAL_LABELS } from "@/config/caq-conversational-labels";
import { SMART_PLACEHOLDERS, DEFAULT_PLACEHOLDER } from "@/config/caq-smart-placeholders";
import toast from "react-hot-toast";
import { InterstitialScreen } from "@/components/onboarding/InterstitialScreen";
import { WelcomeDashboardScreen } from "@/components/onboarding/WelcomeDashboardScreen";
import { CAQ_INTERSTITIALS } from "@/config/caq-interstitials";
import {
  CAQ_FORM_PHASE_IDS,
  CAQ_QUICK_FORM_PHASE_IDS,
  isLastFormPhase,
  type CaqPath,
} from "@/config/caq-phase-order";
import { WeightGoalsSection } from "@/components/caq/WeightGoalsSection";
import { DietaryChoiceSelector } from "@/components/caq/DietaryChoiceSelector";
import { CaqPathChoiceScreen } from "@/components/caq/CaqPathChoiceScreen";
import { writeWeightGoal } from "@/lib/weight-goals/accessor";
import { kgToLbs } from "@/lib/weight-goals/guardrails";
import { resolveCaqGoalDriver } from "@/lib/body-goals/pace";
import type { PacePreset } from "@/lib/body-goals/types";
import { readCaqPath, writeCaqPath } from "@/lib/caq/path";
import type { DietaryChoice } from "@/lib/gordon/macro-config";
import { SEED_INGREDIENTS, FARMCEUTICA_CATEGORIES, normalizeIngredientName } from "@/config/farmceutica-ingredients";
import { searchBrandsAndProducts } from "@/config/brand-search-index";
import BrandProductSearch from "@/components/caq/phase6/BrandProductSearch";
import { PEPTIDE_REGISTRY, searchPeptides } from "@/config/peptide-database/registry";
import { InteractionBanner } from "@/components/interactions/InteractionBanner";
import { emitDataEvent } from "@/lib/ai/emit-event";
import { enqueueBOSCompute } from "@/lib/scoring/queue";
import {
  genSupplementId,
  transitionPendingTo,
  markRowPending,
  type SupplementSaveState,
} from "@/lib/caq/supplement-save-state";

// ─── Phase Definitions ──────────────────────────────────────────────────────
// Interstitial steps use "i-<id>" as their step ID. caqIndex references the
// CAQ_INTERSTITIALS array position. Prompt 173 reorder (2026-06-03): the form
// phase order now follows CAQ_FORM_PHASE_IDS in caq-phase-order.ts. Lifestyle
// (id "3") sits immediately after Demographics (id "1") at experienced
// position 2; Medications, Supplements, and Allergies (id "4") is the last
// form phase and fires completion via isLastFormPhase(). Stable phase ids
// preserved so in-flight sessions on /onboarding/<id> resume correctly.

const PHASES = [
  { id: "i-caq-intro", title: "", description: "", caqIndex: 0 },
  // Prompt 173c 2.1: Quick vs Complete path choice. Sits between the Phase 1
  // interstitial (i-caq-intro) and the Demographics form so the user picks
  // before investing in the full flow. Not a form phase + no caqIndex; the
  // page renders CaqPathChoiceScreen for this step id.
  { id: "caq-path-choice", title: "", description: "" },
  { id: "1", title: "Demographics & Biodata", description: "Basic measurements and biological information" },
  { id: "i-caq-lifestyle", title: "", description: "", caqIndex: 1 },
  { id: "3", title: "Lifestyle & Goals", description: "Daily habits, routines, and wellness goals" },
  { id: "i-caq-concerns", title: "", description: "", caqIndex: 2 },
  { id: "1b", title: "Health Concerns & Family History", description: "What you're experiencing and what runs in your family" },
  { id: "i-caq-physical", title: "", description: "", caqIndex: 3 },
  { id: "2a", title: "How Your Body Feels", description: "Rate the severity of each physical symptom you're currently experiencing" },
  { id: "i-caq-neuro", title: "", description: "", caqIndex: 4 },
  { id: "2b", title: "Your Mind & Nervous System", description: "Rate how these cognitive and neurological symptoms affect your daily life" },
  { id: "i-caq-emotional", title: "", description: "", caqIndex: 5 },
  { id: "2c", title: "Mood, Immunity & Hormones", description: "Rate how these emotional and systemic symptoms are affecting you" },
  { id: "i-caq-medications", title: "", description: "", caqIndex: 6 },
  { id: "4", title: "Medications, Supplements & Allergies", description: "Current medications, supplements, and known allergies" },
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
  { value: "hypotension", label: "Low Blood Pressure" },
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
  // Prompt 173 Phase 3: canonical goal weight in kilograms (null when not
  // set). Lives in the goals slice so it persists with the Lifestyle phase
  // draft and survives a round trip back to Demographics. Persisted to
  // public.user_weight_goals via writeWeightGoal on Lifestyle save.
  goalWeightKg: number | null;
  // Prompt 179a: onboarding pace preset + optional target date (yyyy-mm-dd).
  goalPace: PacePreset;
  goalTargetDate: string | null;
  // Prompt 173a Phase 8 follow up (2026-06-04): user dietary choice. Drives
  // the per diet fat + carbohydrate split in the Gordon macro engine. Null
  // when the user has not picked; the engine defaults to balanced and the
  // recompute records the effective value on nutrition_targets.dietary_choice.
  dietaryChoice: DietaryChoice | null;
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

// Prompt 173c 2.3: step ids hidden in the Quick path (the symptom phases
// 1b/2a/2b/2c and their preceding interstitials). Derived from
// CAQ_FORM_PHASE_IDS minus CAQ_QUICK_FORM_PHASE_IDS plus the i-caq-* ids
// that bind to those phases per the 173b semantic-binding rule.
const QUICK_HIDDEN_STEP_IDS = new Set<string>([
  "i-caq-concerns", "1b",
  "i-caq-physical", "2a",
  "i-caq-neuro", "2b",
  "i-caq-emotional", "2c",
]);

// 173c-aware navigation helpers. The path filter applies only when the
// user picked Quick; Complete experiences the full PHASES array.
function getNextStepIdx(startIdx: number, path: CaqPath | null): number {
  let i = startIdx + 1;
  if (path !== 'quick') return i;
  while (i < PHASES.length && QUICK_HIDDEN_STEP_IDS.has(PHASES[i].id)) {
    i += 1;
  }
  return i;
}

function getPrevFormPhaseIdx(currentIdx: number, path: CaqPath | null): number {
  for (let i = currentIdx - 1; i >= 0; i--) {
    const id = PHASES[i].id;
    if (id.startsWith("i-")) continue;
    if (id === "caq-path-choice") continue;
    if (path === 'quick' && QUICK_HIDDEN_STEP_IDS.has(id)) continue;
    return i;
  }
  return -1;
}

export default function OnboardingStepPage() {
  const params = useParams();
  const router = useRouter();
  const stepId = params.step as string;
  const currentIndex = PHASES.findIndex((s) => s.id === stepId);
  const phase = PHASES[currentIndex];

  const [isLoading, setIsLoading] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  // Prompt 177k (2026-06-07): generation-failure state. When the BOS
  // polling exhausts attempts or any of the fired engines hard fail,
  // we switch the interstitial into an error mode that surfaces a
  // Retry action instead of spinning forever.
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationAttempt, setGenerationAttempt] = useState(0);

  // Prompt 173c 2.5: selected CAQ path. Loaded from caq_paths on mount,
  // with a localStorage mirror so unauthenticated mid-flow reloads keep
  // the choice. Null until the user picks; navigation treats null as
  // 'complete' so the existing full-flow defaults stay intact.
  const [caqPath, setCaqPath] = useState<CaqPath | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window !== "undefined") {
          const cached = window.localStorage.getItem("caq.path");
          if (cached === 'quick' || cached === 'complete') {
            if (!cancelled) setCaqPath(cached);
          }
        }
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const record = await readCaqPath(user.id, supabase);
        if (!cancelled && record) setCaqPath(record.path);
      } catch { /* missing column or signed out: leave caqPath null */ }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handlePickPath(picked: CaqPath) {
    setCaqPath(picked);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem("caq.path", picked); } catch { /* fine */ }
    }
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await writeCaqPath({ userId: user.id, path: picked }, supabase);
    } catch { /* persistence is best-effort; localStorage is the floor */ }
    router.push("/onboarding/1");
  }

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
  // Prompt 177i: raw lbs display string for the Weight input, mirroring
  // heightFt/heightIn. demographics.weight stays canonical kg; this holds
  // exactly what the user types so keystrokes never round trip through kg.
  const [weightLbs, setWeightLbs] = useState("");
  const [bodyType, setBodyType] = useState<string | null>(null);

  // Phase 1b state, Health Concerns & Family History
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

  // Phase 4b state, Current Supplements (ViaConnect search + AI product lookup)
  type UserSupplementBreakdown = { name: string; amount: number; unit: string; category?: string; dailyValuePercent?: number | null };
  type UserSupplement = {
    _id?: string;
    name: string;
    brand: string;
    source: string;
    deliveryMethod: string;
    dosage: string;
    unit: string;
    frequency: string;
    reason: string;
    ingredientBreakdown?: UserSupplementBreakdown[];
    // Prompt 175h Section 2.5 (2026-06-05): Hannah timing fields kept
    // alongside each row so /api/caq/supplements save can persist them
    // to user_current_supplements.time_of_day + with_food +
    // timing_reason + timing_source.
    timeOfDay?: ReadonlyArray<'morning' | 'afternoon' | 'evening'>;
    withFood?: boolean;
    timingReason?: string | null;
    timingSource?: 'hannah_recommended' | 'user_set';
  };
  const [userSupplements, setUserSupplements] = useState<UserSupplement[]>([]);
  const [supplementSaveState, setSupplementSaveState] = useState<Record<string, SupplementSaveState>>({});
  const supplementSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suppSearchQuery, setSuppSearchQuery] = useState("");
  const [suppSearchResults, setSuppSearchResults] = useState<{ name: string; search_name: string; category: string; delivery_method: string }[]>([]);
  // Live database search results (2,189 products from 20+ brands)
  const [liveDbResults, setLiveDbResults] = useState<{ result_type: string; brand_name: string; product_name: string; product_category: string; match_score: number }[]>([]);
  const [showDosageModal, setShowDosageModal] = useState<string | null>(null);
  const [dosageForm, setDosageForm] = useState({ deliveryMethod: "", dosage: "", unit: "mg", frequency: "", reason: "" });
  // Prompt 175m (2026-06-05): barcode tier removed from CAQ. State + UI
  // gone. Photo capture + search remain the supported entry points.
  // AI product lookup state
  const [aiLookupLoading, setAiLookupLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aiLookupResult, setAiLookupResult] = useState<any>(null);
  const [aiLookupError, setAiLookupError] = useState("");
  const [aiEditMode, setAiEditMode] = useState(false);
  // Photo upload state
  const [productPhotos, setProductPhotos] = useState<File[]>([]);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);

  // Live database search, debounced query to Supabase (2,189 products)
  useEffect(() => {
    if (suppSearchQuery.trim().length < 2) { setLiveDbResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.rpc('search_supplements', {
          search_query: suppSearchQuery.trim().toLowerCase(),
          result_limit: 8,
        });
        setLiveDbResults((data || []).map((r: Record<string, unknown>) => ({
          result_type: r.result_type as string,
          brand_name: r.brand_name as string,
          product_name: r.product_name as string,
          product_category: (r.product_category as string) || 'Supplement',
          match_score: r.match_score as number,
        })));
      } catch { setLiveDbResults([]); }
    }, 250);
    return () => clearTimeout(timer);
  }, [suppSearchQuery]);

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
    goalWeightKg: null,
    goalPace: "steady",
    goalTargetDate: null,
    dietaryChoice: null,
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
  const [isRetake, setIsRetake] = useState(false);
  const [retakeLoaded, setRetakeLoaded] = useState(false);

  // Load previous CAQ data for retake pre-population
  useEffect(() => {
    if (retakeLoaded) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      // Load user name for Phase 1
      if (user.user_metadata?.full_name && !demographics.name) {
        setDemographics((prev) => ({ ...prev, name: user.user_metadata.full_name }));
      }
      // Prompt 173 fix (2026-06-04): hydrate Phase 1 demographics from the
      // in-progress assessment_results row REGARDLESS of whether the user
      // has completed a prior CAQ. First-time users who save Phase 1 then
      // advance to Phase 2 need the Weight Goals subsection to see their
      // current weight; without this hydration the section reads "Add
      // your current weight on the Demographics step" because React state
      // may not survive a navigation or reload between phases.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: p1Row } = await (supabase as any)
          .from("assessment_results")
          .select("data")
          .eq("user_id", user.id)
          .eq("phase", 1)
          .maybeSingle();
        const d1 = (p1Row?.data ?? {}) as Record<string, unknown>;
        if (Object.keys(d1).length > 0) {
          setDemographics((p) => ({
            ...p,
            ...(d1.name ? { name: String(d1.name) } : {}),
            ...(d1.dob ? { dob: String(d1.dob) } : {}),
            ...(d1.age ? { age: String(d1.age) } : {}),
            ...(d1.sex ? { sex: String(d1.sex) } : {}),
            ...(d1.height ? { height: String(d1.height) } : {}),
            ...(d1.weight ? { weight: String(d1.weight) } : {}),
            ...(d1.ethnicity ? { ethnicity: d1.ethnicity as string[] } : {}),
            ...(d1.bloodType ? { bloodType: String(d1.bloodType) } : {}),
          }));
          // Mirror the height ft/in derivation from the retake path so the
          // imperial input renders correctly when the user returns to
          // Phase 1.
          if (d1.height) {
            const cm = parseFloat(String(d1.height));
            if (cm > 0) {
              const totalIn = cm / 2.54;
              setHeightFt(String(Math.floor(totalIn / 12)));
              setHeightIn(String(Math.round(totalIn % 12)));
            }
          }
          // Mirror the height hydration for weight so the default lbs input
          // shows the saved value (canonical is kg) on return to Phase 1.
          if (d1.weight) {
            const kg = parseFloat(String(d1.weight));
            if (kg > 0) setWeightLbs(String(Math.round(kg * 2.20462)));
          }
          if (d1.bodyType) setBodyType(String(d1.bodyType));
        }
      } catch { /* silent: assessment_results may be empty for brand-new users */ }

      // Check if user has completed CAQ before
      const { data: profile } = await supabase.from("profiles").select("assessment_completed").eq("id", user.id).single();
      if (profile?.assessment_completed) {
        setIsRetake(true);
        try {
          const prev = await fetchPreviousCAQ(user.id);
          if (prev) {
            // Pre-populate demographics
            const d = prev.demographics as Record<string, string | string[]>;
            if (d.name || d.dob || d.sex) {
              setDemographics((p) => ({ ...p, ...(d.name ? { name: String(d.name) } : {}), ...(d.dob ? { dob: String(d.dob) } : {}), ...(d.age ? { age: String(d.age) } : {}), ...(d.sex ? { sex: String(d.sex) } : {}), ...(d.height ? { height: String(d.height) } : {}), ...(d.weight ? { weight: String(d.weight) } : {}), ...(d.ethnicity ? { ethnicity: d.ethnicity as string[] } : {}), ...(d.bloodType ? { bloodType: String(d.bloodType) } : {}) }));
            }
            // Hydrate heightFt/heightIn from stored cm value
            if (d.height) {
              const cm = parseFloat(String(d.height));
              if (cm > 0) {
                const totalIn = cm / 2.54;
                setHeightFt(String(Math.floor(totalIn / 12)));
                setHeightIn(String(Math.round(totalIn % 12)));
              }
            }
            // Hydrate weightLbs from stored kg value (default unit is lbs)
            if (d.weight) {
              const kg = parseFloat(String(d.weight));
              if (kg > 0) setWeightLbs(String(Math.round(kg * 2.20462)));
            }
            // Hydrate body type
            if (d.bodyType) {
              setBodyType(String(d.bodyType));
            }
            // Pre-populate health concerns
            const hc = prev.healthConcerns as { healthConcerns?: string[]; familyHistory?: { condition: string; relationships: string[] }[] };
            if (hc.healthConcerns?.length) setHealthConcerns(hc.healthConcerns);
            if (hc.familyHistory?.length) setFamilyHistory(hc.familyHistory);
            // Pre-populate symptoms
            const mapSymptoms = (data: Record<string, unknown>, defaults: SymptomPhaseData): SymptomPhaseData => {
              const result = { ...defaults };
              for (const [key, val] of Object.entries(data)) {
                if (val && typeof val === "object" && "score" in (val as Record<string, unknown>)) {
                  result[key] = val as { score: number; description: string };
                }
              }
              return result;
            };
            if (Object.keys(prev.physicalSymptoms).length > 0) setSymptomsPhysical((p) => mapSymptoms(prev.physicalSymptoms, p));
            if (Object.keys(prev.neuroSymptoms).length > 0) setSymptomsNeuro((p) => mapSymptoms(prev.neuroSymptoms, p));
            if (Object.keys(prev.emotionalSymptoms).length > 0) setSymptomsEmotional((p) => mapSymptoms(prev.emotionalSymptoms, p));
            // Pre-populate lifestyle
            const ls = prev.lifestyle as Record<string, string>;
            if (ls.diet || ls.exercise || ls.sleepHours) {
              setLifestyle((p) => ({ ...p, ...(ls.diet ? { diet: ls.diet } : {}), ...(ls.exercise ? { exercise: ls.exercise } : {}), ...(ls.sleepHours ? { sleepHours: ls.sleepHours } : {}), ...(ls.stressLevel ? { stressLevel: ls.stressLevel } : {}), ...(ls.alcohol ? { alcohol: ls.alcohol } : {}), ...(ls.smoking ? { smoking: ls.smoking } : {}), ...(ls.caffeine ? { caffeine: ls.caffeine } : {}), ...(ls.waterIntake ? { waterIntake: ls.waterIntake } : {}), ...(ls.screenTime ? { screenTime: ls.screenTime } : {}), ...(ls.sunExposure ? { sunExposure: ls.sunExposure } : {}) }));
            }
            // Pre-populate goals
            const goals_arr = (ls as Record<string, unknown>).goals as string[] | undefined;
            if (goals_arr?.length) setGoals((p) => ({ ...p, goals: goals_arr }));
            // Prompt 173 Phase 3: pre-populate goalWeightKg from the
            // Lifestyle draft so a Demographics round trip preserves the
            // entered value. Canonical source is user_weight_goals; a
            // Phase 7 hook will reconcile this with Body Tracker writes.
            const gwk = (ls as Record<string, unknown>).goalWeightKg;
            if (typeof gwk === 'number' && Number.isFinite(gwk) && gwk > 0) {
              setGoals((p) => ({ ...p, goalWeightKg: gwk }));
            }
            // Prompt 179a: rehydrate pace + target date from the prior save.
            const gp = (ls as Record<string, unknown>).goalPace;
            if (gp === 'gentle' || gp === 'steady' || gp === 'ambitious' || gp === 'custom_date') {
              setGoals((p) => ({ ...p, goalPace: gp }));
            }
            const gtd = (ls as Record<string, unknown>).goalTargetDate;
            if (typeof gtd === 'string' && gtd) {
              setGoals((p) => ({ ...p, goalTargetDate: gtd }));
            }
            // Prompt 173a Phase 8 follow up: rehydrate dietary choice from
            // the prior Lifestyle save so the selector reflects the user
            // picked value on resume.
            const dc = (ls as Record<string, unknown>).dietaryChoice;
            if (
              dc === 'balanced' || dc === 'mediterranean' || dc === 'low_carb' ||
              dc === 'keto' || dc === 'higher_carb' || dc === 'plant_based'
            ) {
              setGoals((p) => ({ ...p, dietaryChoice: dc as DietaryChoice }));
            }
          }
        } catch (err) { }
      }
      setRetakeLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Prompt 173 §3.2: completion trigger keys off the canonical phase order,
  // not a hardcoded id. After the 173b reorder this is "4"
  // (Medications, Supplements, and Allergies); reordering CAQ_FORM_PHASE_IDS
  // moves the trigger automatically.
  const isLast = isLastFormPhase(stepId, CAQ_FORM_PHASE_IDS);
  // For "Back" navigation, skip interstitials. 173c also skips the path
  // choice and any phase hidden by the Quick path filter.
  const prevFormIndex = getPrevFormPhaseIdx(currentIndex, caqPath);
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

  // Per-row save state machinery for CAQ Phase 4 supplements (Prompt #39 §7.3.4).
  // Adds are optimistic in local state and debounced to a single savePhase("4")
  // write 800 ms after the last add. Each row tracks pending / saved / failed
  // so the user gets a visible "Saved" checkmark or a retry button.
  async function emitSupplementAddedEvent(name: string, brand: string, source: string) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await emitDataEvent(user.id, "supplement_added", { name, brand, source });
    } catch { /* fire and forget */ }
  }

  // Ref carries latest medications + userSupplements into the debounced save
  // closure. Without this the 800 ms timeout would capture stale state from the
  // render that scheduled it and the just-added supplement would be dropped.
  const phase4DataRef = useRef<{ medications: MedicationsData; userSupplements: UserSupplement[] }>({ medications, userSupplements });
  useEffect(() => {
    phase4DataRef.current = { medications, userSupplements };
  }, [medications, userSupplements]);

  const runSupplementSave = useCallback(async () => {
    const { medications: medsSnapshot, userSupplements: suppsSnapshot } = phase4DataRef.current;
    try {
      await savePhase("4", { ...medsSnapshot, userSupplements: suppsSnapshot });
      setSupplementSaveState((prev) => transitionPendingTo(prev, "saved"));
    } catch {
      setSupplementSaveState((prev) => transitionPendingTo(prev, "failed"));
      toast.error("Could not save your supplement. Tap retry on the row.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleSupplementSave = useCallback(() => {
    if (supplementSaveTimeoutRef.current) clearTimeout(supplementSaveTimeoutRef.current);
    supplementSaveTimeoutRef.current = setTimeout(() => {
      void runSupplementSave();
    }, 800);
  }, [runSupplementSave]);

  function commitSupplement(supp: Omit<UserSupplement, "_id">) {
    const _id = genSupplementId();
    const newSupp: UserSupplement = { ...supp, _id };
    setUserSupplements((prev) => [...prev, newSupp]);
    setSupplementSaveState((prev) => ({ ...prev, [_id]: "pending" }));
    const label = `${supp.brand ? supp.brand + " " : ""}${supp.name}`.trim();
    toast.success(`${label} added!`);
    void emitSupplementAddedEvent(supp.name, supp.brand, supp.source);
    scheduleSupplementSave();
  }

  function retrySupplementSave(id: string) {
    setSupplementSaveState((prev) => markRowPending(prev, id));
    scheduleSupplementSave();
  }

  // Cleanup pending debounced save on unmount.
  useEffect(() => () => {
    if (supplementSaveTimeoutRef.current) clearTimeout(supplementSaveTimeoutRef.current);
  }, []);

  // Handle next / complete
  const handleNext = useCallback(async () => {
    setIsLoading(true);
    try {
      // Save current phase. Prompt 173 reorder: Lifestyle ("3") now sits at
      // position 2 and saves + navigates forward normally; Medications ("4")
      // is the last form phase and fires the completion + compute chain.
      switch (stepId) {
        case "1": await savePhase("1", { ...demographics, bodyType }); break;
        case "3": {
          await savePhase("3", { ...lifestyle, goals: goals.goals, supplementForm: goals.supplementForm, budgetRange: goals.budgetRange, goalWeightKg: goals.goalWeightKg, goalPace: goals.goalPace, goalTargetDate: goals.goalTargetDate, dietaryChoice: goals.dietaryChoice });
          // Prompt 179a: the CAQ goal write funnels through body_goals (the
          // single write authority), which projects goal weight + direction
          // into user_weight_goals so the macro engine read path is unchanged
          // and a goal-driven daily target exists from onboarding. Best-effort:
          // on any request failure we fall back to the legacy direct
          // user_weight_goals write so the engine is never left without a goal.
          // The DB trigger still owns goal_direction.
          try {
            const cw = parseFloat(demographics.weight); // kg
            const gw = goals.goalWeightKg; // kg
            if (Number.isFinite(cw) && cw > 0 && gw !== null && Number.isFinite(gw) && gw > 0) {
              const currentWeightLb = kgToLbs(cw);
              const goalWeightLb = kgToLbs(gw);
              const drv = resolveCaqGoalDriver({ currentWeightLb, goalWeightLb, pace: goals.goalPace, targetDate: goals.goalTargetDate });
              let posted = false;
              try {
                const res = await fetch("/api/body/goals", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    origin: "caq",
                    driver: drv.driver,
                    goalWeightLb,
                    startWeightLb: currentWeightLb,
                    targetRateLbPerWeek: drv.targetRateLbPerWeek ?? undefined,
                    targetDate: drv.targetDate ?? undefined,
                    targetPacePreset: drv.pacePreset,
                  }),
                });
                posted = res.ok;
              } catch { posted = false; }
              if (!posted) {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await writeWeightGoal(
                    { userId: user.id, currentWeightKg: cw, goalWeightKg: gw, source: "caq" },
                    supabase,
                  );
                }
              }
            }
          } catch { /* persistence is best-effort; the CAQ proceeds */ }
          break;
        }
        case "1b": await savePhase("6", { healthConcerns, familyHistory }); break;
        case "2a": await savePhase("7", symptomsPhysical); break;
        case "2b": await savePhase("8", symptomsNeuro); break;
        case "2c": await savePhase("9", symptomsEmotional); break;
        case "4": {
          await savePhase("4", { ...medications, userSupplements });

          // Show Ultrathink processing animation immediately. The
          // animation now masks Hannah's compute window; the auto
          // navigate useEffect below polls /api/bos/current and routes
          // to the dashboard once the canonical score lands.
          setGenerationError(null);
          setShowProcessing(true);

          // Path Z (Phase F): the API now returns 202 Accepted and
          // enqueues the canonical compute. We fire the request to
          // trigger the worker plus the fire and forget computeBOS,
          // then rely on the polling useEffect to redirect once the
          // canonical score lands in bio_optimization_history.
          //
          // Prompt 177k (2026-06-07): 10s AbortController on the
          // calculate-bio-optimization fetch. The route returns 202
          // and enqueues; anything past 10s is a hung connection,
          // not a slow compute, and the polling loop catches the
          // canonical-score arrival independently.
          try {
            const calcCtrl = new AbortController();
            const calcTid = setTimeout(() => calcCtrl.abort(), 10_000);
            try {
              await fetch("/api/ai/calculate-bio-optimization", {
                method: "POST",
                signal: calcCtrl.signal,
              });
            } finally {
              clearTimeout(calcTid);
            }
          } catch {
            // Network failure here is non fatal: the polling loop will
            // attempt to read /api/bos/current and either find a row
            // (worker may have processed an earlier enqueue) or hit
            // the timeout fallback message. We additionally enqueue
            // a compute event directly via the browser client below
            // so the worker is guaranteed a row to drain.
            try {
              const supabase = createClient();
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await enqueueBOSCompute({
                  userId: user.id,
                  source: "caq_completed",
                  bypass_cooldown: true,
                  payload: { fallback: "browser_enqueue_after_api_failure" },
                  supabase,
                });
              }
            } catch {
              // Even the direct enqueue can fail offline. The polling
              // loop's timeout fallback message will surface and the
              // user can continue manually.
            }
          }

          // ═══ Fire ALL downstream AI engines ═══
          try {
            const triggerResult = await completeCAQAndTriggerEngines();
            if (triggerResult.errors.length > 0) {
            }
          } catch (err) {
          }

          // ═══ Generate Supplement Recommendations ═══
          // Prompt 177k (2026-06-07): 15s AbortController. Protocol
          // generation is optional; failure is fail-open per the
          // resilience contract and onboarding does not block on it.
          try {
            const recCtrl = new AbortController();
            const recTid = setTimeout(() => recCtrl.abort(), 15_000);
            try {
              const res = await fetch("/api/recommendations/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
                signal: recCtrl.signal,
              });
              if (res.ok) {
                const data = await res.json();
                toast.success(`${data.recommendations_count} supplements recommended for you!`, { duration: 4000 });
              }
            } finally {
              clearTimeout(recTid);
            }
          } catch { /* protocol generation optional */ }

          return;
        }
      }
      // Navigate to next phase (form or interstitial)
      router.push(`/onboarding/${PHASES[getNextStepIdx(currentIndex, caqPath)].id}`);
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

  // Path Z polling: poll /api/bos/current every 5s until score is
  // non null (worker has drained the queue and the canonical compute
  // has landed in bio_optimization_history). Max 36 attempts (3 min);
  // on timeout the generationError state flips so the interstitial
  // shows a Retry action instead of routing forward silently.
  //
  // Prompt 177k (2026-06-07): polling now races against a per-attempt
  // 8s timeout via AbortController so a hung /api/bos/current call
  // cannot block the loop. On total timeout the spinner is replaced
  // with the failure card (Retry kicks generationAttempt which
  // re-runs this effect).
  useEffect(() => {
    if (!showProcessing) return;
    if (generationError) return;
    const MAX_ATTEMPTS = 36;
    const INTERVAL_MS = 5000;
    const PER_ATTEMPT_TIMEOUT_MS = 8000;
    let attempts = 0;
    let cancelled = false;

    async function pollOnce(): Promise<void> {
      if (cancelled) return;
      attempts += 1;
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), PER_ATTEMPT_TIMEOUT_MS);
      try {
        const res = await fetch("/api/bos/current", { cache: "no-store", signal: ctrl.signal });
        if (res.ok) {
          const data = await res.json();
          const score: number | null = data?.score ?? null;
          if (typeof score === "number" && score > 0) {
            if (!cancelled) router.push("/dashboard");
            return;
          }
        }
      } catch {
        // Single poll failure is tolerable; the loop will retry until
        // MAX_ATTEMPTS or the score lands.
      } finally {
        clearTimeout(tid);
      }
      if (attempts >= MAX_ATTEMPTS) {
        if (!cancelled) {
          // Prompt 177k (2026-06-07): surface a Retry instead of
          // silently routing forward. The baseline protocol the user
          // already has can stand in until the AI enrichment lands;
          // routing forward without telling them masks the failure.
          setGenerationError(
            "Generating your blueprint is taking longer than expected. Please try again or continue with your baseline protocol.",
          );
        }
        return;
      }
      setTimeout(pollOnce, INTERVAL_MS);
    }

    setTimeout(pollOnce, INTERVAL_MS);
    return () => { cancelled = true; };
  }, [showProcessing, generationError, generationAttempt, router]);

  // Render Ultrathink processing animation (after last CAQ phase).
  // Prompt 177k (2026-06-07): when generationError is set the
  // interstitial flips to a failure card with Retry and Continue
  // actions instead of spinning indefinitely.
  if (showProcessing) {
    if (generationError) {
      const continueForward = () => {
        router.push(`/onboarding/${PHASES[getNextStepIdx(currentIndex, caqPath)].id}`);
      };
      const retry = () => {
        setGenerationError(null);
        setGenerationAttempt((n) => n + 1);
      };
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <Info className="h-10 w-10 text-amber-300" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="mt-6 text-lg font-semibold text-white">Generation is taking longer than expected</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/65">
            {generationError}
          </p>
          <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
            <button
              type="button"
              onClick={retry}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-400/50 bg-teal-400/10 px-4 py-2.5 text-sm font-medium text-teal-100 transition-colors hover:bg-teal-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
              Retry
            </button>
            <button
              type="button"
              onClick={continueForward}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              Continue with baseline
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          <p className="mt-6 max-w-md text-[11px] leading-relaxed text-white/45">
            Your CAQ answers are saved. The AI enrichment will backfill in the background; you can check your dashboard anytime.
          </p>
        </div>
      );
    }
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
        onContinue={() => router.push(`/onboarding/${PHASES[getNextStepIdx(currentIndex, caqPath)].id}`)}
        celebrationMode={stepId === "i-caq-complete"}
      />
    );
  }

  // Prompt 173c 2.1: Quick vs Complete choice screen. Sits between the
  // Phase 1 interstitial and the Demographics form so the user picks the
  // path before investing in the full flow.
  if (stepId === "caq-path-choice") {
    return <CaqPathChoiceScreen onPick={handlePickPath} />;
  }

  // Form phases only (exclude interstitials, the path-choice step, the
  // "complete" celebration, and any phase hidden by the Quick path filter).
  // 173c 2.3: the progress bar denominator derives from the SELECTED path
  // so Quick reads as Step X of 3 + Complete reads as Phase X of 7.
  const formPhases = PHASES.filter((s) => {
    if (s.id.startsWith("i-")) return false;
    if (s.id === "complete") return false;
    if (s.id === "caq-path-choice") return false;
    if (caqPath === "quick" && QUICK_HIDDEN_STEP_IDS.has(s.id)) return false;
    return true;
  });
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
          stepId={stepId}
          partialData={{
            symptomsPhysical: symptomsPhysical,
            symptomsNeurological: symptomsNeuro,
            symptomsEmotional: symptomsEmotional,
            medications: medications.medications.map(m => ({ name: m })),
          }}
        />
      )}

      <div className={`glass rounded-2xl ${stepId === "complete" ? "p-6 lg:p-8" : "p-6 lg:p-8"}`}>
        {/* Retake banner */}
        {isRetake && stepId !== "complete" && !stepId.startsWith("i-") && (
          <div className="flex items-start gap-3 px-4 py-3 mb-4 bg-teal-400/5 border border-teal-400/15 rounded-xl">
            <RefreshCw className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-xs text-teal-400/70 leading-relaxed">Your previous answers are loaded. Update anything that&apos;s changed.</p>
          </div>
        )}

        {/* Phase header (hidden on complete page, it has its own).
            173c 2.3: Quick path reads as "Step X of 3" with a follow-on
            line noting more phases are available; Complete keeps the
            "Phase X of 7" label from 173b. */}
        {stepId !== "complete" && (
          <div className="mb-6">
            <p className="text-xs text-copper font-semibold uppercase tracking-wider">
              {caqPath === "quick" ? "Step" : "Phase"} {currentFormIndex + 1} of {formPhases.length}
            </p>
            <h2 className="text-xl font-bold text-white mt-1">{phase.title}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{phase.description}</p>
            {caqPath === "quick" ? (
              <p className="mt-1 text-[11px] text-white/45">
                {CAQ_FORM_PHASE_IDS.length - CAQ_QUICK_FORM_PHASE_IDS.length} more phases available for a complete protocol.
              </p>
            ) : null}
          </div>
        )}

        {/* ── Phase 1: Demographics (Health Profile) ── */}
        {stepId === "1" && (
          <div className="space-y-5">
            {/* Full Name, read-only, pre-populated from signup */}
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

            {/* Date of Birth, Month / Day / Year dropdowns */}
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
              {/* Biological Sex, pill selector */}
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

              {/* Ethnicity, multi-select dropdown */}
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
                    <button type="button" onClick={() => { setWeightUnit("lbs"); setWeightLbs(demographics.weight ? String(Math.round(parseFloat(demographics.weight) * 2.20462)) : ""); }} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${weightUnit === "lbs" ? "bg-copper/20 text-copper" : "text-gray-500"}`}>lbs</button>
                    <button type="button" onClick={() => setWeightUnit("kg")} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${weightUnit === "kg" ? "bg-copper/20 text-copper" : "text-gray-500"}`}>kg</button>
                  </div>
                </div>
                {weightUnit === "kg" ? (
                  <input type="number" value={demographics.weight} onChange={(e) => setDemographics({ ...demographics, weight: e.target.value })} className={inputClass} placeholder="70" />
                ) : (
                  <div className="relative">
                    <input type="number" value={weightLbs} onChange={(e) => { setWeightLbs(e.target.value); const lbs = parseFloat(e.target.value); setDemographics({ ...demographics, weight: Number.isFinite(lbs) && lbs > 0 ? String(Math.round((lbs / 2.20462) * 10) / 10) : "" }); }} className={inputClass} placeholder="154" />
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

            {/* Body Type Selector, always visible on Phase 1 */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <BodyTypeSelector value={bodyType} onChange={setBodyType} />
            </div>

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
                            <span className="text-[10px] text-teal-400/40 font-medium">Hannah is absorbing your insight</span>
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

            {/* Divider, Goals */}
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

            {/* Prompt 173 Phase 3: Weight Goals sub-section.
                Lives inside the Wellness Goals block. Reads the Phase 1
                current weight + height read-only and writes goal_weight_kg
                into goals state; persistence to user_weight_goals fires on
                Lifestyle save via writeWeightGoal (the DB trigger then
                owns the derived goal_direction). */}
            <WeightGoalsSection
              currentWeightKgRaw={demographics.weight}
              heightCmRaw={demographics.height}
              weightUnit={weightUnit}
              goalWeightKg={goals.goalWeightKg}
              onGoalWeightKgChange={(kg) => setGoals({ ...goals, goalWeightKg: kg })}
              pace={goals.goalPace}
              onPaceChange={(p) => setGoals({ ...goals, goalPace: p })}
              targetDate={goals.goalTargetDate}
              onTargetDateChange={(d) => setGoals({ ...goals, goalTargetDate: d })}
              onEditDemographics={async () => {
                // Persist the in-progress Lifestyle draft so the round trip
                // back to Demographics does not lose state, then navigate.
                try {
                  await savePhase("3", {
                    ...lifestyle,
                    goals: goals.goals,
                    supplementForm: goals.supplementForm,
                    budgetRange: goals.budgetRange,
                    goalWeightKg: goals.goalWeightKg,
                    goalPace: goals.goalPace,
                    goalTargetDate: goals.goalTargetDate,
                    dietaryChoice: goals.dietaryChoice,
                  });
                } catch { /* navigation proceeds even if save fails */ }
                router.push("/onboarding/1");
              }}
            />

            {/* Prompt 173a Phase 8 follow up (2026-06-04): dietary choice
                selector. Drives the per diet fat + carbohydrate split in
                the Gordon macro engine. Saved with phase 3 payload; the
                next /api/nutrition/generate-targets recompute picks it up
                and records the effective value on the targets row. */}
            <DietaryChoiceSelector
              value={goals.dietaryChoice}
              onChange={(choice) => setGoals({ ...goals, dietaryChoice: choice })}
            />

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

            {/* Supplements, FarmCeutica Search */}
            <div>
              <label className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                What You Are Currently Taking
                {userSupplements.length > 0 && !userSupplements.some((s) => s.name === "None") && (
                  <motion.span
                    key={userSupplements.length}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="text-xs px-2 py-0.5 rounded-full bg-teal-400/15 border border-teal-400/30 text-teal-400 font-medium"
                    aria-label={`${userSupplements.length} supplements added`}
                  >
                    {userSupplements.length}
                  </motion.span>
                )}
              </label>
              <p className="text-sm text-white/40 mb-3">Add every supplement, vitamin, and mineral you take regularly</p>

              {/* Brand + Product Search, powered by 2,472 products from 113 brands in Supabase */}
              {!showDosageModal && !userSupplements.some(s => s.name === "None") && (
                <div className="mb-3">
                  <BrandProductSearch
                    darkMode={true}
                    onProductSelect={(product) => {
                      setShowDosageModal(product.product_name);
                      setDosageForm({
                        deliveryMethod: product.delivery_method || "standard_actives",
                        dosage: "", unit: "mg", frequency: "", reason: "",
                      });
                      setSuppSearchQuery("");
                    }}
                    onManualEntry={(searchText) => {
                      setShowDosageModal(searchText);
                      setDosageForm({ deliveryMethod: "", dosage: "", unit: "mg", frequency: "", reason: "" });
                      setSuppSearchQuery("");
                      setAiLookupResult(null); setAiLookupError("");
                    }}
                    placeholder="Search vitamins, minerals, supplements and peptides by brand or ingredient"
                  />
                </div>
              )}

              {/* Old inline search results removed, BrandProductSearch component handles all search UI */}

              {/* Prompt 175m (2026-06-05): the Scan barcode action and
                  the SupplementBarcodeConfirm panel were removed from
                  CAQ Phase 6 per Gary. Photo capture + search remain
                  the supported entry points on this surface. */}

              {/* "or" Divider + Photo Upload Component */}
              {!showDosageModal && !aiLookupResult && !aiLookupLoading && !userSupplements.some(s => s.name === "None") && (
                <>
                  <div className="flex items-center gap-4 my-4">
                    <div className="flex-grow h-px bg-white/10" />
                    <span className="text-xs text-white/25 font-medium uppercase tracking-wider">or</span>
                    <div className="flex-grow h-px bg-white/10" />
                  </div>
                  <SupplementPhotoUpload
                    onProductAdded={(rec) => {
                      // Prompt 175h Section 2.3 + hotfix (2026-06-05):
                      // ingredientBreakdown sources from
                      // rec.structured_ingredients (user-edited via the
                      // + button in the confirm panel), not from the
                      // raw photo extraction. That way edits and added
                      // rows make it to user_current_supplements.
                      commitSupplement({
                        name: rec.name,
                        brand: rec.brand,
                        source: "photo_ai",
                        deliveryMethod: rec.deliveryMethod,
                        dosage: rec.dosage,
                        unit: rec.unit,
                        frequency: rec.frequency,
                        reason: rec.reason,
                        timeOfDay: rec.time_of_day,
                        withFood: rec.with_food,
                        timingReason: rec.timing_reason,
                        timingSource: rec.timing_source,
                        ingredientBreakdown: rec.structured_ingredients.map((ing) => ({
                          name: ing.name,
                          amount: ing.amount ?? 0,
                          unit: ing.unit || rec.unit,
                          category: rec.deliveryMethod || "standard_actives",
                        })),
                      });
                    }}
                    onLowConfidence={(suggestedName) => {
                      setShowDosageModal(suggestedName);
                      setDosageForm({ deliveryMethod: "", dosage: "", unit: "mg", frequency: "", reason: "" });
                      setAiLookupResult(null);
                      setAiLookupError("");
                    }}
                  />
                </>
              )}

              {/* Prompt 175m (2026-06-05): SupplementBarcodeOverlay mount
                  removed from CAQ Phase 6. */}

              {/* AI Lookup Loading */}
              {aiLookupLoading && (
                <div className="rounded-xl border border-teal-400/10 bg-teal-400/[0.03] p-6 flex flex-col items-center gap-3 mb-3">
                  <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-teal-400">Searching for product details...</p>
                  <p className="text-xs text-white/30">Finding supplement facts, ingredients, and daily dose</p>
                </div>
              )}

              {/* AI Lookup Error, fallback to manual */}
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
                      commitSupplement({
                        name: aiLookupResult.fullName, brand: aiLookupResult.brand, source: "ai_search",
                        deliveryMethod: "standard_actives", dosage: "1", unit: aiLookupResult.servingSize?.includes("capsule") ? "capsule" : "serving",
                        frequency: aiLookupResult.recommendedFrequency || "once_daily", reason: "",
                        ingredientBreakdown: aiLookupResult.ingredients,
                      });
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
                  <h4 className="text-sm font-medium text-white/70">Edit Ingredients, {aiLookupResult.fullName}</h4>
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
                      commitSupplement({
                        name: aiLookupResult.fullName, brand: aiLookupResult.brand, source: "ai_search",
                        deliveryMethod: "standard_actives", dosage: "1", unit: "serving",
                        frequency: aiLookupResult.recommendedFrequency || "once_daily", reason: "",
                        ingredientBreakdown: aiLookupResult.ingredients,
                      });
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
                          commitSupplement({
                            name: showDosageModal, brand: isFc ? "FarmCeutica" : "External",
                            source: isFc ? "farmceutica" : "manual", deliveryMethod: dosageForm.deliveryMethod,
                            dosage: dosageForm.dosage, unit: dosageForm.unit, frequency: dosageForm.frequency, reason: dosageForm.reason,
                          });
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
                  <AnimatePresence initial={false}>
                    {userSupplements.map((supp, i) => {
                      const methodLabel = supp.deliveryMethod ? supp.deliveryMethod.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";
                      const hasBreakdown = supp.ingredientBreakdown && supp.ingredientBreakdown.length > 0;
                      const rowKey = supp._id ?? `${supp.name}-${i}`;
                      const saveState = supp._id ? supplementSaveState[supp._id] : undefined;
                      return (
                        <motion.div
                          key={rowKey}
                          layout
                          initial={{ opacity: 0, y: -4, boxShadow: "0 0 0 2px rgba(45, 165, 160, 0.55)" }}
                          animate={{ opacity: 1, y: 0, boxShadow: "0 0 0 0px rgba(45, 165, 160, 0)" }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="rounded-lg border border-white/5 bg-white/[0.02]"
                        >
                          <div className="flex items-center justify-between px-3 py-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white/90">{supp.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                  supp.source === "farmceutica" ? "bg-teal-400/10 border-teal-400/20 text-teal-400"
                                  : supp.source === "ai_search" ? "bg-purple-400/10 border-purple-400/20 text-purple-400"
                                  : "bg-orange-400/10 border-orange-400/20 text-orange-400"
                                }`}>{supp.source === "farmceutica" ? "FC" : supp.source === "ai_search" ? "AI" : "Ext"}</span>
                                {saveState === "pending" && (
                                  <Loader2 strokeWidth={1.5} className="w-3.5 h-3.5 text-teal-400/70 animate-spin" aria-label="Saving" />
                                )}
                                {saveState === "saved" && (
                                  <CheckCircle2 strokeWidth={1.5} className="w-3.5 h-3.5 text-teal-400" aria-label="Saved" />
                                )}
                                {saveState === "failed" && supp._id && (
                                  <button
                                    type="button"
                                    onClick={() => retrySupplementSave(supp._id!)}
                                    className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-400/10 border border-red-400/30 text-red-400 hover:bg-red-400/20 transition-colors"
                                    aria-label="Retry save"
                                  >
                                    <RefreshCw strokeWidth={1.5} className="w-3 h-3" /> Retry
                                  </button>
                                )}
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
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
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

        {/* ── Phase 4b removed, supplements now in Phase 4 ── */}
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
                placeholder="Search vitamins, minerals, supplements and peptides by brand or ingredient"
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
                      setDosageForm({ deliveryMethod: "", dosage: "", unit: "mg", frequency: "Once daily", reason: "" });
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
                      setDosageForm({ deliveryMethod: "", dosage: "", unit: "mg", frequency: "Once daily", reason: "" });
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
                        name: showDosageModal ?? "",
                        brand: isFarmceutica ? "FarmCeutica" : "External",
                        source: isFarmceutica ? "farmceutica" : "manual",
                        deliveryMethod: dosageForm.deliveryMethod ?? "",
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
              onClick={() => setUserSupplements(userSupplements.some(s => s.name === "None") ? [] : [{ name: "None", brand: "", source: "manual", deliveryMethod: "", dosage: "", unit: "", frequency: "", reason: "" }])}
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

// Prompt 177j: Choose Your Plan is driven off the membership_tiers table so a
// tier can never silently fall off the page again. Prices, names, and the tier
// set come from the table at render time; only the per-tier feature bullets
// live in the frontend (the table stores a single description, not a list).
interface PlanTierRow {
  id: string;
  display_name: string;
  monthly_price_cents: number;
  is_family_tier: boolean;
  base_adults_included: number;
  base_children_included: number;
  additional_adult_price_cents: number | null;
  additional_children_chunk_price_cents: number | null;
  children_chunk_size: number | null;
  sort_order: number;
}

// Degradation only: if the membership_tiers fetch fails or times out, the grid
// still renders all four tiers instead of an empty or broken plan grid. The
// table stays the source of truth; these values mirror the live rows.
const FALLBACK_TIERS: PlanTierRow[] = [
  { id: "free", display_name: "Free", monthly_price_cents: 0, is_family_tier: false, base_adults_included: 1, base_children_included: 0, additional_adult_price_cents: null, additional_children_chunk_price_cents: null, children_chunk_size: null, sort_order: 0 },
  { id: "gold", display_name: "Gold", monthly_price_cents: 888, is_family_tier: false, base_adults_included: 1, base_children_included: 0, additional_adult_price_cents: null, additional_children_chunk_price_cents: null, children_chunk_size: null, sort_order: 1 },
  { id: "platinum", display_name: "Platinum", monthly_price_cents: 2888, is_family_tier: false, base_adults_included: 1, base_children_included: 0, additional_adult_price_cents: null, additional_children_chunk_price_cents: null, children_chunk_size: null, sort_order: 2 },
  { id: "platinum_family", display_name: "Platinum+ Family", monthly_price_cents: 4888, is_family_tier: true, base_adults_included: 2, base_children_included: 2, additional_adult_price_cents: 888, additional_children_chunk_price_cents: 888, children_chunk_size: 2, sort_order: 3 },
];

function OnboardingComplete() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("there");
  const [bioScore, setBioScore] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [tiers, setTiers] = useState<PlanTierRow[] | null>(null);
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

      // Load saved symptom data from assessment_results phases 7/8/9
      const { data: phases } = await supabase
        .from("assessment_results")
        .select("phase, data")
        .eq("user_id", user.id)
        .in("phase", [7, 8, 9]);

      if (phases && phases.length > 0) {
        const phaseMap: Record<number, any> = {};
        for (const p of phases) phaseMap[p.phase] = p.data ?? {};

        const physical = phaseMap[7] ?? {};
        const neuro = phaseMap[8] ?? {};
        const emotional = phaseMap[9] ?? {};

        setSavedSymptoms({
          Energy: 10 - (physical.fatigue_severity?.score ?? 5),
          Sleep: 10 - (neuro.sleep_quality_severity?.score ?? 5),
          Stress: 10 - (emotional.stress_severity?.score ?? 5),
          Anxiety: 10 - (emotional.anxiety_severity?.score ?? 5),
          Digestion: 10 - (physical.digestive_severity?.score ?? 5),
          Cognition: 10 - (neuro.brain_fog_severity?.score ?? 5),
          Metabolic: 10 - (physical.metabolic_severity?.score ?? physical.weight_severity?.score ?? 5),
        } as SymptomsData);
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

  // Prompt 177j: load every active membership tier ordered by sort_order so the
  // Choose Your Plan grid renders all four tiers (including Platinum+ Family)
  // and any future active tier automatically. Hardened: timeout via
  // Promise.race, try/catch fail-open to the fallback set, structured logging,
  // and never an empty grid.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = createClient();
        const query = supabase
          .from("membership_tiers")
          .select("id, display_name, monthly_price_cents, is_family_tier, base_adults_included, base_children_included, additional_adult_price_cents, additional_children_chunk_price_cents, children_chunk_size, sort_order")
          .eq("is_active", true)
          .order("sort_order");
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("membership_tiers fetch timed out")), 5000),
        );
        const result = (await Promise.race([query, timeout])) as { data: PlanTierRow[] | null; error: unknown };
        if (result.error) throw result.error;
        const rows = (result.data ?? []).filter((t) => t && t.id);
        if (mounted) setTiers(rows.length > 0 ? rows : FALLBACK_TIERS);
      } catch (err) {
        console.error("[onboarding:choose-plan] membership_tiers fetch failed, using fallback tiers", err);
        if (mounted) setTiers(FALLBACK_TIERS);
      }
    })();
    return () => { mounted = false; };
  }, []);

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

  function handleSelectTier(tier: PlanTierRow) {
    // Prompt 177j: the Platinum+ Family signup and checkout flow is not built
    // yet (no membership checkout route exists), so the family tier surfaces a
    // coming-soon state instead of routing into the supplement cart at
    // /checkout. The card still displays the plan and its pricing.
    if (tier.is_family_tier) {
      toast("Platinum+ Family plan is coming soon.", { duration: 3000 });
      return;
    }
    setSelectedTier(tier.id);
    toast.success(`${tier.display_name} membership selected!`, { duration: 3000 });
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

      {/* Membership Tiers, sourced from membership_tiers ordered by sort_order (Prompt 177j) */}
      {!tiers ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-copper animate-spin" />
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch mt-4">
        {tiers.map((tier) => {
          const isGold = tier.id === "gold";
          const isPlatinum = tier.id === "platinum";
          const isFamily = tier.is_family_tier;
          const isPopular = tier.id === "platinum";
          const priceStr = tier.monthly_price_cents === 0 ? "0" : (tier.monthly_price_cents / 100).toFixed(2);
          const cycleStr = tier.monthly_price_cents === 0 ? "forever" : "month";
          // Onboarding shows a condensed top 5 of the shared canonical list to
          // keep the post-CAQ plan cards compact; /pricing renders the full
          // list. Same source module, so the wording stays consistent.
          const features = (TIER_FEATURES[tier.id as TierId] ?? []).slice(0, 5);
          const ctaLabel = isFamily ? "Coming Soon" : tier.id === "free" ? "Get Started Free" : `Start ${tier.display_name} Membership`;
          const adultAddOn = ((tier.additional_adult_price_cents ?? 0) / 100).toFixed(2);
          const childAddOn = ((tier.additional_children_chunk_price_cents ?? 0) / 100).toFixed(2);
          return (
          <div
            key={tier.id}
            className={`relative flex flex-col rounded-2xl p-6 md:p-7 transition-all duration-300
              ${isGold
                ? "border-2 border-copper/60 shadow-[0_0_24px_rgba(183,94,24,0.15)]"
                : isPlatinum
                ? "border-2 border-teal/60 shadow-[0_0_32px_rgba(45,165,160,0.2)]"
                : isFamily
                ? "border-2 border-teal/40 shadow-[0_0_28px_rgba(45,165,160,0.16)]"
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
            {isPopular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full
                  bg-gradient-to-r from-teal-400 to-teal-500 text-[#1A2744]
                  text-[10px] font-bold uppercase tracking-wider shadow-lg whitespace-nowrap">
                  <Star className="w-3 h-3" /> Most Popular
                </span>
              </div>
            )}

            {/* Tier Name + Price */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                {isGold && <Crown className="w-4 h-4 text-copper-400" />}
                {isPlatinum && <Crown className="w-4 h-4 text-teal-400" />}
                {isFamily && <Users className="w-4 h-4 text-teal-400" strokeWidth={1.5} />}
                <h3 className="text-lg font-semibold text-white/70">{tier.display_name}</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-5xl font-bold text-white">${priceStr}</span>
                <span className="text-base text-white/50">/{cycleStr}</span>
              </div>
              {isFamily && (
                <p className="mt-2 text-xs text-white/60 leading-snug">
                  {tier.base_adults_included} adults and {tier.base_children_included} children included.{" "}
                  <span className="text-white/40">Add-ons available: additional adult ${adultAddOn}, additional {tier.children_chunk_size} children ${childAddOn}.</span>
                </p>
              )}
            </div>

            {/* Feature List */}
            <ul className="flex-grow space-y-2.5 mb-7">
              {features.map((f) => (
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
              onClick={() => handleSelectTier(tier)}
              disabled={selectedTier !== null}
              className={`mt-auto w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50
                ${isGold
                  ? "bg-gradient-to-r from-[#B75E18] to-[#D4741F] text-white hover:shadow-lg hover:shadow-orange-500/25"
                  : isPlatinum
                  ? "bg-gradient-to-r from-[#2DA5A0] to-[#38BDB6] text-white hover:shadow-lg hover:shadow-teal-500/25"
                  : isFamily
                  ? "border border-[#2DA5A0]/40 text-[#2DA5A0] hover:bg-[#2DA5A0]/10"
                  : "border border-white/20 text-white/80 hover:bg-white/5"
                }`}
            >
              {selectedTier === tier.id ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up...
                </span>
              ) : (
                ctaLabel
              )}
            </button>
          </div>
          );
        })}
      </div>
      )}

      {/* Skip */}
      <div className="text-center pb-4">
        <button
          onClick={() => router.push("/onboarding/i-welcome")}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Skip for now, go to dashboard
        </button>
      </div>
    </div>
  );
}
