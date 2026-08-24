import { describe, it, expect } from 'vitest';
import { buildMetricCards } from '../metricCards';
import type { CompositionSnapshot } from '../types';

const baseRegion = { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null };

const partialSnap: CompositionSnapshot = {
  entryId: 'e1',
  source: 'scan',
  recordedAt: '2026-06-22T00:00:00Z',
  totalBodyFatPct: 21.3,
  regionFatPct: { ...baseRegion },
  visceralFatRating: null,
  bodyWaterPct: null,
  regionMuscleLbs: { ...baseRegion },
  totalMuscleMassLbs: null,
  skeletalMuscleMassLbs: null,
};

describe('buildMetricCards', () => {
  it('returns exactly 4 cards in order: Total Body Fat, BMI, Visceral Fat, Body Water', () => {
    const cards = buildMetricCards(partialSnap, 24.2);
    expect(cards).toHaveLength(4);
    expect(cards[0].label).toBe('Total Body Fat');
    expect(cards[1].label).toBe('BMI');
    expect(cards[2].label).toBe('Visceral Fat');
    expect(cards[3].label).toBe('Body Water');
  });

  it('renders known values with their unit', () => {
    const cards = buildMetricCards(partialSnap, 24.2);
    expect(cards[0].value).toBe('21.3%');
    expect(cards[1].value).toBe('24.2');
  });

  it('renders UNKNOWN (null) visceral fat as Unknown status - not 0 or 0%', () => {
    const cards = buildMetricCards(partialSnap, 24.2);
    expect(cards[2].status).toBe('Unknown');
    expect(cards[2].value).not.toBe('0');
    expect(cards[2].value).not.toBe('0%');
  });

  it('renders UNKNOWN (null) body water as Unknown status', () => {
    const cards = buildMetricCards(partialSnap, 24.2);
    expect(cards[3].status).toBe('Unknown');
    expect(cards[3].value).not.toBe('0');
    expect(cards[3].value).not.toBe('0%');
  });

  it('all cards are Unknown when snapshot and bmi are null', () => {
    const cards = buildMetricCards(null, null);
    for (const card of cards) {
      expect(card.status).toBe('Unknown');
      expect(card.value).not.toBe('0');
      expect(card.value).not.toBe('0%');
    }
  });

  it('shows an estimated range for FormaVision scans without replacing a measured card value shape', () => {
    const estimated: CompositionSnapshot = {
      ...partialSnap,
      estimatedBodyFatMin: 18,
      estimatedBodyFatMax: 22,
      isEstimated: true,
    };
    const cards = buildMetricCards(estimated, null);
    expect(cards[0].value).toBe('est. 18.0–22.0%');
    const measured = buildMetricCards({ ...partialSnap, source: 'manual', isEstimated: false }, null);
    expect(measured[0].value).toBe('21.3%');
  });

  it('renders BMI as Unknown when null', () => {
    const cards = buildMetricCards(partialSnap, null);
    expect(cards[1].status).toBe('Unknown');
    expect(cards[1].value).not.toBe('0');
  });
});
