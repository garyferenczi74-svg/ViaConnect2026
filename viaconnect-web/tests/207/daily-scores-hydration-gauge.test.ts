// Prompt 207 Task 5: Hydration gauge added to Dashboard Daily Scores panel.
// Uses source-as-text pattern (vitest node environment, no jsdom required).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = () =>
  readFileSync(
    resolve(__dirname, '../../src/components/dashboard/DailyScoresPanel.tsx'),
    'utf8',
  );

describe('Prompt 207 Task 5 - Hydration gauge on Daily Scores', () => {
  it('imports useHydrationToday hook', () => {
    expect(src()).toContain("from '@/components/hydration/useHydrationToday'");
  });

  it('imports Droplet icon from lucide-react', () => {
    expect(src()).toContain('Droplet');
  });

  it('calls useHydrationToday unconditionally in the component body', () => {
    expect(src()).toContain('useHydrationToday()');
  });

  it('renders a Hydration gauge in the loaded state', () => {
    const text = src();
    expect(text).toContain("label: 'Hydration'");
    expect(text).toContain('icon={Droplet}');
  });

  it('uses bioscore metric token for the hydration gauge', () => {
    expect(src()).toContain('metric="bioscore"');
  });

  it('updates loading skeleton grid to 6 columns after Overall Wellness is removed', () => {
    expect(src()).toContain('sm:grid-cols-3 lg:grid-cols-6');
  });

  it('updates skeleton placeholder count to 6', () => {
    expect(src()).toContain('[1, 2, 3, 4, 5, 6]');
  });
});
