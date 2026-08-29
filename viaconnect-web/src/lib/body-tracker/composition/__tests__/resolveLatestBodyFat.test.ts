import { describe, expect, it } from 'vitest';
import {
  formatBodyFatChip,
  resolveLatestBodyFat,
} from '../resolveLatestBodyFat';

describe('resolveLatestBodyFat', () => {
  it('prefers a newer segmental scan estimate over a stale weight-row fat', () => {
    const resolved = resolveLatestBodyFat([
      {
        pct: 21.4,
        createdAt: '2026-08-29T12:00:00.000Z',
        sourceName: 'FormaVision',
      },
      {
        pct: 18.0,
        createdAt: '2026-08-01T12:00:00.000Z',
        sourceName: 'apple_health',
      },
    ]);
    expect(resolved).toEqual({ pct: 21.4, sourceName: 'FormaVision' });
    expect(formatBodyFatChip(resolved.pct as number)).toBe('21.4');
  });

  it('ignores the scan weight placeholder (null fat) so the chip is not blanked', () => {
    const resolved = resolveLatestBodyFat([
      { pct: null, createdAt: '2026-08-29T12:00:00.000Z', sourceName: 'FormaVision' },
      { pct: 21.4, createdAt: '2026-08-29T12:00:00.000Z', sourceName: 'FormaVision' },
    ]);
    expect(resolved.pct).toBe(21.4);
  });

  it('falls back to weight-row fat when no segmental estimate exists', () => {
    const resolved = resolveLatestBodyFat([
      { pct: null, createdAt: '2026-08-29T12:00:00.000Z', sourceName: null },
      { pct: 19.25, createdAt: '2026-08-20T12:00:00.000Z', sourceName: 'apple_health' },
    ]);
    expect(resolved).toEqual({ pct: 19.3, sourceName: 'apple_health' });
  });

  it('keeps UNKNOWN for null, 0, and non-finite values', () => {
    expect(
      resolveLatestBodyFat([
        { pct: null, createdAt: '2026-08-29T12:00:00.000Z', sourceName: 'FormaVision' },
        { pct: 0, createdAt: '2026-08-29T12:00:00.000Z', sourceName: 'manual' },
        { pct: Number.NaN, createdAt: '2026-08-29T12:00:00.000Z', sourceName: 'manual' },
      ]),
    ).toEqual({ pct: null, sourceName: null });
  });
});
