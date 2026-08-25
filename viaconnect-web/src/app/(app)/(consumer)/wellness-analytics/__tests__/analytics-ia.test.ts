import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('consumer analytics IA (Brief 13)', () => {
  it('retires /wellness-analytics as a redirect to /analytics', () => {
    const src = readFileSync(
      join(root, 'src/app/(app)/(consumer)/wellness-analytics/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(/redirect\(['"]\/analytics['"]\)/);
    expect(src).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(src).not.toMatch(/Analytics Categories/);
  });

  it('keeps hydration as a logger, not the analytics IA', () => {
    const src = readFileSync(
      join(root, 'src/app/(app)/(consumer)/wellness-analytics/hydration/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(/HydrationFullSection/);
    expect(src).not.toMatch(/href=["']\/wellness-analytics["']/);
  });

  it('dashboard BOS card and analytics share Connections BOS SSOT', () => {
    const morning = readFileSync(
      join(root, 'src/components/dashboard/morning-card/MorningCard.tsx'),
      'utf8',
    );
    const journey = readFileSync(
      join(root, 'src/components/journey/YourJourneyCoaching.tsx'),
      'utf8',
    );
    expect(morning).toMatch(/resolveConnectionsBosDisplay/);
    expect(morning).toMatch(/ConnectionsBosDial/);
    expect(journey).toMatch(/resolveConnectionsBosDisplay/);
    expect(journey).toMatch(/connectionsBosNumericScore/);
    expect(morning).not.toMatch(/useBOSCurrent/);
    expect(journey).not.toMatch(/useBOSCurrent/);
  });
});
