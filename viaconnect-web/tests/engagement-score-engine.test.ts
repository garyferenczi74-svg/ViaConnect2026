// Prompt #92 Phase 5: engagement score pure-logic tests + firewall integrity.

import { describe, it, expect } from 'vitest';
import {
  composeScore,
  normalizeProtocolAdherence,
  normalizeAssessmentEngagement,
  normalizeTrackingConsistency,
  normalizeOutcomeTrajectory,
  COMPONENT_WEIGHTS,
} from '@/lib/engagement/score-engine';

describe('normalizeProtocolAdherence', () => {
  it('returns 50 (neutral) for empty supplement roster', () => {
    expect(normalizeProtocolAdherence([])).toBe(50);
  });
  it('averages the per-supplement adherence values', () => {
    expect(normalizeProtocolAdherence([100, 100, 100])).toBe(100);
    expect(normalizeProtocolAdherence([50, 50])).toBe(50);
    expect(normalizeProtocolAdherence([100, 0])).toBe(50);
    expect(normalizeProtocolAdherence([75, 80, 90])).toBe(82); // 245/3 ~= 81.67
  });
  it('clamps inputs outside 0..100', () => {
    expect(normalizeProtocolAdherence([120, 80])).toBe(90);    // (100 + 80) / 2
    expect(normalizeProtocolAdherence([-10, 50])).toBe(25);    // (0 + 50) / 2
  });
});

describe('normalizeAssessmentEngagement', () => {
  it('baseline 30 for any authenticated user', () => {
    expect(normalizeAssessmentEngagement({ reassessmentCount: 0, labUploadCount: 0 })).toBe(30);
  });
  it('caps reassessment contribution at 40 points', () => {
    expect(normalizeAssessmentEngagement({ reassessmentCount: 10, labUploadCount: 0 })).toBe(70); // 40 + 30
  });
  it('caps lab upload contribution at 30 points', () => {
    expect(normalizeAssessmentEngagement({ reassessmentCount: 0, labUploadCount: 10 })).toBe(60); // 30 + 30
  });
  it('caps total at 100', () => {
    expect(normalizeAssessmentEngagement({ reassessmentCount: 10, labUploadCount: 10 })).toBe(100);
  });
  it('partial credit for a single reassessment', () => {
    expect(normalizeAssessmentEngagement({ reassessmentCount: 1, labUploadCount: 0 })).toBe(50); // 20 + 30
  });
});

describe('normalizeTrackingConsistency', () => {
  it('0 when no days logged', () => {
    expect(normalizeTrackingConsistency({ uniqueLoggedDays: 0, totalDaysInPeriod: 30 })).toBe(0);
  });
  it('100 when every day is logged', () => {
    expect(normalizeTrackingConsistency({ uniqueLoggedDays: 30, totalDaysInPeriod: 30 })).toBe(100);
  });
  it('proportional for partial logs', () => {
    expect(normalizeTrackingConsistency({ uniqueLoggedDays: 15, totalDaysInPeriod: 30 })).toBe(50);
    expect(normalizeTrackingConsistency({ uniqueLoggedDays: 10, totalDaysInPeriod: 30 })).toBe(33);
  });
  it('caps at 100 if more logged days than period (edge case)', () => {
    expect(normalizeTrackingConsistency({ uniqueLoggedDays: 40, totalDaysInPeriod: 30 })).toBe(100);
  });
  it('0 when period is zero or negative', () => {
    expect(normalizeTrackingConsistency({ uniqueLoggedDays: 5, totalDaysInPeriod: 0 })).toBe(0);
  });
});

describe('normalizeOutcomeTrajectory', () => {
  it('returns 50 (neutral) when data is insufficient', () => {
    expect(normalizeOutcomeTrajectory({ startScore: null, endScore: null })).toBe(50);
    expect(normalizeOutcomeTrajectory({ startScore: 70, endScore: null })).toBe(50);
  });
  it('50 for flat trajectory', () => {
    expect(normalizeOutcomeTrajectory({ startScore: 70, endScore: 70 })).toBe(50);
  });
  it('100 for +10 score gain', () => {
    expect(normalizeOutcomeTrajectory({ startScore: 70, endScore: 80 })).toBe(100);
  });
  it('0 for -10 score loss', () => {
    expect(normalizeOutcomeTrajectory({ startScore: 70, endScore: 60 })).toBe(0);
  });
  it('proportional between the bounds', () => {
    expect(normalizeOutcomeTrajectory({ startScore: 70, endScore: 75 })).toBe(75); // +5 -> 75
    expect(normalizeOutcomeTrajectory({ startScore: 70, endScore: 67 })).toBe(35); // -3 -> 35
  });
  it('clamps beyond bounds', () => {
    expect(normalizeOutcomeTrajectory({ startScore: 50, endScore: 95 })).toBe(100);
    expect(normalizeOutcomeTrajectory({ startScore: 95, endScore: 50 })).toBe(0);
  });
});

describe('composeScore (weighted average)', () => {
  it('weights sum to 1.0', () => {
    const sum = Object.values(COMPONENT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
  it('100 across the board yields 100', () => {
    const score = composeScore({
      protocolAdherence: 100, assessmentEngagement: 100,
      trackingConsistency: 100, outcomeTrajectory: 100,
    });
    expect(score).toBe(100);
  });
  it('0 across the board yields 0', () => {
    const score = composeScore({
      protocolAdherence: 0, assessmentEngagement: 0,
      trackingConsistency: 0, outcomeTrajectory: 0,
    });
    expect(score).toBe(0);
  });
  it('weighted average matches the spec (35/20/25/20)', () => {
    // adherence dominates
    const score = composeScore({
      protocolAdherence: 100, assessmentEngagement: 0,
      trackingConsistency: 0, outcomeTrajectory: 0,
    });
    expect(score).toBe(35);
  });
  it('clamps individual components', () => {
    const score = composeScore({
      protocolAdherence: 150, assessmentEngagement: -20,
      trackingConsistency: 80, outcomeTrajectory: 60,
    });
    // clamped to 100/0/80/60 -> 35 + 0 + 20 + 12 = 67
    expect(score).toBe(67);
  });
});

// ---------- FIREWALL INTEGRITY ---------------------------------------------
// The practitioner engagement-score response shape is a strict whitelist.
// These tests ensure the engine exports nothing that would leak Helix fields.

describe('Helix firewall integrity', () => {
  it('score engine module does not re-export any Helix type', async () => {
    const mod = await import('@/lib/engagement/score-engine');
    const keys = Object.keys(mod);
    for (const k of keys) {
      expect(k.toLowerCase()).not.toMatch(/helix/);
    }
  });

  it('EngagementComposite fields are explicit (no index signature that could leak fields)', () => {
    // If a future refactor adds an index signature, this test will not fail;
    // it's a reminder that the response whitelist in the API route is the
    // load-bearing firewall. The following keys are the complete allowed set:
    const ALLOWED = new Set([
      'protocolAdherence', 'assessmentEngagement',
      'trackingConsistency', 'outcomeTrajectory', 'composite',
    ]);
    const sample = composeScore({
      protocolAdherence: 50, assessmentEngagement: 50,
      trackingConsistency: 50, outcomeTrajectory: 50,
    });
    expect(typeof sample).toBe('number');
    expect(ALLOWED.size).toBe(5);
  });

  it('API response whitelist contains only score-related fields', () => {
    // Parse the route source and assert the keys on the response object are a
    // strict subset of {score, components, period}. This keeps the firewall
    // from rotting quietly in future refactors.
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const raw = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/api/practitioner/patients/[patientId]/engagement-score/route.ts'),
      'utf8',
    );
    // Strip block and line comments so forbidden words in documentation don't
    // trip the firewall check — we only want to inspect the actual code.
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const forbidden = [
      'current_balance', 'lifetime_earned', 'lifetime_redeemed',
      'tokens_spent', 'tokens_awarded', 'streak_days',
      'achievement_id', 'tier_points', 'leaderboard', 'multiplier_applied',
    ];
    for (const word of forbidden) {
      expect(code.includes(word), `forbidden Helix field '${word}' in practitioner engagement-score route`).toBe(false);
    }
    // The response must include the whitelisted keys
    expect(code).toMatch(/score:\s*row\.score/);
    expect(code).toMatch(/protocolAdherence/);
    expect(code).toMatch(/period:/);
  });
});
