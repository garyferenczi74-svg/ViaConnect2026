// Dashboard Sidebar Section Config
// Each entry maps to a scrollable section on the dashboard

export interface DashboardSidebarSection {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  scrollTarget: string;
  alwaysVisible: boolean;
  visibilityCondition?: string;
  description?: string;
  group: "overview" | "protocols" | "insights";
}

export const DASHBOARD_SIDEBAR_SECTIONS: DashboardSidebarSection[] = [
  {
    id: "bio-optimization-score",
    label: "Bio Optimization Score",
    shortLabel: "Bio Score",
    icon: "Gauge",
    scrollTarget: "#bio-optimization-score",
    alwaysVisible: true,
    group: "overview",
  },
  {
    id: "daily-scores",
    label: "Daily Scores",
    shortLabel: "Daily Scores",
    icon: "BarChart3",
    scrollTarget: "#daily-scores",
    alwaysVisible: true,
    group: "overview",
  },
  {
    id: "health-intelligence",
    label: "Health Intelligence",
    shortLabel: "Intelligence",
    icon: "BrainCircuit",
    scrollTarget: "#health-intelligence",
    alwaysVisible: true,
    group: "overview",
  },
  {
    id: "supplement-protocol",
    label: "Supplement Protocol",
    shortLabel: "Supplements",
    icon: "Pill",
    scrollTarget: "#supplement-protocol",
    alwaysVisible: true,
    description: "GeneX360\u2122 nutraceuticals",
    group: "protocols",
  },
  {
    id: "peptide-protocol",
    label: "Peptide Protocol",
    shortLabel: "Peptides",
    icon: "FlaskConical",
    scrollTarget: "#peptide-protocol",
    alwaysVisible: false,
    visibilityCondition: "caqCompleted",
    description: "FarmCeutica\u2122 peptides",
    group: "protocols",
  },
  {
    id: "genetics-section",
    label: "Genetics",
    shortLabel: "Genetics",
    icon: "Dna",
    scrollTarget: "#genetics-section",
    alwaysVisible: true,
    group: "insights",
  },
  {
    id: "wellness-analytics",
    label: "Wellness Analytics",
    shortLabel: "Analytics",
    icon: "LineChart",
    scrollTarget: "#wellness-analytics",
    alwaysVisible: true,
    group: "insights",
  },
];
