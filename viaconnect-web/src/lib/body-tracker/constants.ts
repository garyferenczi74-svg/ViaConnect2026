// Body Tracker — Score weights, tier thresholds, grade boundaries.

import type { BodyScoreTier, MilestoneGrade } from './types';

// Body Score composite weights (sum = 1.0)
export const BODY_SCORE_WEIGHTS = {
  composition: 0.25,
  weightManagement: 0.20,
  muscleHealth: 0.20,
  cardiovascular: 0.20,
  metabolic: 0.15,
} as const;

// Body Score tier thresholds (0-1000 scale)
export const TIER_THRESHOLDS: Array<{ min: number; tier: BodyScoreTier }> = [
  { min: 800, tier: 'Optimal' },
  { min: 600, tier: 'Good' },
  { min: 400, tier: 'Developing' },
  { min: 200, tier: 'Needs Attention' },
  { min: 0,   tier: 'Critical' },
];

export const TIER_COLORS: Record<BodyScoreTier, string> = {
  Optimal:          '#22C55E',
  Good:             '#2DA5A0',
  Developing:       '#F59E0B',
  'Needs Attention': '#B75E18',
  Critical:         '#EF4444',
};

// Grade boundaries (percentage of expected performance)
export const GRADE_THRESHOLDS: Array<{ min: number; grade: MilestoneGrade }> = [
  { min: 95, grade: 'A+' },
  { min: 90, grade: 'A' },
  { min: 85, grade: 'A-' },
  { min: 80, grade: 'B+' },
  { min: 75, grade: 'B' },
  { min: 70, grade: 'B-' },
  { min: 65, grade: 'C+' },
  { min: 60, grade: 'C' },
  { min: 55, grade: 'C-' },
  { min: 40, grade: 'D' },
  { min: 0,  grade: 'F' },
];

// Gauge gradient stops (0-1000)
export const GAUGE_GRADIENT_STOPS = [
  { offset: 0,    color: '#EF4444' }, // red
  { offset: 0.2,  color: '#F59E0B' }, // orange
  { offset: 0.4,  color: '#EAB308' }, // yellow
  { offset: 0.6,  color: '#84CC16' }, // lime
  { offset: 0.8,  color: '#22C55E' }, // green
  { offset: 1.0,  color: '#2DA5A0' }, // teal
];

// Tab definitions
export const BODY_TRACKER_TABS = [
  { id: 'dashboard',   label: 'Dashboard',   href: '/body-tracker' },
  { id: 'composition', label: 'Composition', href: '/body-tracker/composition' },
  { id: 'weight',      label: 'Weight',      href: '/body-tracker/weight' },
  { id: 'muscle',      label: 'Muscle',      href: '/body-tracker/muscle' },
  { id: 'milestones',  label: 'Milestones',  href: '/body-tracker/milestones' },
  { id: 'metabolic',   label: 'Metabolic',   href: '/body-tracker/metabolic' },
  { id: 'connections', label: 'Connections', href: '/body-tracker/connections' },
] as const;
