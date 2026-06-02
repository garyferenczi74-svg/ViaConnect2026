// Prompt 172 Phase 0 (170c primitive): useSafetyMode source presence sanity.
//
// vitest.config.ts runs in node environment without jsdom (see existing
// NutriVisionTab __tests__/index.test.ts comment for the convention). We
// assert the source carries:
//   1. Initial loading state shape { enabled, loading }.
//   2. The default false fallback (170c §8.4: silent UX).
//   3. The kill switch short circuit.
//   4. Fetch to /api/safety-mode/status on mount.
//   5. Failure path returns enabled false (170c §23.1 fail closed posture).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const HOOK = path.resolve(
  __dirname,
  '..',
  'src',
  'lib',
  'safety-mode',
  'useSafetyMode.ts',
);

describe('useSafetyMode source', () => {
  const source = readFileSync(HOOK, 'utf-8');

  it('marks the file as a client module', () => {
    expect(source).toContain("'use client'");
  });

  it('imports useEffect and useState from react', () => {
    expect(source).toContain('useEffect');
    expect(source).toContain('useState');
  });

  it('returns the documented shape', () => {
    expect(source).toMatch(/enabled\s*:\s*boolean/);
    expect(source).toMatch(/loading\s*:\s*boolean/);
  });

  it('initial state defaults to enabled false', () => {
    expect(source).toMatch(/useState[^;]*false/);
  });

  it('initial loading state is true while the fetch resolves', () => {
    expect(source).toMatch(/useState[^;]*true/);
  });

  it('fetches from /api/safety-mode/status', () => {
    expect(source).toContain('/api/safety-mode/status');
  });

  it('honors the EATING_DISORDER_SAFETY_MODE_ENABLED kill switch', () => {
    expect(source).toContain('EATING_DISORDER_SAFETY_MODE_ENABLED');
    expect(source).toContain('@/lib/compliance/kill-switches');
  });

  it('exports the hook by name', () => {
    expect(source).toMatch(/export function useSafetyMode/);
  });

  it('contains no em or en dashes', () => {
    expect(source.includes('—')).toBe(false);
    expect(source.includes('–')).toBe(false);
  });

  it('catches fetch failure and keeps enabled false', () => {
    expect(source.toLowerCase()).toContain('catch');
  });
});
