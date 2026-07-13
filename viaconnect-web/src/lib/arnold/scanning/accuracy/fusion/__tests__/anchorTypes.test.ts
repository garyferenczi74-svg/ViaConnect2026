// Task 211b-W3a - TDD tests for the anchor source model.
// Written before anchorTypes.ts exists (RED), then implemented (GREEN).

import { describe, it, expect } from 'vitest';
import { DEFAULT_SOURCE_RELIABILITY, type AnchorReading } from '../anchorTypes';

describe('DEFAULT_SOURCE_RELIABILITY', () => {
  it('rates dexa as high reliability', () => {
    expect(DEFAULT_SOURCE_RELIABILITY.dexa).toBe('high');
  });

  it('rates tape as medium reliability', () => {
    expect(DEFAULT_SOURCE_RELIABILITY.tape).toBe('medium');
  });

  it('rates scale as medium reliability (weight-only, no girth information)', () => {
    expect(DEFAULT_SOURCE_RELIABILITY.scale).toBe('medium');
  });
});

describe('AnchorReading shape', () => {
  it('accepts a girth region reading in cm', () => {
    const reading: AnchorReading = {
      source: 'tape',
      region: 'waist_natural',
      value: 81.5,
      takenAt: '2026-07-01T12:00:00.000Z',
      statedReliability: 'medium',
    };
    expect(reading.region).toBe('waist_natural');
    expect(reading.value).toBe(81.5);
  });

  it('accepts a weight-only scale reading in kg', () => {
    const reading: AnchorReading = {
      source: 'scale',
      region: 'weight',
      value: 72.3,
      takenAt: '2026-07-01T12:00:00.000Z',
      statedReliability: 'medium',
    };
    expect(reading.region).toBe('weight');
    expect(reading.value).toBe(72.3);
  });
});
