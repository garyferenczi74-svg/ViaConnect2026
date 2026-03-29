// Analytics category definitions

export interface AnalyticsCategory {
  id: string;
  name: string;
  icon: string;
  score: number;
  trend: "improving" | "stable" | "declining";
  trendDelta: number;
  lastUpdated: string;
  insightCount: number;
  isNew: boolean;
  dataCompleteness: number;
  insights: { id: string; text: string; severity: "positive" | "neutral" | "warning" | "critical" }[];
  recommendations: { action: string; description: string; priority: "high" | "medium" | "low" }[];
}

export const INITIAL_CATEGORIES: Omit<AnalyticsCategory, "score" | "trend" | "trendDelta" | "lastUpdated" | "insightCount" | "isNew" | "dataCompleteness" | "insights" | "recommendations">[] = [
  { id: "nutrient_profile", name: "Nutrient Profile", icon: "\ud83e\uddea" },
  { id: "symptom_landscape", name: "Symptom Landscape", icon: "\ud83d\udcca" },
  { id: "risk_radar", name: "Risk Radar", icon: "\ud83c\udfaf" },
  { id: "medication_intel", name: "Medication Intelligence", icon: "\ud83d\udc8a" },
  { id: "protocol_effectiveness", name: "Protocol Effectiveness", icon: "\ud83d\udcc8" },
  { id: "sleep_recovery", name: "Sleep & Recovery", icon: "\ud83c\udf19" },
  { id: "stress_mood", name: "Stress & Mood", icon: "\ud83e\udde0" },
  { id: "metabolic_health", name: "Metabolic Health", icon: "\u2696\ufe0f" },
  { id: "immune_inflammation", name: "Immune & Inflammation", icon: "\ud83d\udee1\ufe0f" },
  { id: "bio_optimization_trends", name: "Bio Optimization Trends", icon: "\ud83d\udcc9" },
];

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-teal-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-yellow-400";
  if (score >= 20) return "text-orange-400";
  return "text-red-400";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-teal-400";
  if (score >= 60) return "bg-blue-400";
  if (score >= 40) return "bg-yellow-400";
  if (score >= 20) return "bg-orange-400";
  return "bg-red-400";
}
