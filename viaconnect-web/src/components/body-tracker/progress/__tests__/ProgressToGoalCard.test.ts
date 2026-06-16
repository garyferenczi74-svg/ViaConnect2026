// Prompt 201 (2026-06-15) DD-2: source-as-text contract test for the Progress to
// Goal gauge card. Locks the PlasmaGauge reuse (plasmateal teal, no new gauge),
// the pure helper reuse, the verbatim empty-state copy, and the no-dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(__dirname, '..', 'ProgressToGoalCard.tsx'), 'utf-8');

describe('ProgressToGoalCard', () => {
  it('reuses PlasmaGauge with the teal plasmateal metric, not a new gauge', () => {
    expect(source).toContain("import { PlasmaGauge } from '@/components/gauges/PlasmaGauge'");
    expect(source).toContain('metric="plasmateal"');
  });

  it('reuses the pure computeProgressToGoal helper', () => {
    expect(source).toContain("import { computeProgressToGoal } from './progressMath'");
  });

  it('carries the verbatim fail-open empty state copy', () => {
    expect(source).toContain('Start logging to see progress.');
  });

  it('attributes the card to Arnold via the slug, not a hardcoded name', () => {
    expect(source).toContain('attributionSlug="arnold"');
    expect(source).not.toContain('>Arnold<');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
