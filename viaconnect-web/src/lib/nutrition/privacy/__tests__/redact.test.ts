// Prompt #170 Phase 1b: tests for the vision provider PHI redaction boundary.
// Per Prompt 170 §2.5 and Prompt 170a §4.3, the outbound payload must contain
// only image bytes, opaque request_id, captured_at, and device_class.

import { describe, it, expect } from 'vitest';
import {
  sanitizeVisionRequest,
  findForbiddenKeys,
  VISION_REQUEST_DENYLIST,
  type VisionRequestEnvelope,
} from '../redact';

const clean: VisionRequestEnvelope = {
  imageBase64: 'aGVsbG8=',
  requestId: '550e8400-e29b-41d4-a716-446655440000',
  capturedAt: '2026-05-28T12:00:00.000Z',
  deviceClass: 'ios_lidar',
};

describe('sanitizeVisionRequest', () => {
  it('passes through a clean envelope with the 4 allowed keys', () => {
    const out = sanitizeVisionRequest(clean);
    expect(out.imageBase64).toBe(clean.imageBase64);
    expect(out.requestId).toBe(clean.requestId);
    expect(out.capturedAt).toBe(clean.capturedAt);
    expect(out.deviceClass).toBe(clean.deviceClass);
  });

  it('throws when the envelope contains an extra key beyond the 4 allowed', () => {
    const dirty = { ...clean, user_id: 'abc' } as unknown as VisionRequestEnvelope;
    expect(() => sanitizeVisionRequest(dirty)).toThrow(/forbidden|disallowed|extra/i);
  });

  it('throws when the envelope is missing a required key', () => {
    const partial = { ...clean } as Partial<VisionRequestEnvelope>;
    delete partial.requestId;
    expect(() => sanitizeVisionRequest(partial as VisionRequestEnvelope)).toThrow();
  });

  it('throws when deviceClass is not one of the allowed enum values', () => {
    const bad = { ...clean, deviceClass: 'desktop' } as unknown as VisionRequestEnvelope;
    expect(() => sanitizeVisionRequest(bad)).toThrow();
  });

  it('throws when requestId is not a valid v4 UUID shape', () => {
    const bad = { ...clean, requestId: 'not-a-uuid' };
    expect(() => sanitizeVisionRequest(bad)).toThrow();
  });
});

describe('findForbiddenKeys', () => {
  it('returns an empty array for a clean object', () => {
    expect(findForbiddenKeys({ requestId: 'x' })).toEqual([]);
  });

  it('returns ALL denylist hits when payload contains several forbidden keys', () => {
    const payload = {
      requestId: 'x',
      user_id: 'u',
      email: 'a@b.com',
      ip_address: '1.2.3.4',
      latitude: 40.7,
      protocol_id: 'p',
    };
    const hits = findForbiddenKeys(payload);
    expect(hits).toContain('user_id');
    expect(hits).toContain('email');
    expect(hits).toContain('ip_address');
    expect(hits).toContain('latitude');
    expect(hits).toContain('protocol_id');
    expect(hits.length).toBe(5);
  });

  it('catches both snake_case and camelCase variants', () => {
    const payload = { userId: 'u', authUid: 'a', phoneNumber: 'p' };
    const hits = findForbiddenKeys(payload);
    expect(hits).toContain('userId');
    expect(hits).toContain('authUid');
    expect(hits).toContain('phoneNumber');
  });
});

describe('VISION_REQUEST_DENYLIST', () => {
  it('exports the full denylist as a frozen array of strings', () => {
    expect(Array.isArray(VISION_REQUEST_DENYLIST)).toBe(true);
    expect(VISION_REQUEST_DENYLIST).toContain('user_id');
    expect(VISION_REQUEST_DENYLIST).toContain('email');
    expect(VISION_REQUEST_DENYLIST).toContain('protocol_id');
    expect(VISION_REQUEST_DENYLIST).toContain('supplement_id');
    expect(VISION_REQUEST_DENYLIST.length).toBeGreaterThanOrEqual(30);
  });
});
