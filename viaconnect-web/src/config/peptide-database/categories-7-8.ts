// FarmCeutica Peptide Database — Categories 7-8
// Gut & Detox Support | Metabolic / GLP-1 Class
// 4 products, 13 SKUs

import type { PeptideProduct } from "./categories-1-3";

// ═══════════════════════════════════════════════════════════════
// CATEGORY 7: GUT & DETOX SUPPORT
// Icon: Leaf · Color: #84CC16
// ═══════════════════════════════════════════════════════════════

export const GUT_DETOX_PEPTIDES: PeptideProduct[] = [
  {
    id: "gutrepair",
    name: "GutRepair\u2122",
    category: "Gut & Detox Support",
    categoryIcon: "Leaf",
    categoryColor: "#84CC16",
    type: "BPC-157-based gut barrier repair peptide",
    mechanism: "Intestinal epithelial cell regeneration, tight junction integrity, repairing the selective gut barrier",
    evidenceLevel: "moderate",
    howItWorks: "Your gut lining is a selective barrier. When damaged, it becomes 'leaky,' letting undigested particles trigger immune responses throughout your body. GutRepair supports cellular repair of this critical barrier.",
    keyHighlights: [
      "BPC-157 Phase I oral safety confirmed with clean GI tolerability",
      "Gut barrier repair and UC pilot showing 60% improvement in markers",
      "Supports intestinal epithelial cell regeneration and tight junction integrity",
    ],
    performanceProfile: [
      { metric: "Gut Barrier", value: "60% improvement in UC pilot markers" },
      { metric: "Tight Junctions", value: "Enhanced intestinal integrity" },
      { metric: "GI Tolerability", value: "Clean Phase I safety profile" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "500mcg 2-3x daily (preferred for GI-local action)" },
      { form: "micellar", protocol: "500mcg 2-3x daily" },
      { form: "injectable", protocol: "200-500mcg daily" },
      { form: "nasal_spray", protocol: "200mcg per nostril, 2x daily" },
    ],
    cycleProtocol: "8-12 weeks for barrier repair; continuous for chronic GI",
    onsetTimeline: "1-2 weeks symptom relief; 4-8 weeks structural repair",
    genexSynergy: "FUT2 B12 absorption variants -> intestinal barrier optimization",
    targetVariants: ["FUT2"],
    genexPanel: "NutrigenDX",
    priceRange: "$149-$199/month",
    marketLaunch: "Month 8",
  },
  {
    id: "detoxpeptide",
    name: "DetoxPeptide\u2122",
    category: "Gut & Detox Support",
    categoryIcon: "Leaf",
    categoryColor: "#84CC16",
    type: "Hepatoprotective peptide bioregulator",
    mechanism: "Phase I and Phase II liver detox pathway enzyme support, helping the body's processing plant work smarter",
    evidenceLevel: "moderate",
    howItWorks: "Your liver is the body's processing plant, filtering toxins through Phase I and Phase II detox pathways. DetoxPeptide supports these pathways at the tissue level, helping your liver work smarter under toxic load.",
    keyHighlights: [
      "Hepatoprotective peptide bioregulation studies",
      "Support for Phase I/II liver detox pathway enzyme function",
      "Khavinson liver bioregulator series with decades of observational data",
    ],
    performanceProfile: [
      { metric: "Phase I/II Enzymes", value: "Enhanced detox pathway function" },
      { metric: "Hepatoprotection", value: "Liver tissue support under toxic load" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "1 capsule daily" },
      { form: "micellar", protocol: "1 capsule daily" },
      { form: "injectable", protocol: "2mg/day" },
      { form: "nasal_spray", protocol: "150mcg per nostril, daily" },
    ],
    cycleProtocol: "30 days on, 2 months off; or continuous during detox protocols",
    onsetTimeline: "2-4 weeks",
    genexSynergy: "NAT2/GSTM1 detox pathway variants -> Phase I/II enzyme support",
    targetVariants: ["NAT2", "GSTM1"],
    genexPanel: "NutrigenDX",
    priceRange: "$119-$149/month",
    marketLaunch: "Month 9",
  },
  {
    id: "histaminebalance",
    name: "HistamineBalance\u2122",
    category: "Gut & Detox Support",
    categoryIcon: "Leaf",
    categoryColor: "#84CC16",
    type: "Histamine metabolism and mast cell stabilization peptide",
    mechanism: "DAO and HNMT histamine degradation enzyme support + mast cell stabilization for systemic histamine management",
    evidenceLevel: "moderate",
    howItWorks: "Histamine is essential for immune signaling, but when it accumulates from poor breakdown, gut issues, or genetic variants, it triggers widespread symptoms: headaches, skin flushing, digestive distress, anxiety. HistamineBalance supports the enzymes that keep histamine in check.",
    keyHighlights: [
      "Targets DAO and HNMT histamine degradation enzyme pathways",
      "Mast cell stabilization support for systemic histamine management",
      "Designed for histamine intolerance patterns identified via CAQ + genetic data",
    ],
    performanceProfile: [
      { metric: "Histamine Clearance", value: "Enhanced DAO/HNMT enzyme activity" },
      { metric: "Mast Cell Stabilization", value: "Reduced inappropriate histamine release" },
      { metric: "Symptom Relief", value: "Headaches, flushing, GI distress, anxiety" },
    ],
    dosingForms: [
      { form: "liposomal", protocol: "1 capsule daily" },
      { form: "micellar", protocol: "1 capsule daily" },
      { form: "injectable", protocol: "2mg/day" },
      { form: "nasal_spray", protocol: "150mcg per nostril, daily" },
    ],
    cycleProtocol: "Continuous during histamine intolerance episodes; or prophylactic 30-day cycles",
    onsetTimeline: "1-2 weeks symptom relief",
    genexSynergy: "DAO/HNMT histamine variants -> targeted histamine metabolism support",
    targetVariants: ["DAO", "HNMT"],
    genexPanel: "NutrigenDX",
    priceRange: "$119-$149/month",
    marketLaunch: "Month 9",
  },
];

// ═══════════════════════════════════════════════════════════════
// CATEGORY 8: METABOLIC / GLP-1 CLASS
// Icon: TrendingDown · Color: #B75E18
// ═══════════════════════════════════════════════════════════════

export const METABOLIC_PEPTIDES: PeptideProduct[] = [
  {
    id: "retatrutide",
    name: "Retatrutide",
    category: "Metabolic / GLP-1 Class",
    categoryIcon: "TrendingDown",
    categoryColor: "#B75E18",
    type: "Triple agonist (GLP-1 + GIP + Glucagon receptor agonist), Eli Lilly Phase 3 TRIUMPH program",
    mechanism: "Metabolic reset: appetite suppression (GLP-1), enhanced insulin sensitivity (GIP), elevated metabolic rate (Glucagon). Weight loss + metabolic rate + blood sugar optimization simultaneously.",
    evidenceLevel: "strong",
    howItWorks: "Retatrutide activates three metabolic pathways simultaneously: appetite suppression (GLP-1), enhanced insulin sensitivity (GIP), and elevated metabolic rate (Glucagon). This triple mechanism creates a 'metabolic reset' effect that single or dual agonists cannot achieve.",
    keyHighlights: [
      "Phase 3 TRIUMPH-4: 28.7% mean body weight reduction in 12-month trials (vs. 15-17% tirzepatide)",
      "Triple agonist mechanism: GLP-1 + GIP + Glucagon receptor activation, first in class",
      "Resting metabolic rate elevation of 12-18%, addresses muscle-wasting concern of GLP-1-only agents",
      "HbA1c reduction of 2.0-2.5% in Type 2 diabetics",
      "Favorable lipid profile and blood pressure reduction",
      "GI side effects (nausea, diarrhea) in 25-30%; manageable with titration",
      "INVESTIGATIONAL: Currently in Phase 3 clinical trials. FDA submission expected 2026-2027.",
      "Must be discussed with and prescribed by a licensed practitioner",
    ],
    performanceProfile: [
      { metric: "Weight Loss", value: "28.7% mean body weight reduction (TRIUMPH-4, 12 months)" },
      { metric: "vs. Tirzepatide", value: "Superior: 28.7% vs 15-17%" },
      { metric: "Metabolic Rate", value: "12-18% elevation in resting metabolic rate" },
      { metric: "HbA1c", value: "2.0-2.5% reduction in Type 2 diabetics" },
      { metric: "Cardiovascular", value: "Favorable lipid profile + blood pressure reduction" },
      { metric: "Safety", value: "GI side effects 25-30%, manageable with titration" },
    ],
    dosingForms: [
      { form: "injectable", protocol: "Once-weekly subcutaneous; Titration: 0.5mg -> 1.0mg -> 1.5mg -> 2.0mg -> 2.5mg (5-week increments); Maintenance: 2.0-2.5mg weekly; 10mg vial + 2ml BAC water" },
    ],
    cycleProtocol: "Continuous once-weekly; titration over 5 weeks",
    onsetTimeline: "2-4 weeks appetite suppression; 8-12 weeks maximal metabolic rate",
    genexSynergy: "CYP metabolizer status + HormoneIQ endocrine panel -> metabolic pathway personalization",
    targetVariants: ["CYP2C19", "CYP3A4"],
    genexPanel: "HormoneIQ",
    priceRange: "$450-$600/month",
    marketLaunch: "Q3 2026",
  },
];

export const ALL_CATEGORIES_7_8 = [...GUT_DETOX_PEPTIDES, ...METABOLIC_PEPTIDES];

export const CATEGORY_CONFIG_7_8 = [
  { id: "gut_detox", label: "Gut & Detox Support", icon: "Leaf", color: "#84CC16", products: GUT_DETOX_PEPTIDES },
  { id: "metabolic", label: "Metabolic / GLP-1 Class", icon: "TrendingDown", color: "#B75E18", products: METABOLIC_PEPTIDES },
];
