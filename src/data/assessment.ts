export interface VitalityDimension {
  label: string;
  score: number;
  maxScore: number;
}

export interface ConstitutionalAxis {
  axis: string;
  value: number;
  fullMark: number;
}

export interface BodyZone {
  id: string;
  label: string;
  status: "green" | "yellow" | "red";
  summary: string;
  details: string[];
  protocols: string[];
  supplements: string[];
  path: string;
}

export interface AssessmentRecord {
  id: string;
  date: string;
  overallScore: number;
  previousScore: number | null;
  notes: string;
  dimensions: VitalityDimension[];
}

export const constitutionalData: ConstitutionalAxis[] = [
  { axis: "Vata / Air", value: 78, fullMark: 100 },
  { axis: "Pitta / Fire", value: 65, fullMark: 100 },
  { axis: "Kapha / Earth", value: 32, fullMark: 100 },
  { axis: "Structural", value: 55, fullMark: 100 },
  { axis: "Functional", value: 72, fullMark: 100 },
  { axis: "Mental", value: 81, fullMark: 100 },
];

export const constitutionalType = "Vata-Pitta";

export const vitalityDimensions: VitalityDimension[] = [
  { label: "Energy", score: 7, maxScore: 10 },
  { label: "Sleep", score: 4, maxScore: 10 },
  { label: "Digestion", score: 7, maxScore: 10 },
  { label: "Immunity", score: 6, maxScore: 10 },
  { label: "Cognition", score: 7, maxScore: 10 },
  { label: "Mood", score: 5, maxScore: 10 },
  { label: "Pain", score: 3, maxScore: 10 },
  { label: "Skin/Hair", score: 6, maxScore: 10 },
  { label: "Hormonal", score: 5, maxScore: 10 },
  { label: "Cardiovascular", score: 8, maxScore: 10 },
];

export const overallVitality = 58;

export const bodyZones: BodyZone[] = [
  {
    id: "brain",
    label: "Brain / Neurological",
    status: "green",
    summary: "Cognitive function within optimal range. BDNF markers stable.",
    details: [
      "Montreal Cognitive Assessment: 28/30",
      "Sleep architecture: 22% deep sleep (adequate)",
      "HRV coherence score: 72 (good)",
      "No reported brain fog or concentration issues",
    ],
    protocols: ["Nootropic Support Protocol", "Circadian Rhythm Optimization"],
    supplements: ["Bacopa monnieri 300mg", "Lion's Mane 500mg", "Omega-3 DHA 1000mg"],
    path: "M145,45 C155,30 165,20 175,18 C185,16 195,18 200,22 C210,30 215,40 215,50 C215,60 210,72 200,78 C195,82 185,84 175,82 C165,80 155,75 148,65 C142,58 140,52 145,45 Z",
  },
  {
    id: "throat",
    label: "Thyroid / Throat",
    status: "green",
    summary: "Thyroid panel within normal limits. No palpable nodules.",
    details: [
      "TSH: 2.1 mIU/L (normal)",
      "Free T4: 1.2 ng/dL (normal)",
      "Free T3: 3.1 pg/mL (normal)",
      "No dysphagia reported",
    ],
    protocols: ["Thyroid Support Protocol"],
    supplements: ["Selenium 200mcg", "Zinc 15mg"],
    path: "M165,90 C170,85 180,83 190,85 C200,87 205,90 205,95 C205,100 200,105 190,107 C180,109 170,107 165,102 C162,98 162,94 165,90 Z",
  },
  {
    id: "heart",
    label: "Cardiovascular",
    status: "green",
    summary: "Resting HR 64 bpm, BP 118/72. Lipid panel favorable.",
    details: [
      "Resting heart rate: 64 bpm",
      "Blood pressure: 118/72 mmHg",
      "Total cholesterol: 185 mg/dL",
      "HDL: 62 mg/dL | LDL: 98 mg/dL",
      "hs-CRP: 0.8 mg/L (low risk)",
    ],
    protocols: ["Cardioprotective Protocol", "Endothelial Support"],
    supplements: ["CoQ10 200mg", "Hawthorn berry 450mg", "Magnesium glycinate 400mg"],
    path: "M160,115 C165,108 175,105 185,108 C195,111 202,118 205,128 C208,138 205,150 195,155 C188,158 182,155 178,148 C175,155 168,158 160,155 C150,150 147,138 150,128 C153,118 155,112 160,115 Z",
  },
  {
    id: "gi",
    label: "Gastrointestinal",
    status: "yellow",
    summary: "Mild dysbiosis noted. Intermittent bloating post-prandial. IgG food panel pending.",
    details: [
      "GI-MAP: Reduced Lactobacillus spp.",
      "Elevated zonulin: 78 ng/mL (borderline)",
      "Calprotectin: 45 µg/g (normal)",
      "Reported: bloating 3-4x/week, worse with gluten",
      "Stool consistency: Bristol 4-5 (variable)",
    ],
    protocols: ["5R Gut Restoration Protocol", "Elimination Diet Phase 1"],
    supplements: ["L-Glutamine 5g", "Saccharomyces boulardii", "Digestive enzymes with meals"],
    path: "M155,160 C160,155 175,152 190,155 C200,158 208,165 210,178 C212,195 210,215 205,230 C200,240 195,248 185,250 C175,252 168,248 162,240 C156,230 152,215 150,195 C148,178 150,165 155,160 Z",
  },
  {
    id: "liver",
    label: "Hepatic / Detoxification",
    status: "yellow",
    summary: "Phase II detox markers suboptimal. Mild elevation in GGT.",
    details: [
      "ALT: 28 U/L (normal)",
      "AST: 25 U/L (normal)",
      "GGT: 48 U/L (mildly elevated)",
      "Organic acids: Reduced glucuronidation markers",
      "Environmental toxin panel: Moderate organochlorine load",
    ],
    protocols: ["Hepatic Detoxification Protocol", "Phase II Upregulation"],
    supplements: ["Milk Thistle (Silymarin) 420mg", "NAC 600mg", "Calcium-D-glucarate 500mg"],
    path: "M120,155 C128,148 138,145 148,148 C155,150 158,156 155,165 C152,175 145,182 135,182 C125,182 118,175 116,165 C114,158 115,152 120,155 Z",
  },
  {
    id: "joints",
    label: "Musculoskeletal / Joints",
    status: "red",
    summary: "Chronic bilateral knee inflammation. Elevated ESR. Functional limitation reported.",
    details: [
      "ESR: 32 mm/hr (elevated)",
      "Anti-CCP: Negative",
      "Rheumatoid factor: Negative",
      "Bilateral knee crepitus on examination",
      "VAS pain score: 6/10 with activity",
      "Reduced ROM: Knee flexion 110° (norm 135°)",
    ],
    protocols: ["Anti-Inflammatory Joint Protocol", "Movement Restoration Program"],
    supplements: ["Turmeric (Curcumin) 1000mg", "Boswellia 400mg", "Type II Collagen 40mg", "MSM 3g"],
    path: "M148,340 C152,330 158,325 165,330 C170,335 172,345 170,360 C168,370 164,378 158,378 C152,378 148,370 146,360 C144,350 145,340 148,340 Z M195,340 C199,330 205,325 212,330 C217,335 219,345 217,360 C215,370 211,378 205,378 C199,378 195,370 193,360 C191,350 192,340 195,340 Z",
  },
  {
    id: "lungs",
    label: "Respiratory",
    status: "green",
    summary: "Pulmonary function within normal limits. No respiratory complaints.",
    details: [
      "FEV1: 95% predicted (normal)",
      "Peak flow: 480 L/min (good)",
      "SpO2: 98% at rest",
      "No wheezing, dyspnea, or chronic cough",
    ],
    protocols: ["Respiratory Wellness Maintenance"],
    supplements: ["NAC 600mg", "Quercetin 500mg"],
    path: "M130,115 C135,108 142,105 148,108 C152,110 155,118 155,128 C155,140 150,152 142,155 C135,158 128,152 125,140 C122,130 125,118 130,115 Z M210,115 C215,108 222,105 228,108 C232,110 235,118 235,128 C235,140 230,152 222,155 C215,158 208,152 205,140 C202,130 205,118 210,115 Z",
  },
];

export const assessmentHistory: AssessmentRecord[] = [
  {
    id: "a1",
    date: "2026-03-15",
    overallScore: 58,
    previousScore: 52,
    notes: "Follow-up after 8-week gut restoration protocol. Bloating frequency reduced. Joint pain persists.",
    dimensions: [
      { label: "Energy", score: 7, maxScore: 10 },
      { label: "Sleep", score: 4, maxScore: 10 },
      { label: "Digestion", score: 7, maxScore: 10 },
      { label: "Immunity", score: 6, maxScore: 10 },
      { label: "Cognition", score: 7, maxScore: 10 },
      { label: "Mood", score: 5, maxScore: 10 },
      { label: "Pain", score: 3, maxScore: 10 },
      { label: "Skin/Hair", score: 6, maxScore: 10 },
      { label: "Hormonal", score: 5, maxScore: 10 },
      { label: "Cardiovascular", score: 8, maxScore: 10 },
    ],
  },
  {
    id: "a2",
    date: "2026-01-18",
    overallScore: 52,
    previousScore: 48,
    notes: "Initial improvement noted. Sleep still fragmented. Began elimination diet. Introduced adaptogenic support.",
    dimensions: [
      { label: "Energy", score: 6, maxScore: 10 },
      { label: "Sleep", score: 3, maxScore: 10 },
      { label: "Digestion", score: 5, maxScore: 10 },
      { label: "Immunity", score: 6, maxScore: 10 },
      { label: "Cognition", score: 6, maxScore: 10 },
      { label: "Mood", score: 5, maxScore: 10 },
      { label: "Pain", score: 3, maxScore: 10 },
      { label: "Skin/Hair", score: 5, maxScore: 10 },
      { label: "Hormonal", score: 5, maxScore: 10 },
      { label: "Cardiovascular", score: 8, maxScore: 10 },
    ],
  },
  {
    id: "a3",
    date: "2025-11-22",
    overallScore: 48,
    previousScore: 45,
    notes: "Baseline comprehensive assessment. Identified primary concerns: gut dysbiosis, joint inflammation, sleep disruption. Ordered full lab panel.",
    dimensions: [
      { label: "Energy", score: 5, maxScore: 10 },
      { label: "Sleep", score: 3, maxScore: 10 },
      { label: "Digestion", score: 4, maxScore: 10 },
      { label: "Immunity", score: 5, maxScore: 10 },
      { label: "Cognition", score: 6, maxScore: 10 },
      { label: "Mood", score: 4, maxScore: 10 },
      { label: "Pain", score: 3, maxScore: 10 },
      { label: "Skin/Hair", score: 5, maxScore: 10 },
      { label: "Hormonal", score: 5, maxScore: 10 },
      { label: "Cardiovascular", score: 8, maxScore: 10 },
    ],
  },
  {
    id: "a4",
    date: "2025-09-10",
    overallScore: 45,
    previousScore: null,
    notes: "Intake assessment. Patient presents with chronic joint pain (2+ years), digestive complaints, fatigue. Family history of autoimmune conditions.",
    dimensions: [
      { label: "Energy", score: 4, maxScore: 10 },
      { label: "Sleep", score: 3, maxScore: 10 },
      { label: "Digestion", score: 4, maxScore: 10 },
      { label: "Immunity", score: 5, maxScore: 10 },
      { label: "Cognition", score: 5, maxScore: 10 },
      { label: "Mood", score: 4, maxScore: 10 },
      { label: "Pain", score: 2, maxScore: 10 },
      { label: "Skin/Hair", score: 5, maxScore: 10 },
      { label: "Hormonal", score: 5, maxScore: 10 },
      { label: "Cardiovascular", score: 8, maxScore: 10 },
    ],
  },
];
