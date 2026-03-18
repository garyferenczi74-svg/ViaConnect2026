import {
  LayoutDashboard,
  Users,
  Dna,
  FlaskConical,
  FileText,
  ShieldCheck,
  GraduationCap,
  Settings,
  Activity,
  Pill,
  HeartPulse,
  Brain,
  Flame,
  Zap,
  Droplets,
  Bug,
  Microscope,
  type LucideIcon,
} from "lucide-react";
import {
  ClinicalPathway,
  Specialty,
  MembershipTier,
} from "@/types";

// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
  children?: NavItem[];
}

export const MAIN_NAV: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and key metrics",
  },
  {
    title: "Patients",
    href: "/dashboard/patients",
    icon: Users,
    description: "Patient management and records",
  },
  {
    title: "Genomics",
    href: "/dashboard/genomics",
    icon: Dna,
    description: "Genomic data analysis and reports",
  },
  {
    title: "Interactions",
    href: "/dashboard/interactions",
    icon: FlaskConical,
    description: "Drug and supplement interaction checker",
  },
  {
    title: "Protocols",
    href: "/dashboard/protocols",
    icon: FileText,
    description: "Clinical protocol builder",
  },
  {
    title: "Pathways",
    href: "/dashboard/pathways",
    icon: Activity,
    description: "Clinical pathway analysis",
  },
  {
    title: "CME",
    href: "/dashboard/cme",
    icon: GraduationCap,
    description: "Continuing medical education credits",
  },
  {
    title: "EHR Integration",
    href: "/dashboard/ehr",
    icon: ShieldCheck,
    description: "Electronic health record connections",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    description: "Account and practice settings",
  },
];

// ─── Clinical Pathways ──────────────────────────────────────────────────────

export interface PathwayInfo {
  id: ClinicalPathway;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  keyGenes: string[];
}

export const CLINICAL_PATHWAYS: PathwayInfo[] = [
  {
    id: ClinicalPathway.Methylation,
    label: "Methylation",
    description:
      "MTHFR, MTR, MTRR and related methylation cycle variants affecting folate metabolism and homocysteine levels.",
    icon: Dna,
    color: "emerald",
    keyGenes: ["MTHFR", "MTR", "MTRR", "COMT", "MAT1A", "AHCY"],
  },
  {
    id: ClinicalPathway.Detoxification,
    label: "Detoxification",
    description:
      "Phase I and Phase II detoxification enzyme polymorphisms impacting xenobiotic clearance.",
    icon: FlaskConical,
    color: "blue",
    keyGenes: ["CYP1A2", "CYP2D6", "CYP2C19", "CYP3A4", "GST", "NAT2", "UGT1A1"],
  },
  {
    id: ClinicalPathway.Inflammation,
    label: "Inflammation",
    description:
      "Inflammatory cytokine gene variants and NF-kB pathway polymorphisms driving chronic inflammation.",
    icon: Flame,
    color: "orange",
    keyGenes: ["TNF", "IL6", "IL1B", "CRP", "NFKB1"],
  },
  {
    id: ClinicalPathway.OxidativeStress,
    label: "Oxidative Stress",
    description:
      "Antioxidant defense system variants including SOD, catalase, and glutathione pathway genes.",
    icon: Zap,
    color: "yellow",
    keyGenes: ["SOD2", "CAT", "GPX1", "NRF2", "GCLC", "GCLM"],
  },
  {
    id: ClinicalPathway.Neurotransmitter,
    label: "Neurotransmitter",
    description:
      "Serotonin, dopamine, GABA, and catecholamine synthesis and metabolism gene variants.",
    icon: Brain,
    color: "purple",
    keyGenes: ["COMT", "MAO-A", "MAO-B", "TPH2", "SLC6A4", "BDNF", "GAD1"],
  },
  {
    id: ClinicalPathway.Cardiovascular,
    label: "Cardiovascular",
    description:
      "Lipid metabolism, coagulation factors, and vascular function gene polymorphisms.",
    icon: HeartPulse,
    color: "red",
    keyGenes: ["APOE", "APOB", "LDLR", "PCSK9", "F5", "F2", "ACE", "AGT"],
  },
  {
    id: ClinicalPathway.Mitochondrial,
    label: "Mitochondrial",
    description:
      "Electron transport chain, CoQ10 synthesis, and mitochondrial biogenesis gene variants.",
    icon: Zap,
    color: "amber",
    keyGenes: ["NDUFS1", "COQ2", "PPARGC1A", "TFAM", "MT-ND1"],
  },
  {
    id: ClinicalPathway.Hormonal,
    label: "Hormonal",
    description:
      "Steroid hormone synthesis, metabolism, and receptor sensitivity gene polymorphisms.",
    icon: Activity,
    color: "pink",
    keyGenes: ["CYP19A1", "CYP17A1", "SRD5A2", "ESR1", "AR", "HSD17B1"],
  },
  {
    id: ClinicalPathway.Immune,
    label: "Immune",
    description:
      "HLA complex, innate immunity, and adaptive immune response gene variants.",
    icon: ShieldCheck,
    color: "teal",
    keyGenes: ["HLA-DQ2", "HLA-DQ8", "TLR4", "IL10", "CTLA4", "FOXP3"],
  },
  {
    id: ClinicalPathway.GutMicrobiome,
    label: "Gut Microbiome",
    description:
      "Genes affecting gut barrier integrity, bile acid metabolism, and microbial interaction.",
    icon: Bug,
    color: "green",
    keyGenes: ["FUT2", "NOD2", "ATG16L1", "MUC2", "OCLN"],
  },
  {
    id: ClinicalPathway.Lipid,
    label: "Lipid Metabolism",
    description:
      "Fatty acid desaturation, cholesterol transport, and lipid signaling gene variants.",
    icon: Droplets,
    color: "sky",
    keyGenes: ["FADS1", "FADS2", "APOE", "CETP", "LIPC", "LPL"],
  },
  {
    id: ClinicalPathway.GlucoseMetabolism,
    label: "Glucose Metabolism",
    description:
      "Insulin signaling, glucose transport, and glycemic regulation gene polymorphisms.",
    icon: Microscope,
    color: "indigo",
    keyGenes: ["TCF7L2", "PPARG", "IRS1", "SLC2A2", "GCK", "KCNJ11"],
  },
];

// ─── Specialty Options ───────────────────────────────────────────────────────

export interface SpecialtyOption {
  value: Specialty;
  label: string;
  credential?: string;
}

export const SPECIALTY_OPTIONS: SpecialtyOption[] = [
  { value: Specialty.FunctionalMedicine, label: "Functional Medicine" },
  { value: Specialty.IntegrativeMedicine, label: "Integrative Medicine" },
  { value: Specialty.Naturopathic, label: "Naturopathic Medicine" },
  { value: Specialty.InternalMedicine, label: "Internal Medicine" },
  { value: Specialty.FamilyMedicine, label: "Family Medicine" },
  { value: Specialty.Endocrinology, label: "Endocrinology" },
  { value: Specialty.Cardiology, label: "Cardiology" },
  { value: Specialty.Neurology, label: "Neurology" },
  { value: Specialty.Oncology, label: "Oncology" },
  { value: Specialty.Psychiatry, label: "Psychiatry" },
  { value: Specialty.Gastroenterology, label: "Gastroenterology" },
  { value: Specialty.Rheumatology, label: "Rheumatology" },
  { value: Specialty.RegisteredDietitian, label: "Registered Dietitian", credential: "RD" },
  { value: Specialty.ClinicalPharmacology, label: "Clinical Pharmacology" },
  { value: Specialty.Dermatology, label: "Dermatology" },
  { value: Specialty.Other, label: "Other" },
];

// ─── Membership Tiers ────────────────────────────────────────────────────────

export interface TierInfo {
  id: MembershipTier;
  label: string;
  description: string;
  price: number | null;
  priceLabel: string;
  features: string[];
  patientLimit: number | null;
  highlighted?: boolean;
}

export const MEMBERSHIP_TIERS: TierInfo[] = [
  {
    id: MembershipTier.Free,
    label: "Free",
    description: "Get started with basic genomic tools",
    price: 0,
    priceLabel: "Free forever",
    patientLimit: 5,
    features: [
      "Up to 5 patient profiles",
      "Basic SNP lookup",
      "Drug interaction checker",
      "Community forum access",
    ],
  },
  {
    id: MembershipTier.Professional,
    label: "Professional",
    description: "Full-featured precision health toolkit",
    price: 149,
    priceLabel: "$149/month",
    patientLimit: null,
    highlighted: true,
    features: [
      "Unlimited patient profiles",
      "Full pathway analysis (12 pathways)",
      "Automated protocol generation",
      "Drug-supplement interaction engine",
      "CME credit tracking",
      "PDF report generation",
      "Priority support",
    ],
  },
  {
    id: MembershipTier.Enterprise,
    label: "Enterprise",
    description: "Multi-practitioner practices and clinics",
    price: null,
    priceLabel: "Custom pricing",
    patientLimit: null,
    features: [
      "Everything in Professional",
      "Multi-practitioner accounts",
      "EHR integration (Epic, Cerner, etc.)",
      "Custom branding",
      "Dedicated account manager",
      "HIPAA BAA included",
      "Audit log and compliance tools",
      "API access",
    ],
  },
  {
    id: MembershipTier.Academic,
    label: "Academic",
    description: "For teaching institutions and researchers",
    price: 49,
    priceLabel: "$49/month",
    patientLimit: 50,
    features: [
      "Up to 50 patient profiles",
      "Full pathway analysis",
      "Teaching mode with annotations",
      "Bulk data import for research",
      "Institutional verification required",
    ],
  },
];

// ─── Application Constants ───────────────────────────────────────────────────

export const APP_NAME = "ViaConnect" as const;
export const APP_DESCRIPTION =
  "Precision health platform for healthcare professionals" as const;
export const SUPPORT_EMAIL = "support@viaconnect.health" as const;

export const ITEMS_PER_PAGE = 20 as const;
export const MAX_FILE_SIZE_MB = 50 as const;
export const ACCEPTED_GENOMIC_FILE_TYPES = [
  ".vcf",
  ".vcf.gz",
  ".txt",
  ".csv",
  ".23andme",
] as const;

export const RISK_LEVEL_COLORS = {
  low: "text-emerald-600 dark:text-emerald-400",
  moderate: "text-amber-600 dark:text-amber-400",
  high: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
} as const;

export const INTERACTION_SEVERITY_COLORS = {
  none: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  mild: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  moderate: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  severe: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  contraindicated: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
} as const;
