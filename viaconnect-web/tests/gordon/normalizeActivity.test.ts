// Unit tests for CAQ Lifestyle exercise -> MacroActivityLevel mapping.
// Live prod distinct values and CAQ UI copy must all resolve; enum and
// short-form keys stay valid so existing snapshots keep working.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { normalizeActivity } from '@/lib/gordon/normalizeActivity';
import { ACTIVITY_MULTIPLIERS } from '@/lib/gordon/macro-config';

const CAQ_ONBOARDING = path.resolve(
  __dirname,
  '../../src/app/(auth)/onboarding/[step]/page.tsx',
);

describe('normalizeActivity', () => {
  it('maps every live CAQ phase 3 exercise value', () => {
    expect(normalizeActivity('Never')).toBe('sedentary');
    expect(normalizeActivity('1-2x/week')).toBe('lightly_active');
    expect(normalizeActivity('3-4x/week')).toBe('moderately_active');
    expect(normalizeActivity('5-6x/week')).toBe('very_active');
    expect(normalizeActivity('')).toBe('sedentary');
  });

  it('maps the CAQ UI Daily option to extra_active', () => {
    // Source: EXERCISE_FREQ in onboarding/[step]/page.tsx includes Daily.
    expect(normalizeActivity('Daily')).toBe('extra_active');
  });

  it('maps empty / whitespace the same as Never', () => {
    expect(normalizeActivity('   ')).toBe('sedentary');
    expect(normalizeActivity('\t')).toBe('sedentary');
  });

  it('keeps ACTIVITY_MULTIPLIERS enum keys', () => {
    for (const key of Object.keys(ACTIVITY_MULTIPLIERS)) {
      expect(normalizeActivity(key)).toBe(key);
    }
  });

  it('keeps legacy short forms', () => {
    expect(normalizeActivity('light')).toBe('lightly_active');
    expect(normalizeActivity('moderate')).toBe('moderately_active');
    expect(normalizeActivity('very')).toBe('very_active');
    expect(normalizeActivity('athlete')).toBe('extra_active');
    expect(normalizeActivity('extra')).toBe('extra_active');
  });

  it('is case-insensitive and tolerates spacing', () => {
    expect(normalizeActivity('never')).toBe('sedentary');
    expect(normalizeActivity('NEVER')).toBe('sedentary');
    expect(normalizeActivity('  3-4x/week  ')).toBe('moderately_active');
    expect(normalizeActivity('lightly active')).toBe('lightly_active');
    expect(normalizeActivity('moderately-active')).toBe('moderately_active');
  });

  it('maps legacy Rarely copy to sedentary', () => {
    expect(normalizeActivity('Rarely')).toBe('sedentary');
  });

  it('maps unknown non-empty strings to sedentary', () => {
    expect(normalizeActivity('sometimes')).toBe('sedentary');
  });

  it('returns null for missing non-string inputs so the engine can 422', () => {
    expect(normalizeActivity(null)).toBeNull();
    expect(normalizeActivity(undefined)).toBeNull();
    expect(normalizeActivity(3)).toBeNull();
    expect(normalizeActivity({ exercise: 'Never' })).toBeNull();
  });
});

describe('CAQ UI source lock', () => {
  it('EXERCISE_FREQ still lists the mapped frequency labels', () => {
    const source = readFileSync(CAQ_ONBOARDING, 'utf-8');
    expect(source).toContain(
      'const EXERCISE_FREQ = ["Never", "1-2x/week", "3-4x/week", "5-6x/week", "Daily"]',
    );
  });
});

describe('generate-targets route uses the shared helper', () => {
  it('imports normalizeActivity from lib/gordon/normalizeActivity', () => {
    const route = readFileSync(
      path.resolve(__dirname, '../../src/app/api/nutrition/generate-targets/route.ts'),
      'utf-8',
    );
    expect(route).toContain("import { normalizeActivity } from '@/lib/gordon/normalizeActivity'");
    expect(route).toContain('normalizeActivity(phase3?.exercise)');
    expect(route).not.toContain('function normalizeActivity');
  });
});
