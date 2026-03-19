import { PortalType } from "./types";

export interface OnboardingData {
  // Step 2: Account Type
  accountType: PortalType | "";

  // Step 3: Personal Info
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  biologicalSex: "male" | "female" | "other" | "";

  // Step 3 Practitioner/Naturopath extras
  licenseNumber: string;
  practiceName: string;
  specialty: string;

  // Step 4: Health Goals
  healthGoals: string[];
  primaryGoal: string;

  // Step 5: Health History
  conditions: string[];
  familyHistory: string[];
  medications: string[];

  // Step 6: Current Supplements
  currentSupplements: { name: string; dosage: string; duration: string }[];
  takingSupplements: boolean | null;

  // Step 7: Genetic Data
  geneticDataSource: "upload" | "order-kit" | "already-analyzed" | "skip" | "";
  geneticProvider: string;

  // Step 8: Lifestyle
  dietType: string;
  exerciseFrequency: string;
  sleepQuality: string;
  stressLevel: string;
  smokingStatus: string;
  alcoholUse: string;

  // Step 9: Allergies & Sensitivities
  foodAllergies: string[];
  supplementAllergies: string[];
  herbSensitivities: string[];
  otherAllergies: string;

  // Step 10: Consent & Privacy
  consentDataProcessing: boolean;
  consentGenomicAnalysis: boolean;
  consentResearchUse: boolean;
  consentHIPAA: boolean;
  agreeTerms: boolean;
}

export const initialOnboardingData: OnboardingData = {
  accountType: "",
  firstName: "",
  lastName: "",
  email: "",
  dateOfBirth: "",
  biologicalSex: "",
  licenseNumber: "",
  practiceName: "",
  specialty: "",
  healthGoals: [],
  primaryGoal: "",
  conditions: [],
  familyHistory: [],
  medications: [],
  currentSupplements: [],
  takingSupplements: null,
  geneticDataSource: "",
  geneticProvider: "",
  dietType: "",
  exerciseFrequency: "",
  sleepQuality: "",
  stressLevel: "",
  smokingStatus: "",
  alcoholUse: "",
  foodAllergies: [],
  supplementAllergies: [],
  herbSensitivities: [],
  otherAllergies: "",
  consentDataProcessing: false,
  consentGenomicAnalysis: false,
  consentResearchUse: false,
  consentHIPAA: false,
  agreeTerms: false,
};

export const ONBOARDING_STEPS = [
  { id: 1, title: "Welcome", description: "Get started with ViaConnect" },
  { id: 2, title: "Account Type", description: "Choose your portal" },
  { id: 3, title: "Personal Info", description: "Your details" },
  { id: 4, title: "Health Goals", description: "What you want to achieve" },
  { id: 5, title: "Health History", description: "Medical background" },
  { id: 6, title: "Current Supplements", description: "What you take now" },
  { id: 7, title: "Genetic Data", description: "Your DNA source" },
  { id: 8, title: "Lifestyle", description: "Daily habits" },
  { id: 9, title: "Allergies", description: "Safety screening" },
  { id: 10, title: "Consent", description: "Privacy & permissions" },
  { id: 11, title: "Review", description: "Verify your answers" },
  { id: 12, title: "Complete", description: "You're all set" },
] as const;

export const HEALTH_GOAL_OPTIONS = [
  "Optimize methylation pathways",
  "Improve energy & reduce fatigue",
  "Support cardiovascular health",
  "Enhance detoxification capacity",
  "Balance neurotransmitters & mood",
  "Improve gut health & absorption",
  "Reduce oxidative stress",
  "Support hormone metabolism",
  "Optimize vitamin D utilization",
  "Improve sleep quality",
  "Support immune function",
  "Cognitive performance & neuroprotection",
];

export const CONDITION_OPTIONS = [
  "MTHFR variant (diagnosed)",
  "Elevated homocysteine",
  "Hypothyroidism",
  "Cardiovascular disease",
  "Type 2 diabetes / insulin resistance",
  "Chronic fatigue syndrome",
  "Anxiety / depression",
  "Autoimmune condition",
  "Digestive disorders (IBS, SIBO)",
  "Histamine intolerance",
  "Hormone imbalance",
  "Chronic inflammation",
  "None of the above",
];

export const FAMILY_HISTORY_OPTIONS = [
  "Heart disease",
  "Cancer",
  "Alzheimer's / dementia",
  "Diabetes",
  "Autoimmune disease",
  "Mental health conditions",
  "Stroke",
  "Osteoporosis",
  "None known",
];

export const FOOD_ALLERGY_OPTIONS = [
  "Gluten / wheat",
  "Dairy / lactose",
  "Soy",
  "Eggs",
  "Tree nuts",
  "Shellfish",
  "Nightshades",
  "Corn",
  "None",
];

export const SUPPLEMENT_ALLERGY_OPTIONS = [
  "Gelatin capsules",
  "Magnesium stearate",
  "Titanium dioxide",
  "Soy-derived ingredients",
  "Fish oil / marine sources",
  "Yeast-derived B vitamins",
  "None",
];

export const HERB_SENSITIVITY_OPTIONS = [
  "Ashwagandha / nightshade herbs",
  "Valerian",
  "St. John's Wort",
  "Echinacea",
  "Ginkgo",
  "Turmeric / curcumin",
  "Milk thistle",
  "None",
];
