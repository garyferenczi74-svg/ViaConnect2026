// ─── Enums ────────────────────────────────────────────────────────────────────

export enum Specialty {
  FunctionalMedicine = "functional_medicine",
  IntegrativeMedicine = "integrative_medicine",
  Naturopathic = "naturopathic",
  InternalMedicine = "internal_medicine",
  FamilyMedicine = "family_medicine",
  Endocrinology = "endocrinology",
  Cardiology = "cardiology",
  Neurology = "neurology",
  Oncology = "oncology",
  Psychiatry = "psychiatry",
  Gastroenterology = "gastroenterology",
  Rheumatology = "rheumatology",
  RegisteredDietitian = "registered_dietitian",
  ClinicalPharmacology = "clinical_pharmacology",
  Dermatology = "dermatology",
  Other = "other",
}

export enum CredentialType {
  MD = "MD",
  DO = "DO",
  ND = "ND",
  RD = "RD",
  PharmD = "PharmD",
  PhD = "PhD",
  NP = "NP",
  PA = "PA",
  DC = "DC",
  LAc = "LAc",
}

export enum ClinicalPathway {
  Methylation = "methylation",
  Detoxification = "detoxification",
  Inflammation = "inflammation",
  OxidativeStress = "oxidative_stress",
  Neurotransmitter = "neurotransmitter",
  Cardiovascular = "cardiovascular",
  Mitochondrial = "mitochondrial",
  Hormonal = "hormonal",
  Immune = "immune",
  GutMicrobiome = "gut_microbiome",
  Lipid = "lipid",
  GlucoseMetabolism = "glucose_metabolism",
}

export enum MembershipTier {
  Free = "free",
  Professional = "professional",
  Enterprise = "enterprise",
  Academic = "academic",
}

export enum InteractionSeverity {
  None = "none",
  Mild = "mild",
  Moderate = "moderate",
  Severe = "severe",
  Contraindicated = "contraindicated",
}

export enum RiskLevel {
  Low = "low",
  Moderate = "moderate",
  High = "high",
  Critical = "critical",
}

export enum AuditAction {
  Login = "login",
  Logout = "logout",
  ViewPatient = "view_patient",
  EditPatient = "edit_patient",
  ViewGenomics = "view_genomics",
  GenerateProtocol = "generate_protocol",
  ExportReport = "export_report",
  UpdateSettings = "update_settings",
  InviteUser = "invite_user",
  AccessEHR = "access_ehr",
}

export enum EHRSystem {
  Epic = "epic",
  Cerner = "cerner",
  Allscripts = "allscripts",
  Athenahealth = "athenahealth",
  DrChrono = "drchrono",
  eClinicalWorks = "eclinicalworks",
  Custom = "custom",
}

// ─── Core Types ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  email_verified: boolean;
  role: "practitioner" | "admin" | "support";
}

export interface Practitioner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  credentials: CredentialType[];
  specialty: Specialty;
  sub_specialties: Specialty[];
  npi_number: string;
  license_state: string;
  license_number: string;
  practice_name: string;
  practice_address: string;
  phone: string;
  bio: string | null;
  avatar_url: string | null;
  membership_tier: MembershipTier;
  is_verified: boolean;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  practitioner_id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: "male" | "female" | "other";
  ethnicity: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  conditions: string[];
  current_medications: Medication[];
  current_supplements: Supplement[];
  allergies: string[];
  genomic_data_ref: string | null;
  genomic_provider: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  rxnorm_code: string | null;
  prescribing_provider: string | null;
  start_date: string | null;
}

export interface Supplement {
  name: string;
  dosage: string;
  frequency: string;
  brand: string | null;
  form: string | null;
}

// ─── Genomics ─────────────────────────────────────────────────────────────────

export interface GenomicResult {
  id: string;
  patient_id: string;
  provider: string;
  upload_date: string;
  snps: SNPData[];
  pathway_scores: PathwayScore[];
  raw_data_url: string | null;
  report_url: string | null;
  status: "processing" | "complete" | "error";
}

export interface SNPData {
  rsid: string;
  gene: string;
  chromosome: string;
  position: number;
  genotype: string;
  reference_allele: string;
  variant_allele: string;
  clinical_significance: "benign" | "likely_benign" | "uncertain" | "likely_pathogenic" | "pathogenic";
  associated_pathways: ClinicalPathway[];
  phenotype_summary: string | null;
}

export interface PathwayScore {
  pathway: ClinicalPathway;
  score: number; // 0-100
  risk_level: RiskLevel;
  contributing_snps: string[]; // rsids
  summary: string;
  recommendations: string[];
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export interface DrugInteraction {
  id: string;
  drug_a: string;
  drug_b: string;
  severity: InteractionSeverity;
  mechanism: string;
  clinical_effect: string;
  recommendation: string;
  evidence_level: "strong" | "moderate" | "limited" | "theoretical";
  references: string[];
  gene_interactions: string[];
}

export interface SupplementInteraction {
  id: string;
  supplement: string;
  interacting_substance: string;
  substance_type: "drug" | "supplement" | "food" | "condition";
  severity: InteractionSeverity;
  mechanism: string;
  clinical_effect: string;
  recommendation: string;
  evidence_level: "strong" | "moderate" | "limited" | "theoretical";
  references: string[];
}

// ─── Clinical Protocols ───────────────────────────────────────────────────────

export interface ClinicalProtocol {
  id: string;
  practitioner_id: string;
  patient_id: string;
  pathway: ClinicalPathway;
  title: string;
  description: string;
  status: "draft" | "active" | "completed" | "archived";
  interventions: Intervention[];
  goals: ProtocolGoal[];
  duration_weeks: number;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Intervention {
  type: "supplement" | "medication" | "dietary" | "lifestyle" | "lab_test";
  name: string;
  description: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  priority: "essential" | "recommended" | "optional";
  evidence_references: string[];
}

export interface ProtocolGoal {
  description: string;
  target_metric: string | null;
  target_value: string | null;
  current_value: string | null;
  status: "pending" | "in_progress" | "achieved" | "not_achieved";
}

// ─── CME ──────────────────────────────────────────────────────────────────────

export interface CMECredit {
  id: string;
  practitioner_id: string;
  title: string;
  description: string;
  category: "pharmacogenomics" | "nutrigenomics" | "clinical_pathways" | "interactions" | "general";
  credits: number;
  accrediting_body: string;
  completion_date: string;
  expiration_date: string | null;
  certificate_url: string | null;
  verified: boolean;
}

// ─── EHR Integration ─────────────────────────────────────────────────────────

export interface EHRIntegration {
  id: string;
  practitioner_id: string;
  system: EHRSystem;
  facility_name: string;
  endpoint_url: string;
  client_id: string;
  is_active: boolean;
  last_sync: string | null;
  sync_frequency: "realtime" | "hourly" | "daily" | "manual";
  data_permissions: EHRDataPermission[];
  created_at: string;
  updated_at: string;
}

export interface EHRDataPermission {
  resource_type: string;
  read: boolean;
  write: boolean;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  ip_address: string;
  user_agent: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
