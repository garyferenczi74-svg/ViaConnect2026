import { describe, it, expect } from 'vitest';
import {
  defaultModeForWeights,
  tierForStoredRate,
  defaultTierForMode,
  resolvePayload,
  cappedRate,
  LOSS_TIERS,
  GAIN_TIERS,
} from '../goalModes';

describe('defaultModeForWeights', () => {
  it('goal below current is loss', () => {
    expect(defaultModeForWeights(200, 180)).toBe('loss');
  });
  it('goal above current is gain', () => {
    expect(defaultModeForWeights(150, 170)).toBe('gain');
  });
  it('within the maintain band is maintain', () => {
    expect(defaultModeForWeights(180, 181)).toBe('maintain');
  });
  it('invalid weights fail open to maintain', () => {
    expect(defaultModeForWeights(0, 180)).toBe('maintain');
    expect(defaultModeForWeights(NaN, 180)).toBe('maintain');
  });
});

describe('tierForStoredRate', () => {
  it('maps a loss rate to the nearest loss tier', () => {
    expect(tierForStoredRate('loss', 1.1)).toBe('steady');
    expect(tierForStoredRate('loss', 0.4)).toBe('gentle');
    expect(tierForStoredRate('loss', 1.9)).toBe('max');
  });
  it('maps a gain rate to the nearest gain tier', () => {
    expect(tierForStoredRate('gain', 0.3)).toBe('lean');
    expect(tierForStoredRate('gain', 0.5)).toBe('standard');
  });
  it('maintain has no tier', () => {
    expect(tierForStoredRate('maintain', 0)).toBeNull();
  });
  it('null rate returns null', () => {
    expect(tierForStoredRate('loss', null)).toBeNull();
  });
});

describe('defaultTierForMode', () => {
  it('loss defaults to gentle, gain to lean, maintain to null', () => {
    expect(defaultTierForMode('loss')).toBe('gentle');
    expect(defaultTierForMode('gain')).toBe('lean');
    expect(defaultTierForMode('maintain')).toBeNull();
  });
});

describe('resolvePayload', () => {
  it('maintain sends a zero rate', () => {
    expect(resolvePayload({ mode: 'maintain', tierId: null, driver: 'rate', targetDate: '' })).toEqual({
      driver: 'rate',
      targetRateLbPerWeek: 0,
      targetDate: null,
    });
  });
  it('loss with gentle sends 0.5', () => {
    expect(resolvePayload({ mode: 'loss', tierId: 'gentle', driver: 'rate', targetDate: '' })).toEqual({
      driver: 'rate',
      targetRateLbPerWeek: 0.5,
      targetDate: null,
    });
  });
  it('gain with standard sends 0.5', () => {
    expect(resolvePayload({ mode: 'gain', tierId: 'standard', driver: 'rate', targetDate: '' })).toEqual({
      driver: 'rate',
      targetRateLbPerWeek: 0.5,
      targetDate: null,
    });
  });
  it('date driver sends the date, no rate', () => {
    expect(resolvePayload({ mode: 'loss', tierId: 'gentle', driver: 'date', targetDate: '2026-12-01' })).toEqual({
      driver: 'date',
      targetRateLbPerWeek: null,
      targetDate: '2026-12-01',
    });
  });
  it('unknown tier falls back to the first tier of the mode', () => {
    expect(resolvePayload({ mode: 'loss', tierId: 'bogus', driver: 'rate', targetDate: '' }).targetRateLbPerWeek).toBe(
      LOSS_TIERS[0].rate,
    );
  });
});

describe('cappedRate', () => {
  it('clamps to 1 percent of body weight when that is lower', () => {
    expect(cappedRate(2, 150)).toBe(1.5);
  });
  it('clamps to 2 lb per week at high body weight', () => {
    expect(cappedRate(2, 260)).toBe(2);
  });
  it('leaves an in-cap rate unchanged', () => {
    expect(cappedRate(0.5, 200)).toBe(0.5);
  });
});

describe('tier shape', () => {
  it('has the DD-1 and DD-2 rates', () => {
    expect(LOSS_TIERS.map((t) => t.rate)).toEqual([0.5, 1.0, 2.0]);
    expect(GAIN_TIERS.map((t) => t.rate)).toEqual([0.25, 0.5]);
  });
});
