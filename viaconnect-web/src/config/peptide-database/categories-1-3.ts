// FarmCeutica Peptide Database — Categories 1-3
// Longevity & Core Bioregulator | Adrenal/HPA Axis & Stress | Mitochondrial/Energy
// 13 products, 52 SKUs (4 delivery forms each)

export interface PeptideDosingForm {
  form: "liposomal" | "micellar" | "injectable" | "nasal_spray";
  protocol: string;
}

export interface PeptidePerformanceMetric {
  metric: string;
  value: string;
}

export interface PeptideProduct {
  id: string;
  name: string;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  type: string;
  mechanism: string;
  evidenceLevel: "strong" | "moderate" | "emerging";
  howItWorks: string;
  keyHighlights: string[];
  performanceProfile: PeptidePerformanceMetric[];
  dosingForms: PeptideDosingForm[];
  cycleProtocol: string;
  onsetTimeline: string;
  genexSynergy: string;
  targetVariants: string[];
  genexPanel: string;
  priceRange: string;
  marketLaunch: string;
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 1: LONGEVITY & CORE BIOREGULATOR
// Icon: Dna · Color: #7C3AED
// ═══════════════════════════════════════════════════════════════

export const LONGEVITY_PEPTIDES: PeptideProduct[] = [
  {
    id: "epitalon",
    name: "Epitalon\u2122",
    category: "Longevity & Core Bioregulator",
    categoryIcon: "Dna",
    categoryColor: "#7C3AED",
    type: "Tetrapeptide (Ala-Glu-Asp-Gly)",
    mechanism: "Telomerase activator + circadian rhythm optimization",
    evidenceLevel: "strong",
    howItWorks: "Imagine your cellular 'clock' gradually losing sync with age or stress. Epitalon is researched for helping maintain healthy telomere length and circadian signals, like giving the conductor a clearer baton.",
    keyHighlights: [
      "Studied for telomere maintenance and antioxidant support in cellular models",
      "Russian clinical experience (6-year follow-up): circadian rhythms, immune function, 20-40% mortality reduction vs controls",
      "Human fibroblasts divided past the Hayflick limit with Epitalon treatment (telomerase activation confirmed)",
      "Preclinical: normalize melatonin-related pathways and support cellular recovery",
    ],
    performanceProfile: [
      { metric: "Telomere Lengthening", value: "5-15% increase over 12 weeks" },
      { metric: "Sleep Quality", value: "30-50% improvement in sleep architecture" },
      { metric: "Circadian Rhythm", value: "Improved sleep timing, reduced jet lag" },
      { metric: "Immune Function", value: "Improved T-cell counts + function" },
      { metric: "Mortality Reduction", value: "20-40% vs controls (Khavinson 6-year study)" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "10mg daily, AM" },
      { form: "micellar", protocol: "12mg daily, AM" },
      { form: "injectable", protocol: "10mg daily or 2-3x weekly; 20mg vial + 2ml BAC water, 2mg dose = 20 units" },
      { form: "nasal_spray", protocol: "200mcg per nostril, 2x daily" },
    ],
    cycleProtocol: "20 days in a row, 3x/year with 2-month intervals",
    onsetTimeline: "Telomere effects 8-12 weeks; sleep effects 2-4 weeks",
    genexSynergy: "TERT/TERC variants (EpigenHQ) -> enhanced telomerase activation response",
    targetVariants: ["TERT", "TERC"],
    genexPanel: "EpigenHQ",
    priceRange: "$149-$189/month",
    marketLaunch: "Month 8",
  },
  {
    id: "vesugen",
    name: "Vesugen\u2122",
    category: "Longevity & Core Bioregulator",
    categoryIcon: "Dna",
    categoryColor: "#7C3AED",
    type: "Khavinson vascular bioregulator peptide",
    mechanism: "Endothelial health, microcirculation support",
    evidenceLevel: "moderate",
    howItWorks: "Your blood vessels are the delivery highways of every nutrient and peptide in your protocol. Vesugen supports endothelial health and microcirculation, ensuring every system gets the 'delivery service' it needs.",
    keyHighlights: [
      "Studied for vascular endothelial function support in Khavinson clinical cohorts",
      "Targets microcirculation, the tiny vessels that deliver nutrients to every tissue",
      "Part of the core bioregulator series with decades of clinical observation",
    ],
    performanceProfile: [
      { metric: "Microcirculation", value: "Enhanced nutrient delivery to all tissues" },
      { metric: "Endothelial Function", value: "Vascular wall integrity support" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "2mg daily, AM" },
      { form: "micellar", protocol: "2.5mg daily, AM" },
      { form: "injectable", protocol: "2mg/day; 20mg vial + 2ml BAC water, 20 units" },
      { form: "nasal_spray", protocol: "150mcg per nostril, 2x daily" },
    ],
    cycleProtocol: "30 days in a row, 1 month on / 2 months off, 2-3x/year",
    onsetTimeline: "4-6 weeks vascular effects",
    genexSynergy: "APOE variants -> vascular protection optimization with NutrigenDX data",
    targetVariants: ["APOE"],
    genexPanel: "NutrigenDX",
    priceRange: "$129-$159/month",
    marketLaunch: "Month 9",
  },
  {
    id: "bronchogen",
    name: "Bronchogen\u2122",
    category: "Longevity & Core Bioregulator",
    categoryIcon: "Dna",
    categoryColor: "#7C3AED",
    type: "Khavinson respiratory bioregulator peptide",
    mechanism: "Bronchial epithelial health, mucosal resilience",
    evidenceLevel: "moderate",
    howItWorks: "Your lungs are the gateway for oxygen, the fuel every cell needs. Bronchogen supports bronchial epithelial health and mucosal resilience, keeping the gateway clear and efficient.",
    keyHighlights: [
      "Respiratory tissue bioregulation in multi-tissue Khavinson cohorts",
      "Bronchial epithelial health and mucosal resilience support",
      "Emerging 2026 protocols stack with neuropeptides for systemic oxygenation",
      "Foundational bioregulator for respiratory system optimization",
    ],
    performanceProfile: [
      { metric: "Respiratory Function", value: "Enhanced bronchial tissue integrity" },
      { metric: "Mucosal Resilience", value: "Strengthened mucosal barrier" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "2mg daily" },
      { form: "micellar", protocol: "2.5mg daily" },
      { form: "injectable", protocol: "2mg/day; 20mg vial + 2ml BAC water" },
      { form: "nasal_spray", protocol: "150mcg per nostril, 2x daily" },
    ],
    cycleProtocol: "30 days in a row, 2 months off, 2-3x/year",
    onsetTimeline: "4-6 weeks",
    genexSynergy: "SOD2 variants -> respiratory tissue protection",
    targetVariants: ["SOD2"],
    genexPanel: "NutrigenDX",
    priceRange: "$119-$149/month",
    marketLaunch: "Month 9",
  },
];

// ═══════════════════════════════════════════════════════════════
// CATEGORY 2: ADRENAL/HPA AXIS & STRESS
// Icon: Zap · Color: #DC2626
// ═══════════════════════════════════════════════════════════════

export const ADRENAL_PEPTIDES: PeptideProduct[] = [
  {
    id: "adrenopeptide",
    name: "AdrenoPeptide\u2122",
    category: "Adrenal/HPA Axis & Stress",
    categoryIcon: "Zap",
    categoryColor: "#DC2626",
    type: "Khavinson pineal-adrenal axis bioregulator",
    mechanism: "HPA-axis rhythm restoration, cortisol normalization, fatigue reduction",
    evidenceLevel: "moderate",
    howItWorks: "Your adrenals are like a phone battery that's been running on 18% for months. This peptide helps the charger work better, supporting your body's natural stress-response rhythm so the battery can actually recharge.",
    keyHighlights: [
      "Based on Khavinson pineal-adrenal axis research with normalized cortisol/melatonin rhythms",
      "6-year longitudinal study: significant fatigue reduction and stress resilience improvement",
      "Designed for HPA-axis rhythm restoration, not stimulation, supports your natural pattern",
    ],
    performanceProfile: [
      { metric: "Cortisol Normalization", value: "Rhythm restoration without suppression" },
      { metric: "Fatigue Reduction", value: "Significant improvement in 6-year longitudinal" },
      { metric: "Stress Resilience", value: "Enhanced adaptive capacity" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "1 capsule daily, AM" },
      { form: "micellar", protocol: "1 capsule daily, AM" },
      { form: "injectable", protocol: "2mg/day; 20mg vial + 2ml BAC water" },
      { form: "nasal_spray", protocol: "150mcg per nostril, AM" },
    ],
    cycleProtocol: "30 days on, 2 months off",
    onsetTimeline: "2-4 weeks cortisol rhythm changes",
    genexSynergy: "COMT Val/Met status -> stress response calibration with GeneX-M data",
    targetVariants: ["COMT"],
    genexPanel: "GeneX-M",
    priceRange: "$119-$149/month",
    marketLaunch: "Month 9",
  },
  {
    id: "hpa-balance",
    name: "HPA-Balance\u2122",
    category: "Adrenal/HPA Axis & Stress",
    categoryIcon: "Zap",
    categoryColor: "#DC2626",
    type: "Khavinson HPA-axis bioregulator",
    mechanism: "Hypothalamic-pituitary-adrenal communication recalibration",
    evidenceLevel: "moderate",
    howItWorks: "Think of the HPA axis as a thermostat connecting your brain to your adrenals. When stress keeps turning up the heat, the thermostat gets stuck. This peptide helps recalibrate the dial, so your system stops overheating and finds its natural set point.",
    keyHighlights: [
      "Targets the hypothalamic-pituitary-adrenal communication pathway",
      "Studied for cortisol rhythm normalization without suppression",
      "Designed to complement adaptogenic herbs like Ashwagandha and Rhodiola",
    ],
    performanceProfile: [
      { metric: "HPA Recalibration", value: "Thermostat reset for stress response" },
      { metric: "Cortisol Rhythm", value: "Normalization without suppression" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "1 capsule daily" },
      { form: "micellar", protocol: "1 capsule daily" },
      { form: "injectable", protocol: "2mg/day; 20mg vial + 2ml BAC water" },
      { form: "nasal_spray", protocol: "150mcg per nostril, daily" },
    ],
    cycleProtocol: "30 days on, 2 months off",
    onsetTimeline: "2-4 weeks",
    genexSynergy: "CYP1A2 metabolizer status -> cortisol clearance optimization",
    targetVariants: ["CYP1A2"],
    genexPanel: "GeneX-M",
    priceRange: "$119-$149/month",
    marketLaunch: "Month 9",
  },
  {
    id: "stressshield",
    name: "StressShield\u2122",
    category: "Adrenal/HPA Axis & Stress",
    categoryIcon: "Zap",
    categoryColor: "#DC2626",
    type: "Neuropeptide resilience compound",
    mechanism: "Parasympathetic nervous system tone support without sedation",
    evidenceLevel: "moderate",
    howItWorks: "When stress hits, your nervous system can get 'stuck in alarm mode.' StressShield supports the calming branch of your nervous system, like adding sound insulation to a room so the noise outside doesn't keep rattling the windows.",
    keyHighlights: [
      "Neuropeptide-based approach to acute stress response modulation",
      "Supports parasympathetic nervous system tone without sedation",
      "Complements adaptogenic and anxiolytic herbal protocols",
    ],
    performanceProfile: [
      { metric: "Parasympathetic Tone", value: "Enhanced calming response" },
      { metric: "Stress Buffer", value: "Reduced nervous system reactivity without sedation" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "1 capsule daily or as needed" },
      { form: "micellar", protocol: "1 capsule daily or as needed" },
      { form: "injectable", protocol: "250mcg as needed" },
      { form: "nasal_spray", protocol: "100mcg per nostril, as needed" },
    ],
    cycleProtocol: "Daily use or as-needed; no cycling required",
    onsetTimeline: "30-60 min (oral); 5-10 min (nasal)",
    genexSynergy: "COMT + MTHFR status -> neurotransmitter resilience calibration",
    targetVariants: ["COMT", "MTHFR"],
    genexPanel: "GeneX-M",
    priceRange: "$99-$129/month",
    marketLaunch: "Month 9",
  },
  {
    id: "recoverypulse",
    name: "RecoveryPulse\u2122",
    category: "Adrenal/HPA Axis & Stress",
    categoryIcon: "Zap",
    categoryColor: "#DC2626",
    type: "Tissue recovery and HPA restoration peptide",
    mechanism: "Recovery phase support, tissue repair during rest",
    evidenceLevel: "moderate",
    howItWorks: "Recovery is where growth happens, your body rebuilds stronger during rest, not during stress. This peptide supports the recovery phase of your daily rhythm, helping your system bounce back faster from physical and mental demands.",
    keyHighlights: [
      "Targets the recovery phase of the HPA stress cycle",
      "Supports tissue repair processes studied in Khavinson bioregulator research",
      "Designed for active individuals who push hard and need faster recovery",
    ],
    performanceProfile: [
      { metric: "Recovery Speed", value: "Accelerated bounce-back from physical/mental demands" },
      { metric: "Tissue Repair", value: "Enhanced repair during rest periods" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "1 capsule PM" },
      { form: "micellar", protocol: "1 capsule PM" },
      { form: "injectable", protocol: "2mg/day PM" },
      { form: "nasal_spray", protocol: "150mcg per nostril, PM" },
    ],
    cycleProtocol: "Daily during training/high-demand periods",
    onsetTimeline: "3-5 days initial; 2-3 weeks full recovery benefit",
    genexSynergy: "COL1A1 collagen variants -> tissue recovery optimization with PeptideIQ data",
    targetVariants: ["COL1A1"],
    genexPanel: "PeptideIQ",
    priceRange: "$119-$149/month",
    marketLaunch: "Month 9",
  },
];

// ═══════════════════════════════════════════════════════════════
// CATEGORY 3: MITOCHONDRIAL/ENERGY
// Icon: Battery · Color: #F59E0B
// ═══════════════════════════════════════════════════════════════

export const MITOCHONDRIAL_PEPTIDES: PeptideProduct[] = [
  {
    id: "mitopeptide",
    name: "MitoPeptide\u2122",
    category: "Mitochondrial/Energy",
    categoryIcon: "Battery",
    categoryColor: "#F59E0B",
    type: "Khavinson mitochondrial bioregulator + Epitalon-inspired",
    mechanism: "Mitochondrial membrane protection and ATP efficiency",
    evidenceLevel: "moderate",
    howItWorks: "Your mitochondria are tiny power plants inside every cell. When they run inefficiently, everything downstream suffers, energy, focus, mood. MitoPeptide supports the membrane integrity of these power plants so they produce cleaner, more efficient energy.",
    keyHighlights: [
      "Targets mitochondrial membrane protection and ATP efficiency",
      "Human pilot data supports ATP/telomere synergy with Epitalon-based peptides",
      "Animal lifespan extension demonstrated with mitochondrial bioregulators",
    ],
    performanceProfile: [
      { metric: "Membrane Integrity", value: "Enhanced mitochondrial membrane protection" },
      { metric: "ATP Efficiency", value: "Improved cellular energy production" },
      { metric: "Lifespan", value: "Extension demonstrated in preclinical models" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "1 capsule daily, AM" },
      { form: "micellar", protocol: "1 capsule daily, AM" },
      { form: "injectable", protocol: "2mg/day; 20mg vial + 2ml BAC water" },
      { form: "nasal_spray", protocol: "150mcg per nostril, AM" },
    ],
    cycleProtocol: "30 days on, 2 months off",
    onsetTimeline: "4-6 weeks energy effects",
    genexSynergy: "SOD2 variants -> oxidative stress protection for mitochondria",
    targetVariants: ["SOD2"],
    genexPanel: "NutrigenDX",
    priceRange: "$129-$159/month",
    marketLaunch: "Month 8",
  },
  {
    id: "energycore",
    name: "EnergyCore\u2122",
    category: "Mitochondrial/Energy",
    categoryIcon: "Battery",
    categoryColor: "#F59E0B",
    type: "SS-31/Elamipretide wellness analog",
    mechanism: "Inner mitochondrial membrane targeting, where 90% of cellular energy is produced",
    evidenceLevel: "strong",
    howItWorks: "Imagine your cells' power plants running on old spark plugs. EnergyCore is inspired by research that targets the inner membrane of these power plants, where 90% of your cellular energy is actually made. Note: EnergyCore is a wellness analog, NOT the FDA-approved drug.",
    keyHighlights: [
      "SS-31/Elamipretide: Phase 2/3 RCTs with improved 6-minute walk test (up to +96m)",
      "FDA approved for Barth syndrome in 2025 based on long-term data",
      "Sustained mitochondrial energetics improvement over long-term extension",
      "Cardiac stroke volume improved; cardiolipin levels stabilized",
    ],
    performanceProfile: [
      { metric: "6-Minute Walk Test", value: "Up to +96 meter improvement (SS-31 Phase 2/3)" },
      { metric: "Cardiac Stroke Volume", value: "Improved" },
      { metric: "Cardiolipin Levels", value: "Stabilized (mitochondrial membrane marker)" },
      { metric: "Fatigue Scores", value: "Significantly reduced" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "500mcg daily, AM" },
      { form: "micellar", protocol: "600mcg daily, AM" },
      { form: "injectable", protocol: "500mcg; 10mg vial + 2ml BAC water, 10 units; AM" },
      { form: "nasal_spray", protocol: "200mcg per nostril, AM" },
    ],
    cycleProtocol: "5 days on, 2 off; 8 weeks on, 8 weeks off",
    onsetTimeline: "2-4 weeks fatigue reduction; 8-12 weeks maximal",
    genexSynergy: "COMT + flattened cortisol -> Mitochondrial Fog pattern support",
    targetVariants: ["COMT"],
    genexPanel: "GeneX-M",
    priceRange: "$149-$199/month",
    marketLaunch: "Month 8",
  },
  {
    id: "coq10-peptide",
    name: "CoQ10-Peptide\u2122",
    category: "Mitochondrial/Energy",
    categoryIcon: "Battery",
    categoryColor: "#F59E0B",
    type: "CoQ10 biosynthesis support peptide",
    mechanism: "Endogenous CoQ10 production optimization, not just supplementing from outside, but optimizing production from within",
    evidenceLevel: "moderate",
    howItWorks: "CoQ10 is the spark plug in your mitochondria's engine. When biosynthesis declines with age or genetic variants, this peptide supports the pathway that makes your body's own CoQ10, not just supplementing from outside, but optimizing production from within.",
    keyHighlights: [
      "SS-31 heart failure data supports mitochondrial energetics benefits in cardiac tissue",
      "Improved ATP production efficiency in preclinical + human pilot research",
      "Complements exogenous CoQ10 (Ubiquinol) supplementation for dual-pathway support",
    ],
    performanceProfile: [
      { metric: "ATP Production", value: "Improved efficiency" },
      { metric: "Dual-Pathway", value: "Endogenous + exogenous CoQ10 optimization" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "1 capsule daily" },
      { form: "micellar", protocol: "1 capsule daily" },
      { form: "injectable", protocol: "2mg/day" },
      { form: "nasal_spray", protocol: "150mcg per nostril, daily" },
    ],
    cycleProtocol: "Continuous daily use",
    onsetTimeline: "4-6 weeks",
    genexSynergy: "CoQ10 biosynthesis SNPs -> targeted enzyme support",
    targetVariants: ["CoQ10_SNPs"],
    genexPanel: "NutrigenDX",
    priceRange: "$119-$149/month",
    marketLaunch: "Month 8",
  },
  {
    id: "atp-regen",
    name: "ATP-Regen\u2122",
    category: "Mitochondrial/Energy",
    categoryIcon: "Battery",
    categoryColor: "#F59E0B",
    type: "Cellular ATP regeneration pathway compound",
    mechanism: "ATP synthesis and recycling pathway support, recycling spent energy molecules back into usable fuel",
    evidenceLevel: "moderate",
    howItWorks: "ATP is the actual energy currency your cells spend every second. When demand exceeds production, you feel it as fatigue, brain fog, and slow recovery. ATP-Regen supports the recycling of spent energy molecules back into usable fuel.",
    keyHighlights: [
      "Targets ATP synthesis and recycling pathways in mitochondria",
      "Complements SS-31 research showing sustained mitochondrial energetics improvement",
      "Designed for high-demand individuals: athletes, high-stress professionals, recovery-focused users",
    ],
    performanceProfile: [
      { metric: "ATP Recycling", value: "Enhanced spent-to-usable energy conversion" },
      { metric: "Energy Demand", value: "Meets high-demand cellular requirements" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "1 capsule daily, AM" },
      { form: "micellar", protocol: "1 capsule daily, AM" },
      { form: "injectable", protocol: "2mg/day, AM" },
      { form: "nasal_spray", protocol: "150mcg per nostril, AM" },
    ],
    cycleProtocol: "Daily during high-demand periods",
    onsetTimeline: "3-5 days initial energy; 4 weeks full benefit",
    genexSynergy: "CYP metabolizer status -> energy compound processing optimization",
    targetVariants: ["CYP2D6", "CYP3A4"],
    genexPanel: "GeneX-M",
    priceRange: "$119-$149/month",
    marketLaunch: "Month 8",
  },
  {
    id: "slu-pp-332",
    name: "SLU-PP-332",
    category: "Mitochondrial/Energy",
    categoryIcon: "Battery",
    categoryColor: "#F59E0B",
    type: "Synthetic pan-ERR agonist (ERR\u03b1/\u03b2/\u03b3), exercise mimetic",
    mechanism: "Activates estrogen-related receptors to replicate aerobic exercise gene program. Upregulates PGC-1\u03b1, PDK4, fatty acid oxidation enzymes, and mitochondrial biogenesis pathways.",
    evidenceLevel: "emerging",
    howItWorks: "SLU-PP-332 is a groundbreaking exercise mimetic that replicates the cellular and physiological effects of aerobic exercise without physical exertion. It activates the same nuclear receptors (ERR\u03b1/\u03b2/\u03b3) that exercise turns on, triggering mitochondrial biogenesis, increased fatty acid oxidation, and enhanced muscle fiber conversion.",
    keyHighlights: [
      "Pan-ERR agonist with highest potency for ERR\u03b1 (EC50 = 98 nM)",
      "Exercise mimetic: replicates aerobic exercise gene program in sedentary mice",
      "Increased Type IIa oxidative muscle fibers and enhanced exercise endurance",
      "Increased energy expenditure, decreased fat mass, improved glucose tolerance + insulin sensitivity",
      "50% increase in brown adipose tissue (BAT) activity",
      "Orally bioavailable, one of the first ERR agonists viable for in vivo oral use",
      "Neuroprotective: ERR\u03b3 pathway may delay synuclein toxicity (Parkinson's research)",
      "Cardioprotective: improved cardiac metabolism, reversed heart failure pathology",
      "Anti-aging: reversed inflammation + mitochondrial damage in aging kidney tissue",
    ],
    performanceProfile: [
      { metric: "Exercise Mimicry", value: "Replicates aerobic exercise gene expression program" },
      { metric: "Muscle Fiber Conversion", value: "Increased Type IIa fast oxidative fibers" },
      { metric: "Energy Expenditure", value: "Increased resting metabolic rate" },
      { metric: "Fat Mass", value: "Decreased accumulation in obesity models" },
      { metric: "Glucose Tolerance", value: "Improved insulin sensitivity" },
      { metric: "BAT Activity", value: "50% increase in brown fat thermogenesis" },
      { metric: "Endurance", value: "Enhanced exercise endurance in sedentary mice" },
      { metric: "Neuroprotection", value: "ERR\u03b3 pathway, Parkinson's disease potential" },
      { metric: "Cardioprotection", value: "Improved cardiac metabolism, reversed heart failure" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "10-20mg daily, AM" },
      { form: "micellar", protocol: "12-25mg daily, AM" },
      { form: "injectable", protocol: "50mg/kg reference dose (preclinical); human dose TBD" },
      { form: "nasal_spray", protocol: "5-10mg per nostril, AM" },
    ],
    cycleProtocol: "No cycling required, continuous daily use",
    onsetTimeline: "1-2 weeks metabolic shift; 4-8 weeks endurance/body composition changes",
    genexSynergy: "SOD2 oxidative stress variants + CYP metabolizer status -> mitochondrial exercise response optimization",
    targetVariants: ["SOD2", "CYP2D6", "CYP3A4"],
    genexPanel: "NutrigenDX",
    priceRange: "$149-$199/month",
    marketLaunch: "Month 10",
  },
];

// ═══════════════════════════════════════════════════════════════
// COMBINED EXPORT
// ═══════════════════════════════════════════════════════════════

export const ALL_CATEGORIES_1_3 = [
  ...LONGEVITY_PEPTIDES,
  ...ADRENAL_PEPTIDES,
  ...MITOCHONDRIAL_PEPTIDES,
];

export const CATEGORY_CONFIG_1_3 = [
  { id: "longevity", label: "Longevity & Core Bioregulator", icon: "Dna", color: "#7C3AED", products: LONGEVITY_PEPTIDES },
  { id: "adrenal", label: "Adrenal/HPA Axis & Stress", icon: "Zap", color: "#DC2626", products: ADRENAL_PEPTIDES },
  { id: "mitochondrial", label: "Mitochondrial/Energy", icon: "Battery", color: "#F59E0B", products: MITOCHONDRIAL_PEPTIDES },
];
