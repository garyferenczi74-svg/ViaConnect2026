// Prompt 207 Task 1: hydration accordion removed from NutriVision capture tab.
// Uses source-as-text pattern (vitest node environment, no jsdom required).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = () =>
  readFileSync(
    resolve(
      __dirname,
      '../../src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/index.tsx',
    ),
    'utf8',
  );

describe('Prompt 207 Task 1 - NutriVision hydration accordion removal', () => {
  it('does not import HydrationAccordion', () => {
    expect(src()).not.toContain('HydrationAccordion');
  });

  it('does not mount HydrationAccordion in the idle surface', () => {
    expect(src()).not.toContain('logSurface="nutrivision_card"');
  });
});
