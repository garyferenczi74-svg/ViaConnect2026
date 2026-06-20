// Prompt 207 Task 2: hydration control removed from Log a Full Meal page.
// Uses source-as-text pattern (vitest node environment, no jsdom required).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = () =>
  readFileSync(
    resolve(
      __dirname,
      '../../src/app/(app)/(consumer)/nutrition/log-meal/page.tsx',
    ),
    'utf8',
  );

describe('Prompt 207 Task 2 - Log a Full Meal hydration control removal', () => {
  it('does not import HydrationFullSection', () => {
    expect(src()).not.toContain('HydrationFullSection');
  });

  it('does not render a Log Hydration button', () => {
    expect(src()).not.toContain('Log Hydration');
  });

  it('does not import Droplet from lucide-react', () => {
    expect(src()).not.toContain('Droplet');
  });

  it('does not have hydrationOpen state', () => {
    expect(src()).not.toContain('hydrationOpen');
  });
});
