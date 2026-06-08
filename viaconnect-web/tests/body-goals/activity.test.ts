import { describe, it, expect } from 'vitest';
import { goalActivityMultiplier, goalToHydrationActivity } from '@/lib/body-goals/activity';

describe('activity maps', () => {
  it('maps goal activity levels to the 179 Section 5.2 multipliers', () => {
    expect(goalActivityMultiplier('sedentary')).toBe(1.2);
    expect(goalActivityMultiplier('light')).toBe(1.375);
    expect(goalActivityMultiplier('moderate')).toBe(1.55);
    expect(goalActivityMultiplier('very')).toBe(1.725);
    expect(goalActivityMultiplier('extra')).toBe(1.9);
  });
  it('defaults to light (1.375) when activity is null', () => {
    expect(goalActivityMultiplier(null)).toBe(1.375);
  });
  it('maps goal activity to hydration activity buckets', () => {
    expect(goalToHydrationActivity('very')).toBe('intense');
    expect(goalToHydrationActivity('extra')).toBe('intense');
    expect(goalToHydrationActivity('moderate')).toBe('moderate');
    expect(goalToHydrationActivity(null)).toBe('light');
  });
});
