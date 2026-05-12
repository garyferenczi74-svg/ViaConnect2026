// Tests for src/lib/scoring/hannah-output-schema.ts.
//
// Phase C runtime validation of Hannah's tool-call output. Schema must
// reject every form of malformed output without throwing through to a
// generic Error: callers rely on HannahOutputValidationError to know to
// retry exactly once.

import { describe, it, expect } from 'vitest';
import {
  HANNAH_TOOL_NAME,
  HANNAH_TOOL_SCHEMA,
  validateHannahOutput,
  HannahOutputValidationError,
} from '../hannah-output-schema';

function validOutput() {
  return {
    score: 75,
    baseline_from_caq: 68,
    engagement_total: 7,
    engagement: {
      nutrition: {
        current_contribution_pct: 2.5,
        velocity_pct: 0.2,
        ceiling_pct: 8,
        state: 'in_use' as const,
      },
      supplements: {
        current_contribution_pct: 0,
        velocity_pct: 0,
        ceiling_pct: 8,
        state: 'unused' as const,
      },
      body_tracker: {
        current_contribution_pct: 1.5,
        velocity_pct: 0.1,
        ceiling_pct: 5,
        state: 'in_use' as const,
      },
      wearable: {
        current_contribution_pct: 0,
        velocity_pct: 0,
        ceiling_pct: 5,
        state: 'unused' as const,
      },
      plug_ins: {
        current_contribution_pct: 0,
        velocity_pct: 0,
        ceiling_pct: 4,
        state: 'unused' as const,
      },
      helix_challenges: {
        current_contribution_pct: 3,
        velocity_pct: 0.3,
        ceiling_pct: 6,
        state: 'in_use' as const,
      },
    },
    decay_applied: [],
    explanation:
      'Your Bio Optimization Score moved up because Nutrition and Body Tracker logs stayed steady this week. Keep logging meals and tracking measurements to grow the score further.',
  };
}

describe('HANNAH_TOOL_NAME and HANNAH_TOOL_SCHEMA', () => {
  it('exports the canonical tool name', () => {
    expect(HANNAH_TOOL_NAME).toBe('report_bos_compute');
  });

  it('exports a tool schema whose name matches the constant', () => {
    expect(HANNAH_TOOL_SCHEMA.name).toBe(HANNAH_TOOL_NAME);
  });

  it('exports a tool schema with an object input_schema', () => {
    expect(HANNAH_TOOL_SCHEMA.input_schema.type).toBe('object');
    expect(HANNAH_TOOL_SCHEMA.input_schema).toHaveProperty('properties');
  });

  it('declares additionalProperties: false at the top level', () => {
    expect((HANNAH_TOOL_SCHEMA.input_schema as { additionalProperties: unknown }).additionalProperties).toBe(false);
  });
});

describe('validateHannahOutput accepts well-formed output', () => {
  it('returns the parsed object on the happy path', () => {
    const result = validateHannahOutput(validOutput(), 68);
    expect(result.score).toBe(75);
    expect(result.baseline_from_caq).toBe(68);
    expect(result.engagement_total).toBe(7);
    expect(result.engagement.nutrition.current_contribution_pct).toBe(2.5);
    expect(result.explanation.length).toBeGreaterThanOrEqual(20);
  });

  it('accepts a decay_applied list with valid factors', () => {
    const o = validOutput();
    o.decay_applied = [
      { lever: 'supplements', decay_factor: 0.5, reason: 'stale_engagement' },
    ] as never;
    const result = validateHannahOutput(o, 68);
    expect(result.decay_applied).toHaveLength(1);
  });
});

describe('validateHannahOutput rejects malformed output', () => {
  it('throws HannahOutputValidationError when score is above 100', () => {
    const o = validOutput();
    o.score = 101;
    expect(() => validateHannahOutput(o, 68)).toThrow(HannahOutputValidationError);
  });

  it('throws when score is below the baseline floor', () => {
    const o = validOutput();
    o.score = 70;
    expect(() => validateHannahOutput(o, 80)).toThrow(HannahOutputValidationError);
  });

  it('throws when an engagement lever is missing', () => {
    const o = validOutput() as Record<string, unknown>;
    delete (o.engagement as Record<string, unknown>).nutrition;
    expect(() => validateHannahOutput(o, 68)).toThrow(HannahOutputValidationError);
  });

  it('throws when an unknown lever name is added', () => {
    const o = validOutput() as Record<string, unknown>;
    (o.engagement as Record<string, unknown>).made_up_lever = {
      current_contribution_pct: 1,
      velocity_pct: 0,
      ceiling_pct: 5,
      state: 'in_use',
    };
    expect(() => validateHannahOutput(o, 68)).toThrow(HannahOutputValidationError);
  });

  it('throws when explanation is under 20 characters', () => {
    const o = validOutput();
    o.explanation = 'too short';
    expect(() => validateHannahOutput(o, 68)).toThrow(HannahOutputValidationError);
  });

  it('throws when explanation exceeds 600 characters', () => {
    const o = validOutput();
    o.explanation = 'a'.repeat(601);
    expect(() => validateHannahOutput(o, 68)).toThrow(HannahOutputValidationError);
  });

  it('throws when engagement_total + baseline disagrees with score beyond 0.5 tolerance', () => {
    const o = validOutput();
    o.score = 90; // baseline 68 + engagement_total 7 = 75, score 90 is +15 outside tolerance
    expect(() => validateHannahOutput(o, 68)).toThrow(HannahOutputValidationError);
  });

  it('accepts engagement_total within 0.5 tolerance', () => {
    const o = validOutput();
    // baseline 68 + engagement_total 7 = 75; score 75.4 is within tolerance
    o.score = 75.4;
    const result = validateHannahOutput(o, 68);
    expect(result.score).toBe(75.4);
  });

  it('throws when decay_factor is > 1', () => {
    const o = validOutput();
    o.decay_applied = [
      { lever: 'supplements', decay_factor: 1.2, reason: 'stale_engagement' },
    ] as never;
    expect(() => validateHannahOutput(o, 68)).toThrow(HannahOutputValidationError);
  });

  it('throws when decay_factor is < 0', () => {
    const o = validOutput();
    o.decay_applied = [
      { lever: 'supplements', decay_factor: -0.1, reason: 'stale_engagement' },
    ] as never;
    expect(() => validateHannahOutput(o, 68)).toThrow(HannahOutputValidationError);
  });

  it('throws when an unknown top-level property is added (additionalProperties: false)', () => {
    const o = validOutput() as Record<string, unknown>;
    o.random_field = 1;
    expect(() => validateHannahOutput(o, 68)).toThrow(HannahOutputValidationError);
  });

  it('throws when a contribution sub-object has an unknown state enum value', () => {
    const o = validOutput();
    (o.engagement.nutrition as { state: string }).state = 'overdrive';
    expect(() => validateHannahOutput(o, 68)).toThrow(HannahOutputValidationError);
  });

  it('attaches a descriptive reason on the error', () => {
    const o = validOutput();
    o.score = 200;
    try {
      validateHannahOutput(o, 68);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HannahOutputValidationError);
      expect((e as HannahOutputValidationError).reason.length).toBeGreaterThan(0);
    }
  });
});
