// Prompt 175f (2026-06-05): supplement-vision payload integrity tests.
//
// The route's no_image_received gate depends on two pure helpers
// (approximateBase64ByteLength + isPayloadBelowFloor) that decide
// whether a request body actually carried an image worth handing to a
// provider. Pinning the behavior here protects against accidental floor
// drift and proves the gate covers every "empty payload" shape the
// client can produce (absent field, empty string, very small fragment).

import { describe, it, expect } from 'vitest';
import {
  approximateBase64ByteLength,
  isPayloadBelowFloor,
} from '@/app/api/ai/supplement-vision/route';

describe('approximateBase64ByteLength', () => {
  it('returns zero for empty or non-string input', () => {
    expect(approximateBase64ByteLength('')).toBe(0);
    // @ts-expect-error covering the runtime guard
    expect(approximateBase64ByteLength(null)).toBe(0);
    // @ts-expect-error covering the runtime guard
    expect(approximateBase64ByteLength(undefined)).toBe(0);
  });

  it('handles a four-character group with no padding', () => {
    // 'YWJjZA==' is base64 for 'abcd' (4 bytes), length 8
    expect(approximateBase64ByteLength('YWJjZA==')).toBe(4);
  });

  it('handles single-byte and two-byte payloads', () => {
    expect(approximateBase64ByteLength('YQ==')).toBe(1); // 'a'
    expect(approximateBase64ByteLength('YWI=')).toBe(2); // 'ab'
    expect(approximateBase64ByteLength('YWJj')).toBe(3); // 'abc' no padding
  });

  it('estimates a 5 KB payload within +/- 4 bytes', () => {
    // A 5 KB raw payload base64-encodes to roughly 6,668 characters
    // after padding. We just need the byte estimate to land near 5000.
    const fakeBase64 = 'A'.repeat(6_668);
    const bytes = approximateBase64ByteLength(fakeBase64);
    expect(bytes).toBeGreaterThanOrEqual(4_996);
    expect(bytes).toBeLessThanOrEqual(5_004);
  });
});

describe('isPayloadBelowFloor', () => {
  it('returns true for null / undefined / empty', () => {
    expect(isPayloadBelowFloor(null)).toBe(true);
    expect(isPayloadBelowFloor(undefined)).toBe(true);
    expect(isPayloadBelowFloor('')).toBe(true);
  });

  it('returns true for a few-character payload', () => {
    expect(isPayloadBelowFloor('YQ==')).toBe(true);
    expect(isPayloadBelowFloor('YWJjZA==')).toBe(true);
  });

  it('returns true for just under the 5 KB floor', () => {
    // ~4 KB encoded payload (5_400 base64 chars approx 4_050 bytes)
    const justUnder = 'A'.repeat(5_400);
    expect(isPayloadBelowFloor(justUnder)).toBe(true);
  });

  it('returns false for a payload comfortably above the floor', () => {
    // ~8 KB encoded payload (10_800 base64 chars approx 8_100 bytes)
    const comfortablyOver = 'A'.repeat(10_800);
    expect(isPayloadBelowFloor(comfortablyOver)).toBe(false);
  });

  it('returns false for the 800 KB target the client compresses to', () => {
    // 800 KB target base64-encodes to roughly 1_066_667 characters.
    // Build a representative-length string.
    const targetLength = 1_066_667;
    const eightHundredKb = 'A'.repeat(targetLength);
    expect(isPayloadBelowFloor(eightHundredKb)).toBe(false);
  });
});
