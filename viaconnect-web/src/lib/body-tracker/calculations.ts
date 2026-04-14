// Body Tracker — Calculations & Status Logic (Arnold Sub-Agent)
// Segment status thresholds, milestone grades, helix token awards.

import type { MilestoneGrade } from './types';

// ─── Segment Status Thresholds ─────────────────────────────

type SegmentStatus = 'Very Low' | 'Low' | 'Standard' | 'High' | 'Very High';

const FAT_STATUS_THRESHOLDS = {
  male: {
    arm:   { veryLow: 8,  low: 12, standard: 20, high: 25 },
    trunk: { veryLow: 10, low: 15, standard: 22, high: 28 },
    leg:   { veryLow: 10, low: 14, standard: 22, high: 27 },
  },
  female: {
    arm:   { veryLow: 14, low: 18, standard: 26, high: 32 },
    trunk: { veryLow: 16, low: 20, standard: 28, high: 35 },
    leg:   { veryLow: 16, low: 20, standard: 28, high: 34 },
  },
} as const;

const MUSCLE_STATUS_THRESHOLDS = {
  male: {
    arm:   { veryLow: 4,  low: 6,  standard: 10, high: 13 },
    trunk: { veryLow: 35, low: 45, standard: 60, high: 70 },
    leg:   { veryLow: 12, low: 16, standard: 22, high: 26 },
  },
  female: {
    arm:   { veryLow: 2.5, low: 4,  standard: 7,  high: 9 },
    trunk: { veryLow: 25,  low: 32, standard: 45, high: 55 },
    leg:   { veryLow: 9,   low: 13, standard: 18, high: 22 },
  },
} as const;

export function getSegmentStatus(
  value: number,
  segment: 'arm' | 'trunk' | 'leg',
  mode: 'fat' | 'muscle',
  gender: 'male' | 'female',
): SegmentStatus {
  const thresholds = mode === 'fat'
    ? FAT_STATUS_THRESHOLDS[gender][segment]
    : MUSCLE_STATUS_THRESHOLDS[gender][segment];

  if (value < thresholds.veryLow) return 'Very Low';
  if (value < thresholds.low) return 'Low';
  if (value < thresholds.standard) return 'Standard';
  if (value < thresholds.high) return 'High';
  return 'Very High';
}

export const STATUS_COLORS: Record<SegmentStatus, string> = {
  'Very Low':  '#60A5FA', // blue
  'Low':       '#FBBF24', // yellow
  'Standard':  '#2DA5A0', // teal
  'High':      '#B75E18', // orange
  'Very High': '#EF4444', // red
};

// ─── Milestone Grade Calculation ───────────────────────────

export function calculateMilestoneGrade(
  actualDays: number,
  expectedDays: number,
  consistencyScore: number, // 0-1
): MilestoneGrade {
  if (expectedDays <= 0) return 'F';
  const paceRatio = actualDays / expectedDays;
  const adjustedRatio = paceRatio * (1 - consistencyScore * 0.1);

  if (adjustedRatio <= 0.6) return 'A+';
  if (adjustedRatio <= 0.8) return 'A';
  if (adjustedRatio <= 1.0) return 'A-';
  if (adjustedRatio <= 1.2) return 'B+';
  if (adjustedRatio <= 1.4) return 'B';
  if (adjustedRatio <= 1.6) return 'B-';
  if (adjustedRatio <= 1.8) return 'C+';
  if (adjustedRatio <= 2.0) return 'C';
  if (adjustedRatio <= 2.5) return 'C-';
  if (adjustedRatio <= 3.0) return 'D';
  return 'F';
}

export function calculateHelixTokens(grade: string): number {
  const tokenMap: Record<string, number> = {
    'A+': 200, 'A': 175, 'A-': 150,
    'B+': 125, 'B': 100, 'B-': 75,
    'C+': 50,  'C': 40,  'C-': 30,
    'D': 15,   'F': 5,
  };
  return tokenMap[grade] ?? 0;
}

export function getMilestoneMessage(grade: string, actualDays: number, expectedDays: number): string {
  if (grade.startsWith('A') && actualDays < expectedDays) {
    return `Milestone done in just ${actualDays} days! Amazing work and top performance; keep pushing forward!`;
  }
  if (grade.startsWith('A')) return 'Outstanding milestone completion! Your dedication is paying off.';
  if (grade.startsWith('B')) return "Great progress! You're building strong momentum.";
  if (grade.startsWith('C')) return 'Solid effort! Consistency will accelerate your results.';
  return "Keep going; every step forward counts. You've got this!";
}

export type { SegmentStatus };
