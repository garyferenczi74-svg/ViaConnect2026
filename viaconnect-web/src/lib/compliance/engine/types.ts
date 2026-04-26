/**
 * Marshall — Compliance Officer Agent (Prompt #119)
 * Shared type surface for the rule registry, rule engine, and finding contract.
 * Identical shape flows across runtime Marshall and Claude Code Marshall.
 */

export type Severity = "P0" | "P1" | "P2" | "P3" | "ADVISORY";

export type Pillar =
  | "CLAIMS"
  | "PEPTIDE"
  | "GENETIC"
  | "PRACTITIONER"
  | "MAP"
  | "COMMS"
  | "PRIVACY"
  | "BRAND"
  | "AUDIT"
  // Prompt #124: counterfeit detection lives in its own pillar so takedown
  // workflows can filter findings by rule namespace without a string match.
  | "COUNTERFEIT"
  // Prompts #138a + #138c + #138d: homepage hero variants, trust band content,
  // and composite case-study walkthroughs share a marketing-specific rule
  // namespace MARSHALL.MARKETING.* so conversion-stack content can be filtered
  // and gated independently from product/practitioner copy.
  | "MARKETING";

export type Surface =
  | "source_code"
  | "migration"
  | "product_db"
  | "content_cms"
  | "user_content"
  | "ai_output"
  | "checkout"
  | "email"
  | "sms"
  | "marketing_page"
  // Prompt #121: proactive pre-check surface. Same rule evaluators,
  // tighter confidence gates, cooperative coaching tone.
  | "precheck_draft"
  // Prompt #124: suspect product images evaluated by Marshall Vision.
  | "product_image"
  // Prompts #138a + #138c + #138d: homepage hero variants, trust band copy,
  // and Sarah Scenario composite case-study copy. Distinct from
  // 'marketing_page' (which gates the whole landing page surface) — this
  // surface is for the per-row variant/clinician-card/copy-block content
  // that flows through the marketing_copy_variants lifecycle gate.
  | "marketing_copy"
  // Prompt #123: surface for Marshall's drafted rebuttal responses to
  // practitioner appeals. Same rule evaluators run against the draft text
  // before it reaches Steve so a defense of (e.g.) a disease-claim finding
  // cannot accidentally itself contain disease-claim language.
  | "rebuttal_draft";

export type FindingSource = "claude_code" | "runtime";

export type EscalationTarget =
  | "steve_rica"
  | "gary"
  | "fadi"
  | "domenic"
  | "thomas";

export interface FindingLocation {
  filePath?: string;
  line?: number;
  column?: number;
  dbTable?: string;
  dbRowId?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  agent?: string;
}

export interface Remediation {
  kind: "auto" | "suggested" | "manual";
  action?: string;
  summary: string;
  autoPatch?: string;
}

export interface Escalation {
  to: EscalationTarget[];
  slaMinutes: number;
}

export interface Finding {
  findingId: string;
  ruleId: string;
  severity: Severity;
  surface: Surface;
  source: FindingSource;
  location: FindingLocation;
  excerpt: string;
  message: string;
  citation: string;
  remediation: Remediation;
  escalation?: Escalation;
  createdAt: string;
}

// TInput defaults to `any` so aggregate arrays (Rule[]) can hold the full
// heterogeneous rule set without each caller having to re-cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Rule<TInput = any> {
  id: string;
  pillar: Pillar;
  severity: Severity;
  surfaces: Surface[];
  citation: string;
  description: string;
  evaluate: (input: TInput, ctx?: EvaluationContext) => Finding[] | Promise<Finding[]>;
  autoRemediate?: (input: TInput, finding: Finding) => Promise<TInput>;
  lastReviewed: string;
}

export interface EvaluationContext {
  surface: Surface;
  source: FindingSource;
  location?: FindingLocation;
  userRole?: string;
  jurisdiction?: string;
  now?: Date;
}

export interface EngineInput {
  surface: Surface;
  source: FindingSource;
  location?: FindingLocation;
  userRole?: string;
  jurisdiction?: string;
  content?: string;
  sku?: { id: string; name: string; description?: string; category?: string };
  cart?: Array<{ sku: string; category: string }>;
  aiOutput?: { agent: string; text: string };
  email?: { subject: string; body: string; hasUnsubLink: boolean; hasPhysicalAddress: boolean };
}

export interface EngineResult {
  findings: Finding[];
  durationMs: number;
  rulesEvaluated: number;
  highestSeverity: Severity | null;
}

// Utility: generate a stable human-readable finding ID.
// Format: M-YYYY-MMDD-NNNN (N is a 4-char random suffix, lightweight collision avoidance).
export function generateFindingId(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const suffix = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  return `M-${yyyy}-${mm}${dd}-${suffix}`;
}

// Utility: redacted excerpt around a hit — caps at 200 chars, centered on the hit.
export function redactExcerpt(text: string, index: number, radius: number = 100): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  const slice = text.slice(start, end).replace(/\s+/g, " ").trim();
  return (start > 0 ? "..." : "") + slice + (end < text.length ? "..." : "");
}

// Compare severities: higher index = higher severity.
const SEVERITY_ORDER: Severity[] = ["ADVISORY", "P3", "P2", "P1", "P0"];
export function severityRank(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s);
}
export function highestSeverity(list: Severity[]): Severity | null {
  if (list.length === 0) return null;
  return list.reduce((acc, s) => (severityRank(s) > severityRank(acc) ? s : acc));
}
