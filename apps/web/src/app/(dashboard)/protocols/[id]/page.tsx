"use client"

import { use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Users,
  BookOpen,
  Pill,
  Activity,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ─── Types ──────────────────────────────────────────────────────────────────

interface Supplement {
  name: string
  dose: string
  timing: string
  duration: string
  evidenceLevel: string
}

interface LabMarker {
  name: string
  frequency: string
  targetRange: string
  unit: string
}

interface Patient {
  id: string
  name: string
  startDate: string
  status: string
  adherence: number
}

interface ProtocolDetail {
  id: string
  name: string
  description: string
  overview: string
  evidenceGrade: string
  clinicalGoals: string[]
  genes: string[]
  supplements: Supplement[]
  labMarkers: LabMarker[]
  patients: Patient[]
}

// ─── Mock Protocol Detail Data ──────────────────────────────────────────────

const PROTOCOL_DATA: Record<string, ProtocolDetail> = {
  methylation: {
    id: "methylation",
    name: "Methylation",
    description: "MTHFR, MTR, MTRR optimization for homocysteine metabolism and methyl group transfer efficiency.",
    overview:
      "The methylation protocol addresses impaired one-carbon metabolism commonly seen in patients with MTHFR C677T and A1298C polymorphisms. This pathway is essential for DNA synthesis, neurotransmitter production, detoxification, and epigenetic regulation. Patients with compromised methylation often present with elevated homocysteine, fatigue, mood disturbances, and increased cardiovascular risk. This protocol uses bioavailable methyl donors and cofactors to restore optimal methylation capacity while monitoring for overmethylation symptoms.",
    evidenceGrade: "A",
    clinicalGoals: [
      "Reduce homocysteine below 8 umol/L",
      "Optimize SAMe/SAH ratio",
      "Support DNA methylation patterns",
      "Improve neurotransmitter synthesis",
      "Reduce cardiovascular risk markers",
    ],
    genes: ["MTHFR", "MTR", "MTRR", "BHMT", "CBS", "SHMT1"],
    supplements: [
      { name: "L-Methylfolate (5-MTHF)", dose: "1,000-15,000 mcg", timing: "Morning with food", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Methylcobalamin (B12)", dose: "1,000-5,000 mcg", timing: "Morning sublingual", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Pyridoxal-5-Phosphate (P5P)", dose: "25-50 mg", timing: "Twice daily with meals", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Riboflavin-5-Phosphate (R5P)", dose: "25-50 mg", timing: "Morning with food", duration: "12 weeks, reassess", evidenceLevel: "Moderate" },
      { name: "Trimethylglycine (TMG)", dose: "500-1,000 mg", timing: "Morning with food", duration: "As needed", evidenceLevel: "Moderate" },
      { name: "SAMe", dose: "200-400 mg", timing: "Morning on empty stomach", duration: "8-12 weeks", evidenceLevel: "Moderate" },
    ],
    labMarkers: [
      { name: "Homocysteine", frequency: "Every 8 weeks", targetRange: "5-8", unit: "umol/L" },
      { name: "Methylmalonic Acid", frequency: "Every 12 weeks", targetRange: "73-271", unit: "nmol/L" },
      { name: "Folate (serum)", frequency: "Every 12 weeks", targetRange: ">20", unit: "ng/mL" },
      { name: "Vitamin B12", frequency: "Every 12 weeks", targetRange: "500-1,500", unit: "pg/mL" },
      { name: "SAMe/SAH Ratio", frequency: "Every 16 weeks", targetRange: ">4.0", unit: "ratio" },
    ],
    patients: [
      { id: "pt-001", name: "Maria Gonzalez", startDate: "2025-11-15", status: "Active", adherence: 94 },
      { id: "pt-010", name: "Michael Abrams", startDate: "2026-01-08", status: "Active", adherence: 87 },
      { id: "pt-015", name: "Jennifer Wu", startDate: "2025-12-01", status: "Active", adherence: 91 },
      { id: "pt-022", name: "David Kowalski", startDate: "2026-02-14", status: "Active", adherence: 78 },
    ],
  },
  "phase-i-detox": {
    id: "phase-i-detox",
    name: "Phase I Detox",
    description: "CYP450 enzyme support for oxidation, reduction, and hydrolysis reactions in hepatic biotransformation.",
    overview:
      "Phase I detoxification involves the cytochrome P450 enzyme family responsible for the initial biotransformation of xenobiotics, drugs, and endogenous compounds. Genetic polymorphisms in CYP genes can result in poor, intermediate, extensive, or ultra-rapid metabolizer phenotypes, significantly affecting drug efficacy and toxicity. This protocol supports optimal Phase I function while managing the reactive intermediates produced during oxidative metabolism.",
    evidenceGrade: "B+",
    clinicalGoals: [
      "Optimize CYP450 enzyme activity based on genotype",
      "Reduce reactive intermediate accumulation",
      "Support electron transport chain function",
      "Manage drug-nutrient interactions",
      "Balance Phase I/Phase II conjugation ratios",
    ],
    genes: ["CYP1A2", "CYP2D6", "CYP3A4", "CYP2C19", "CYP2C9", "CYP1B1"],
    supplements: [
      { name: "N-Acetyl Cysteine (NAC)", dose: "600-1,200 mg", timing: "Twice daily between meals", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Milk Thistle (Silymarin)", dose: "200-400 mg", timing: "Twice daily with meals", duration: "12 weeks", evidenceLevel: "Strong" },
      { name: "Alpha Lipoic Acid", dose: "300-600 mg", timing: "Morning on empty stomach", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Glutathione (Liposomal)", dose: "250-500 mg", timing: "Morning on empty stomach", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "B-Complex (Activated)", dose: "1 capsule", timing: "Morning with food", duration: "Ongoing", evidenceLevel: "Strong" },
    ],
    labMarkers: [
      { name: "GGT", frequency: "Every 12 weeks", targetRange: "10-26", unit: "U/L" },
      { name: "ALT", frequency: "Every 12 weeks", targetRange: "7-35", unit: "U/L" },
      { name: "AST", frequency: "Every 12 weeks", targetRange: "10-34", unit: "U/L" },
      { name: "Glutathione (RBC)", frequency: "Every 16 weeks", targetRange: "800-1,200", unit: "umol/L" },
      { name: "8-OHdG", frequency: "Every 16 weeks", targetRange: "<8.0", unit: "ng/mg Cr" },
    ],
    patients: [
      { id: "pt-005", name: "Yuki Tanaka", startDate: "2025-10-20", status: "Active", adherence: 89 },
      { id: "pt-008", name: "Ahmed Hassan", startDate: "2026-01-15", status: "Active", adherence: 92 },
      { id: "pt-019", name: "Laura Chen", startDate: "2026-02-01", status: "Active", adherence: 85 },
    ],
  },
  "phase-ii-detox": {
    id: "phase-ii-detox",
    name: "Phase II Detox",
    description: "Conjugation pathway support including glucuronidation, sulfation, glutathione conjugation, and acetylation.",
    overview:
      "Phase II detoxification conjugates reactive intermediates from Phase I with water-soluble molecules for safe elimination. Key pathways include glucuronidation (UGT enzymes), sulfation (SULT), glutathione conjugation (GST), acetylation (NAT), and amino acid conjugation. Genetic variants in these enzymes can impair toxin clearance and increase susceptibility to environmental toxicity and drug adverse effects.",
    evidenceGrade: "B",
    clinicalGoals: [
      "Enhance glucuronidation capacity",
      "Support sulfation pathways",
      "Optimize glutathione conjugation",
      "Balance acetylation speed",
      "Improve toxin elimination efficiency",
    ],
    genes: ["GSTM1", "GSTP1", "NAT2", "UGT1A1", "SULT1A1", "COMT"],
    supplements: [
      { name: "Calcium D-Glucarate", dose: "500-1,500 mg", timing: "Twice daily with meals", duration: "12 weeks", evidenceLevel: "Moderate" },
      { name: "Sulforaphane (Broccoli Extract)", dose: "50-100 mg", timing: "Morning with food", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Glycine", dose: "1,000-3,000 mg", timing: "Evening before bed", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Taurine", dose: "500-1,000 mg", timing: "Twice daily", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Molybdenum", dose: "150-300 mcg", timing: "With meals", duration: "8 weeks", evidenceLevel: "Limited" },
    ],
    labMarkers: [
      { name: "D-Glucaric Acid (urine)", frequency: "Every 12 weeks", targetRange: "0.7-3.5", unit: "umol/mg Cr" },
      { name: "Sulfate (plasma)", frequency: "Every 12 weeks", targetRange: "3.0-5.5", unit: "mg/dL" },
      { name: "Mercapturic Acids (urine)", frequency: "Every 16 weeks", targetRange: "Normal range", unit: "qualitative" },
      { name: "Pyroglutamic Acid", frequency: "Every 16 weeks", targetRange: "<45", unit: "mmol/mol Cr" },
    ],
    patients: [
      { id: "pt-003", name: "Aisha Patel", startDate: "2026-01-10", status: "Active", adherence: 82 },
      { id: "pt-016", name: "Thomas Rivera", startDate: "2025-12-15", status: "Active", adherence: 90 },
    ],
  },
  neurotransmitter: {
    id: "neurotransmitter",
    name: "Neurotransmitter Metabolism",
    description: "COMT, MAO, and GAD support for optimal catecholamine and GABA neurotransmitter balance.",
    overview:
      "Neurotransmitter metabolism is governed by enzymes including COMT (catecholamine degradation), MAO (monoamine oxidation), GAD (GABA synthesis), and TPH (serotonin synthesis). The COMT Val158Met polymorphism is particularly significant, with Met/Met carriers showing 3-4x slower catecholamine clearance, leading to elevated dopamine and norepinephrine levels. This protocol balances neurotransmitter production and degradation based on individual genetic profiles.",
    evidenceGrade: "B+",
    clinicalGoals: [
      "Optimize dopamine/norepinephrine clearance",
      "Support GABA synthesis and receptor function",
      "Balance serotonin production",
      "Reduce anxiety and stress response",
      "Improve cognitive function and focus",
    ],
    genes: ["COMT", "MAO-A", "GAD1", "TPH2", "DBH", "DDC"],
    supplements: [
      { name: "Magnesium L-Threonate", dose: "144 mg elemental Mg", timing: "Evening", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "L-Theanine", dose: "200-400 mg", timing: "Twice daily", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Phosphatidylserine", dose: "100-300 mg", timing: "Morning and evening", duration: "12 weeks", evidenceLevel: "Moderate" },
      { name: "GABA (Pharma-grade)", dose: "250-750 mg", timing: "Evening before bed", duration: "As needed", evidenceLevel: "Moderate" },
      { name: "SAMe", dose: "200-400 mg", timing: "Morning on empty stomach", duration: "8 weeks, reassess", evidenceLevel: "Moderate" },
      { name: "Vitamin B6 (P5P)", dose: "25-50 mg", timing: "With meals", duration: "Ongoing", evidenceLevel: "Strong" },
    ],
    labMarkers: [
      { name: "Dopamine (urine)", frequency: "Every 12 weeks", targetRange: "52-480", unit: "ug/g Cr" },
      { name: "Norepinephrine (urine)", frequency: "Every 12 weeks", targetRange: "23-105", unit: "ug/g Cr" },
      { name: "Serotonin (urine)", frequency: "Every 12 weeks", targetRange: "50-200", unit: "ug/g Cr" },
      { name: "GABA (urine)", frequency: "Every 16 weeks", targetRange: "2.0-10.0", unit: "umol/g Cr" },
      { name: "Cortisol (4-point salivary)", frequency: "Every 12 weeks", targetRange: "Diurnal pattern", unit: "ng/mL" },
    ],
    patients: [
      { id: "pt-003", name: "Aisha Patel", startDate: "2025-09-20", status: "Active", adherence: 88 },
      { id: "pt-012", name: "Kevin O'Brien", startDate: "2026-01-05", status: "Active", adherence: 76 },
      { id: "pt-018", name: "Sophia Anderson", startDate: "2025-11-01", status: "Active", adherence: 93 },
      { id: "pt-025", name: "Nathan Park", startDate: "2026-02-20", status: "Active", adherence: 84 },
    ],
  },
  inflammation: {
    id: "inflammation",
    name: "Inflammation Response",
    description: "TNF-alpha, IL-6, NF-kappaB modulation for chronic inflammatory cascades and immune regulation.",
    overview:
      "Chronic low-grade inflammation underlies many modern diseases. Genetic variants in TNF-alpha, IL-6, IL-1B, and NF-kappaB regulatory genes can predispose patients to exaggerated inflammatory responses. This protocol uses targeted anti-inflammatory nutrients to modulate cytokine production, inhibit NF-kappaB activation, and resolve inflammation while preserving appropriate immune function.",
    evidenceGrade: "A-",
    clinicalGoals: [
      "Reduce hs-CRP below 1.0 mg/L",
      "Modulate TNF-alpha and IL-6 production",
      "Inhibit NF-kappaB overactivation",
      "Support resolution of inflammation",
      "Optimize omega-3/omega-6 ratio",
    ],
    genes: ["TNF", "IL-6", "IL-1B", "NF-kB", "COX-2", "LOX-5"],
    supplements: [
      { name: "Curcumin (Meriva phytosome)", dose: "500-1,000 mg", timing: "Twice daily with meals", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "EPA/DHA (Fish Oil)", dose: "2,000-4,000 mg combined", timing: "With meals, divided", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Specialized Pro-Resolving Mediators (SPMs)", dose: "500-1,000 mg", timing: "Morning with food", duration: "12 weeks", evidenceLevel: "Moderate" },
      { name: "Quercetin (Phytosome)", dose: "500-1,000 mg", timing: "Twice daily", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Boswellia (AKBA standardized)", dose: "300-500 mg", timing: "Twice daily", duration: "12 weeks", evidenceLevel: "Moderate" },
    ],
    labMarkers: [
      { name: "hs-CRP", frequency: "Every 8 weeks", targetRange: "<1.0", unit: "mg/L" },
      { name: "ESR", frequency: "Every 12 weeks", targetRange: "0-20", unit: "mm/hr" },
      { name: "Omega-3 Index", frequency: "Every 16 weeks", targetRange: "8-12", unit: "%" },
      { name: "IL-6", frequency: "Every 12 weeks", targetRange: "<3.4", unit: "pg/mL" },
      { name: "TNF-alpha", frequency: "Every 12 weeks", targetRange: "<8.1", unit: "pg/mL" },
    ],
    patients: [
      { id: "pt-004", name: "Robert Williams", startDate: "2025-08-10", status: "Active", adherence: 91 },
      { id: "pt-007", name: "Sarah Mitchell", startDate: "2025-10-22", status: "Active", adherence: 86 },
      { id: "pt-011", name: "Lisa Thompson", startDate: "2025-12-01", status: "Active", adherence: 95 },
      { id: "pt-020", name: "Carlos Mendez", startDate: "2026-01-18", status: "Active", adherence: 79 },
      { id: "pt-026", name: "Priya Sharma", startDate: "2026-03-01", status: "Active", adherence: 88 },
    ],
  },
  "oxidative-stress": {
    id: "oxidative-stress",
    name: "Oxidative Stress",
    description: "SOD2, GPX1, and CAT support to enhance antioxidant defense systems and reduce oxidative damage.",
    overview:
      "Oxidative stress results from an imbalance between reactive oxygen species production and antioxidant defense capacity. Polymorphisms in SOD2, GPX1, CAT, and NRF2 genes impair the endogenous antioxidant system, increasing cellular damage. This protocol enhances both enzymatic and non-enzymatic antioxidant defenses while supporting the NRF2 pathway for coordinated antioxidant gene expression.",
    evidenceGrade: "B",
    clinicalGoals: [
      "Reduce oxidative damage biomarkers",
      "Enhance SOD and GPx enzyme activity",
      "Activate NRF2 antioxidant response",
      "Protect mitochondrial membranes",
      "Support cellular redox balance",
    ],
    genes: ["SOD2", "GPX1", "CAT", "NRF2", "GCLC", "NQO1"],
    supplements: [
      { name: "CoQ10 (Ubiquinol)", dose: "200-400 mg", timing: "Morning with fat-containing meal", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Selenium (Selenomethionine)", dose: "100-200 mcg", timing: "With meals", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Vitamin E (Mixed Tocopherols)", dose: "200-400 IU", timing: "With fat-containing meal", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Astaxanthin", dose: "4-12 mg", timing: "With fat-containing meal", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Sulforaphane", dose: "50-100 mg", timing: "Morning", duration: "12 weeks", evidenceLevel: "Strong" },
    ],
    labMarkers: [
      { name: "8-OHdG (urine)", frequency: "Every 12 weeks", targetRange: "<8.0", unit: "ng/mg Cr" },
      { name: "F2-Isoprostanes", frequency: "Every 16 weeks", targetRange: "<0.86", unit: "ng/mg Cr" },
      { name: "Glutathione (RBC)", frequency: "Every 12 weeks", targetRange: "800-1,200", unit: "umol/L" },
      { name: "CoQ10 (plasma)", frequency: "Every 16 weeks", targetRange: "0.5-1.5", unit: "ug/mL" },
    ],
    patients: [
      { id: "pt-006", name: "David Okafor", startDate: "2025-11-01", status: "Active", adherence: 80 },
      { id: "pt-014", name: "Rachel Kim", startDate: "2026-01-20", status: "Active", adherence: 89 },
      { id: "pt-023", name: "Mark Stevens", startDate: "2026-02-10", status: "Active", adherence: 92 },
    ],
  },
  "lipid-metabolism": {
    id: "lipid-metabolism",
    name: "Lipid Metabolism & Neuroprotection",
    description: "APOE, PCSK9 management for cardiovascular risk reduction and neurological protection strategies.",
    overview:
      "APOE genotype significantly influences lipid metabolism and neurodegeneration risk. APOE e4 carriers have increased LDL cholesterol, reduced amyloid-beta clearance, and elevated Alzheimer's risk. PCSK9 variants affect LDL receptor recycling. This protocol combines lipid management with neuroprotective strategies, emphasizing the unique dietary and supplementation needs of APOE e4 carriers.",
    evidenceGrade: "A",
    clinicalGoals: [
      "Optimize LDL-P below 1,000 nmol/L",
      "Support amyloid-beta clearance",
      "Enhance cerebral blood flow",
      "Reduce neuroinflammation",
      "Manage ApoB below 80 mg/dL",
    ],
    genes: ["APOE", "PCSK9", "LDLR", "CETP", "LPA", "APOB"],
    supplements: [
      { name: "Omega-3 (High DHA)", dose: "2,000-3,000 mg DHA", timing: "With meals, divided", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Phosphatidylcholine", dose: "420-840 mg", timing: "With meals", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Citicoline (CDP-Choline)", dose: "250-500 mg", timing: "Morning", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Lion's Mane (standardized)", dose: "500-1,000 mg", timing: "Twice daily", duration: "12 weeks", evidenceLevel: "Moderate" },
      { name: "Berberine", dose: "500 mg", timing: "Three times daily with meals", duration: "12 weeks, reassess", evidenceLevel: "Strong" },
    ],
    labMarkers: [
      { name: "ApoB", frequency: "Every 12 weeks", targetRange: "<80", unit: "mg/dL" },
      { name: "LDL-P (NMR)", frequency: "Every 12 weeks", targetRange: "<1,000", unit: "nmol/L" },
      { name: "Lp(a)", frequency: "Baseline + annually", targetRange: "<30", unit: "mg/dL" },
      { name: "hs-CRP", frequency: "Every 8 weeks", targetRange: "<1.0", unit: "mg/L" },
      { name: "Omega-3 Index", frequency: "Every 16 weeks", targetRange: "8-12", unit: "%" },
    ],
    patients: [
      { id: "pt-004", name: "Robert Williams", startDate: "2025-07-15", status: "Active", adherence: 94 },
      { id: "pt-013", name: "Margaret Chen", startDate: "2025-09-20", status: "Active", adherence: 91 },
      { id: "pt-021", name: "William Foster", startDate: "2026-01-10", status: "Active", adherence: 86 },
    ],
  },
  "vitamin-d": {
    id: "vitamin-d",
    name: "Vitamin D Function",
    description: "VDR, CYP2R1 optimization for calcium homeostasis, immune modulation, and gene transcription.",
    overview:
      "Vitamin D functions as a steroid hormone affecting over 200 genes via the vitamin D receptor (VDR). VDR polymorphisms (FokI, BsmI, TaqI, ApaI) and CYP2R1 variants affecting 25-hydroxylation can impair vitamin D signaling despite adequate serum levels. This protocol optimizes vitamin D status by addressing genetic barriers to activation, receptor sensitivity, and downstream gene expression, tailoring dosing to individual VDR genotype.",
    evidenceGrade: "A",
    clinicalGoals: [
      "Achieve 25(OH)D levels of 50-80 ng/mL",
      "Optimize VDR receptor activation",
      "Support calcium homeostasis",
      "Enhance innate immune function",
      "Maintain bone mineral density",
    ],
    genes: ["VDR", "CYP2R1", "CYP27B1", "GC", "CYP24A1", "DHCR7"],
    supplements: [
      { name: "Vitamin D3 (cholecalciferol)", dose: "5,000-10,000 IU", timing: "Morning with fat-containing meal", duration: "Ongoing, dose-adjusted", evidenceLevel: "Strong" },
      { name: "Vitamin K2 (MK-7)", dose: "100-200 mcg", timing: "With vitamin D3", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Magnesium Glycinate", dose: "200-400 mg elemental", timing: "Evening", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Boron", dose: "3-6 mg", timing: "With meals", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Zinc Picolinate", dose: "15-30 mg", timing: "With dinner", duration: "Ongoing", evidenceLevel: "Moderate" },
    ],
    labMarkers: [
      { name: "25(OH) Vitamin D", frequency: "Every 8 weeks initially, then 12", targetRange: "50-80", unit: "ng/mL" },
      { name: "1,25(OH)2 Vitamin D", frequency: "Every 16 weeks", targetRange: "18-72", unit: "pg/mL" },
      { name: "Calcium (ionized)", frequency: "Every 12 weeks", targetRange: "4.6-5.3", unit: "mg/dL" },
      { name: "PTH (intact)", frequency: "Every 12 weeks", targetRange: "15-65", unit: "pg/mL" },
      { name: "Magnesium (RBC)", frequency: "Every 12 weeks", targetRange: "5.0-7.0", unit: "mg/dL" },
    ],
    patients: [
      { id: "pt-002", name: "James Chen", startDate: "2025-06-01", status: "Active", adherence: 96 },
      { id: "pt-007", name: "Sarah Mitchell", startDate: "2025-08-15", status: "Active", adherence: 90 },
      { id: "pt-009", name: "Elena Rossi", startDate: "2025-11-20", status: "Active", adherence: 88 },
      { id: "pt-017", name: "Amanda Price", startDate: "2026-01-05", status: "Active", adherence: 93 },
      { id: "pt-024", name: "Derek Johnson", startDate: "2026-02-28", status: "Active", adherence: 85 },
    ],
  },
  "hormone-metabolism": {
    id: "hormone-metabolism",
    name: "Hormone Metabolism",
    description: "CYP19A1, SRD5A2, SHBG support for estrogen metabolism, androgen balance, and hormone clearance.",
    overview:
      "Hormone metabolism involves complex enzyme pathways for synthesis, conversion, and elimination. CYP19A1 (aromatase) converts androgens to estrogens, SRD5A2 converts testosterone to DHT, and SHBG regulates bioavailability. CYP1B1 and COMT influence estrogen metabolite ratios (2-OH, 4-OH, 16-alpha-OH), with clinical implications for hormone-sensitive conditions. This protocol optimizes hormone clearance and promotes favorable metabolite ratios.",
    evidenceGrade: "B+",
    clinicalGoals: [
      "Optimize 2:16-alpha hydroxyestrone ratio >2.0",
      "Reduce 4-hydroxyestrone production",
      "Support healthy SHBG levels",
      "Balance estrogen-androgen ratios",
      "Enhance hepatic hormone clearance",
    ],
    genes: ["CYP19A1", "SRD5A2", "SHBG", "CYP1B1", "COMT", "UGT1A1"],
    supplements: [
      { name: "DIM (Diindolylmethane)", dose: "100-200 mg", timing: "With meals", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "Calcium D-Glucarate", dose: "500-1,500 mg", timing: "Twice daily", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Sulforaphane", dose: "50-100 mg", timing: "Morning", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Chrysin", dose: "500-1,000 mg", timing: "Twice daily", duration: "12 weeks", evidenceLevel: "Limited" },
      { name: "Resveratrol", dose: "150-500 mg", timing: "With meals", duration: "12 weeks", evidenceLevel: "Moderate" },
    ],
    labMarkers: [
      { name: "Estrogen Metabolites (DUTCH)", frequency: "Every 12 weeks", targetRange: "2:16 ratio >2.0", unit: "ratio" },
      { name: "Free Testosterone", frequency: "Every 12 weeks", targetRange: "Gender-specific", unit: "pg/mL" },
      { name: "SHBG", frequency: "Every 12 weeks", targetRange: "20-80", unit: "nmol/L" },
      { name: "Estradiol", frequency: "Every 8 weeks", targetRange: "Gender/age-specific", unit: "pg/mL" },
      { name: "DHT", frequency: "Every 16 weeks", targetRange: "Gender-specific", unit: "ng/dL" },
    ],
    patients: [
      { id: "pt-007", name: "Sarah Mitchell", startDate: "2025-10-01", status: "Active", adherence: 87 },
      { id: "pt-015", name: "Jennifer Wu", startDate: "2026-01-15", status: "Active", adherence: 91 },
      { id: "pt-027", name: "Rebecca Martin", startDate: "2026-02-20", status: "Active", adherence: 83 },
    ],
  },
  "iron-metabolism": {
    id: "iron-metabolism",
    name: "Iron Metabolism",
    description: "HFE, TFR2 monitoring for iron absorption regulation, ferritin management, and hemochromatosis risk.",
    overview:
      "Iron metabolism is tightly regulated by hepcidin, ferroportin, and transferrin receptors. HFE gene mutations (C282Y, H63D) are the most common cause of hereditary hemochromatosis, leading to iron overload. Conversely, other genetic variants can impair iron absorption. This protocol monitors iron status closely and adjusts supplementation based on genotype, ferritin levels, and transferrin saturation to prevent both deficiency and overload.",
    evidenceGrade: "A-",
    clinicalGoals: [
      "Maintain ferritin 40-150 ng/mL (gender-adjusted)",
      "Keep transferrin saturation 20-45%",
      "Prevent iron overload in HFE carriers",
      "Optimize hemoglobin and hematocrit",
      "Support erythropoiesis cofactors",
    ],
    genes: ["HFE", "TFR2", "SLC40A1", "HAMP", "TMPRSS6", "HJV"],
    supplements: [
      { name: "Iron Bisglycinate", dose: "18-36 mg (if deficient)", timing: "On empty stomach or with vitamin C", duration: "Until repleted", evidenceLevel: "Strong" },
      { name: "Vitamin C", dose: "500-1,000 mg", timing: "With iron supplement", duration: "With iron course", evidenceLevel: "Strong" },
      { name: "Lactoferrin", dose: "200-300 mg", timing: "Morning on empty stomach", duration: "12 weeks", evidenceLevel: "Moderate" },
      { name: "Copper (if supplementing iron)", dose: "1-2 mg", timing: "Opposite meal from iron", duration: "With iron course", evidenceLevel: "Moderate" },
      { name: "IP6 (Inositol Hexaphosphate)", dose: "800-1,200 mg (if overloaded)", timing: "Between meals", duration: "As directed", evidenceLevel: "Limited" },
    ],
    labMarkers: [
      { name: "Ferritin", frequency: "Every 8 weeks", targetRange: "40-150", unit: "ng/mL" },
      { name: "Transferrin Saturation", frequency: "Every 8 weeks", targetRange: "20-45", unit: "%" },
      { name: "Serum Iron", frequency: "Every 12 weeks", targetRange: "60-170", unit: "ug/dL" },
      { name: "TIBC", frequency: "Every 12 weeks", targetRange: "250-370", unit: "ug/dL" },
      { name: "CBC with differential", frequency: "Every 8 weeks", targetRange: "Standard ranges", unit: "various" },
    ],
    patients: [
      { id: "pt-009", name: "Elena Rossi", startDate: "2025-12-10", status: "Active", adherence: 94 },
      { id: "pt-028", name: "Gregory Walsh", startDate: "2026-02-01", status: "Active", adherence: 88 },
    ],
  },
  histamine: {
    id: "histamine",
    name: "Histamine Metabolism",
    description: "DAO, HNMT, ABP1 support for histamine degradation, mast cell stabilization, and tolerance management.",
    overview:
      "Histamine intolerance results from an imbalance between histamine accumulation and degradation capacity. DAO (diamine oxidase) degrades extracellular histamine in the gut, while HNMT (histamine N-methyltransferase) handles intracellular histamine. Genetic variants reducing DAO or HNMT activity, combined with histamine-rich diets, medications that inhibit DAO, or gut dysbiosis, can cause symptoms mimicking allergic reactions without true IgE-mediated allergy.",
    evidenceGrade: "B",
    clinicalGoals: [
      "Enhance DAO enzyme activity",
      "Reduce histamine load from diet",
      "Stabilize mast cell degranulation",
      "Support HNMT intracellular clearance",
      "Identify and manage DAO-inhibiting medications",
    ],
    genes: ["DAO", "HNMT", "ABP1", "MTHFR", "MAO-A", "HDC"],
    supplements: [
      { name: "DAO Enzyme (supplemental)", dose: "10,000-20,000 HDU", timing: "15 min before histamine-containing meals", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Quercetin (Phytosome)", dose: "500-1,000 mg", timing: "Twice daily, 20 min before meals", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Vitamin C (buffered)", dose: "1,000-2,000 mg", timing: "Divided doses with meals", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Vitamin B6 (P5P)", dose: "50-100 mg", timing: "With meals", duration: "Ongoing", evidenceLevel: "Moderate" },
      { name: "Copper", dose: "1-2 mg", timing: "With meals (DAO cofactor)", duration: "Ongoing", evidenceLevel: "Limited" },
      { name: "Stinging Nettle Extract", dose: "300-600 mg", timing: "Twice daily", duration: "As needed seasonally", evidenceLevel: "Moderate" },
    ],
    labMarkers: [
      { name: "DAO Activity (serum)", frequency: "Every 12 weeks", targetRange: ">10", unit: "U/mL" },
      { name: "Histamine (plasma)", frequency: "Every 12 weeks", targetRange: "0.3-1.0", unit: "ng/mL" },
      { name: "Tryptase", frequency: "Baseline + as needed", targetRange: "<11.4", unit: "ng/mL" },
      { name: "Methylhistamine (urine)", frequency: "Every 16 weeks", targetRange: "<200", unit: "ug/g Cr" },
    ],
    patients: [
      { id: "pt-003", name: "Aisha Patel", startDate: "2025-11-05", status: "Active", adherence: 90 },
      { id: "pt-017", name: "Amanda Price", startDate: "2026-01-22", status: "Active", adherence: 86 },
      { id: "pt-029", name: "Claire Donovan", startDate: "2026-03-01", status: "Active", adherence: 82 },
    ],
  },
  "peptide-response": {
    id: "peptide-response",
    name: "Peptide Response (PeptideIQ\u2122)",
    description: "BPC-157, Thymosin optimization for tissue repair, immune modulation, and peptide therapy protocols.",
    overview:
      "Peptide therapy utilizes bioactive peptide sequences to activate specific receptor pathways for tissue repair, immune modulation, and metabolic optimization. BPC-157 (Body Protection Compound) promotes angiogenesis, tendon/ligament healing, and gut mucosal repair via VEGF and NO pathways. Thymosin alpha-1 supports immune function through T-cell maturation. Thymosin beta-4 promotes tissue repair and reduces inflammation. Individual genetic variation in growth hormone receptors, IGF-1 signaling, and EGF pathways influences peptide response profiles.",
    evidenceGrade: "B-",
    clinicalGoals: [
      "Optimize growth hormone axis signaling",
      "Support tissue repair and regeneration",
      "Enhance immune surveillance",
      "Improve gut mucosal integrity",
      "Modulate inflammatory response",
    ],
    genes: ["GHR", "IGF1R", "TMSB4X", "EGF", "VEGFA", "GH1"],
    supplements: [
      { name: "BPC-157 (oral stable)", dose: "250-500 mcg", timing: "Twice daily on empty stomach", duration: "4-8 weeks cycles", evidenceLevel: "Limited" },
      { name: "Thymosin Alpha-1", dose: "1.6 mg", timing: "Subcutaneous twice weekly", duration: "8-12 weeks", evidenceLevel: "Moderate" },
      { name: "Collagen Peptides (Type I/III)", dose: "10-20 g", timing: "30 min before exercise or morning", duration: "Ongoing", evidenceLevel: "Strong" },
      { name: "L-Glutamine", dose: "5-10 g", timing: "Twice daily on empty stomach", duration: "12 weeks", evidenceLevel: "Strong" },
      { name: "Zinc Carnosine", dose: "75 mg", timing: "Twice daily before meals", duration: "8 weeks", evidenceLevel: "Moderate" },
    ],
    labMarkers: [
      { name: "IGF-1", frequency: "Every 12 weeks", targetRange: "Age-adjusted optimal", unit: "ng/mL" },
      { name: "Growth Hormone (fasting)", frequency: "Every 16 weeks", targetRange: "0.4-10.0", unit: "ng/mL" },
      { name: "VEGF", frequency: "Every 16 weeks", targetRange: "<500", unit: "pg/mL" },
      { name: "Thymosin Alpha-1 Ab", frequency: "As needed", targetRange: "Negative", unit: "qualitative" },
      { name: "Intestinal Permeability (Zonulin)", frequency: "Every 12 weeks", targetRange: "<107", unit: "ng/mL" },
    ],
    patients: [
      { id: "pt-030", name: "Jason Miller", startDate: "2026-01-15", status: "Active", adherence: 78 },
      { id: "pt-031", name: "Stephanie Lee", startDate: "2026-02-10", status: "Active", adherence: 85 },
    ],
  },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getProtocol(id: string): ProtocolDetail | null {
  return PROTOCOL_DATA[id] ?? null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function adherenceBadge(adherence: number) {
  if (adherence >= 90) return <Badge variant="success">{adherence}%</Badge>
  if (adherence >= 80) return <Badge variant="warning">{adherence}%</Badge>
  return <Badge variant="destructive">{adherence}%</Badge>
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProtocolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const protocol = getProtocol(resolvedParams.id)

  if (!protocol) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-gray-300" />
        <p className="mt-4 text-lg font-medium text-gray-900">Protocol Not Found</p>
        <p className="mt-1 text-sm text-gray-500">
          The requested protocol does not exist.
        </p>
        <Link href="/protocols" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Back to Protocols
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div>
        <Link href="/protocols">
          <Button variant="ghost" size="sm" className="mb-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Protocols
          </Button>
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{protocol.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{protocol.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              Evidence Grade: {protocol.evidenceGrade}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              {protocol.patients.length} patients
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">
            <BookOpen className="mr-1.5 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="supplements">
            <Pill className="mr-1.5 h-4 w-4" />
            Supplements
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Activity className="mr-1.5 h-4 w-4" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="patients">
            <Users className="mr-1.5 h-4 w-4" />
            Patients
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Protocol Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {protocol.overview}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Key Genes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {protocol.genes.map((gene) => (
                      <Badge key={gene} variant="outline">
                        {gene}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Clinical Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {protocol.clinicalGoals.map((goal, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="text-sm text-gray-700">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Evidence Grade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                      <span className="text-lg font-bold text-emerald-600">
                        {protocol.evidenceGrade}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {protocol.evidenceGrade.startsWith("A")
                          ? "Strong Evidence"
                          : "Moderate Evidence"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Based on peer-reviewed literature and clinical trials
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Supplements Tab */}
        <TabsContent value="supplements">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended Supplements</CardTitle>
              <CardDescription>
                Dosing recommendations based on clinical evidence and genomic profile considerations.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplement</TableHead>
                    <TableHead>Dose</TableHead>
                    <TableHead className="hidden md:table-cell">Timing</TableHead>
                    <TableHead className="hidden lg:table-cell">Duration</TableHead>
                    <TableHead>Evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocol.supplements.map((supp, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-gray-900">
                        {supp.name}
                      </TableCell>
                      <TableCell className="text-gray-700">{supp.dose}</TableCell>
                      <TableCell className="hidden text-gray-600 md:table-cell">
                        {supp.timing}
                      </TableCell>
                      <TableCell className="hidden text-gray-600 lg:table-cell">
                        {supp.duration}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            supp.evidenceLevel === "Strong"
                              ? "success"
                              : supp.evidenceLevel === "Moderate"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {supp.evidenceLevel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lab Markers & Monitoring</CardTitle>
              <CardDescription>
                Recommended laboratory markers, testing frequency, and target ranges for protocol monitoring.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marker</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Target Range</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocol.labMarkers.map((marker, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-gray-900">
                        {marker.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {marker.frequency}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-emerald-700">
                          {marker.targetRange}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500">{marker.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patients Tab */}
        <TabsContent value="patients">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patients on Protocol</CardTitle>
              <CardDescription>
                {protocol.patients.length} patient{protocol.patients.length !== 1 ? "s" : ""} currently enrolled in this protocol.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Adherence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocol.patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium text-gray-900">
                        {patient.name}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(patient.startDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">{patient.status}</Badge>
                      </TableCell>
                      <TableCell>{adherenceBadge(patient.adherence)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
