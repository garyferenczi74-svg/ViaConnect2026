// Shared types across all three portals

export interface GeneVariant {
  gene: string;
  rsid: string;
  genotype: string;
  impact: "beneficial" | "neutral" | "risk";
  category: string;
  description: string;
}

export interface SupplementRecommendation {
  name: string;
  dosage: string;
  frequency: string;
  reason: string;
  genes: string[];
  priority: "essential" | "recommended" | "optional";
}

export interface HealthReport {
  id: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  status: "complete" | "pending" | "in-review";
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  dob: string;
  lastVisit: string;
  status: "active" | "inactive" | "pending";
  conditions: string[];
  snpsAnalyzed: number;
}

export interface Protocol {
  id: string;
  name: string;
  patientId: string;
  patientName: string;
  supplements: SupplementRecommendation[];
  createdDate: string;
  status: "active" | "draft" | "completed";
  notes: string;
}

export interface HerbalFormulation {
  id: string;
  name: string;
  herbs: { name: string; amount: string; form: string }[];
  indication: string;
  contraindications: string[];
  geneTargets: string[];
  createdDate: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export type PortalType = "wellness" | "practitioner" | "naturopath";
