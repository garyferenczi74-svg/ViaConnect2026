// Task 211b-W3b - TDD tests for fusion telemetry.
// Covers: pure bucketing, pure payload builders (no PHI shape), and fail-open
// / falsy-userId no-op behavior of the emitters, mirroring noiseTelemetry.ts.

import { describe, it, expect } from 'vitest';
import {
  bucketTightening,
  buildAnchorAdoptedPayload,
  buildBandTightenedPayload,
  emitAnchorAdopted,
  emitBandTightened,
} from '../fusionTelemetry';

describe('bucketTightening', () => {
  it('buckets a large tightening as substantial', () => {
    expect(bucketTightening(0.5, 3)).toBe('substantial'); // ratio ~0.167
  });

  it('buckets a moderate tightening as moderate', () => {
    expect(bucketTightening(2, 3)).toBe('moderate'); // ratio ~0.667
  });

  it('buckets a marginal tightening as slight', () => {
    expect(bucketTightening(2.9, 3)).toBe('slight'); // ratio ~0.967
  });
});

describe('buildAnchorAdoptedPayload', () => {
  it('carries only the source, no PHI, no measurement values', () => {
    const payload = buildAnchorAdoptedPayload('dexa');
    expect(payload.event).toBe('formavision.fusion.anchor_adopted');
    expect(payload.properties).toEqual({ source: 'dexa' });
    expect(Object.keys(payload.properties)).toEqual(['source']);
  });
});

describe('buildBandTightenedPayload', () => {
  it('carries only region and the coarse bucket, never raw cm', () => {
    const payload = buildBandTightenedPayload('hip', 'substantial');
    expect(payload.event).toBe('formavision.fusion.band_tightened');
    expect(payload.properties).toEqual({ region: 'hip', bucket: 'substantial' });
    expect(Object.keys(payload.properties).sort()).toEqual(['bucket', 'region']);
  });
});

describe('emitAnchorAdopted (fail-open)', () => {
  it('is a no-op for a falsy userId (no throw, resolves cleanly)', async () => {
    await expect(emitAnchorAdopted(undefined, 'tape')).resolves.toBeUndefined();
    await expect(emitAnchorAdopted(null, 'tape')).resolves.toBeUndefined();
    await expect(emitAnchorAdopted('', 'tape')).resolves.toBeUndefined();
  });
});

describe('emitBandTightened (fail-open)', () => {
  it('is a no-op for a falsy userId (no throw, resolves cleanly)', async () => {
    await expect(emitBandTightened(undefined, 'waist_natural', 'moderate')).resolves.toBeUndefined();
  });
});
