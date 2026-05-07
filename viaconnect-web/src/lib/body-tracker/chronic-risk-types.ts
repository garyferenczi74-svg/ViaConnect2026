// Type definitions for the body_tracker_chronic_risk surface.
// Spec: Prompt #85c §8.1 Chronic Risk Tracking.
//
// CRITICAL: this surface is INFORMATIONAL ONLY. Arnold never diagnoses or
// prescribes. Severity buckets and risk scores describe input-indicator
// counts, not clinical risk. UI copy should always use the phrase
// "areas to discuss with your healthcare provider".

export type RiskSeverity = 'None' | 'Low' | 'Moderate' | 'High';
export type RiskTrend = 'up' | 'down' | 'stable';
export type ChronicRiskDataSource =
  | 'body_tracker'
  | 'caq'
  | 'genex360'
  | 'lab_results';

export interface TrackedCondition {
  name: string;
  riskScore: number;
  severity: RiskSeverity;
  trend: RiskTrend;
  trendData?: number[];
  indicators?: string[];
}

export interface ChronicRiskAssessment {
  id: string;
  user_id: string;
  assessment_date: string;
  overall_score: number | null;
  overall_grade: string | null;
  conditions: TrackedCondition[];
  data_sources_used: ChronicRiskDataSource[];
  arnold_summary: string | null;
  created_at: string;
}

export function severityFromScore(score: number): RiskSeverity {
  if (score <= 0) return 'None';
  if (score <= 25) return 'Low';
  if (score <= 50) return 'Moderate';
  return 'High';
}

export function gradeFromOverallScore(score: number): string {
  // Higher overall_score is healthier per spec §8.1.
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D+';
  if (score >= 45) return 'D';
  return 'F';
}
