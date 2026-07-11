// Prompt 211a W1: tests for the PURE capture-controller logic.
//
// Load-bearing contract: canSupportOnDeviceEncode() is FALSE on the 2d tier and when
// MediaRecorder / captureStream are absent -> the UI must branch to the static-card
// fallback honestly. The mime picker, capture plan, and range length are pure and
// deterministic. The actual recordCanvasToWebM encode is execution-gated (browser
// only) and is intentionally NOT exercised here.

import { describe, it, expect } from 'vitest';
import {
  decideOnDeviceEncode,
  readEncodeCapabilitySignals,
  canSupportOnDeviceEncode,
  pickWebmMimeType,
  buildCapturePlan,
  rangeLength,
  WEBM_MIME_PREFERENCES,
  CLIP_PLAY_DURATION_MS,
  CLIP_TOTAL_DURATION_MS,
  CLIP_CAPTURE_FPS,
} from '../captureController';

describe('decideOnDeviceEncode: 2d tier and missing APIs fall back', () => {
  it('is FALSE on the 2d tier even when both browser APIs are present', () => {
    // The 2D floor has no WebGL canvas to capture (baseline item 1+2).
    expect(
      decideOnDeviceEncode({ hasMediaRecorder: true, hasCaptureStream: true, tier: '2d' }),
    ).toBe(false);
  });

  it('is FALSE when MediaRecorder is absent (iOS WKWebView / old browser)', () => {
    expect(
      decideOnDeviceEncode({ hasMediaRecorder: false, hasCaptureStream: true, tier: 'cinematic' }),
    ).toBe(false);
  });

  it('is FALSE when captureStream is absent', () => {
    expect(
      decideOnDeviceEncode({ hasMediaRecorder: true, hasCaptureStream: false, tier: 'lite' }),
    ).toBe(false);
  });

  it('is TRUE only on a 3D tier with both browser APIs present', () => {
    expect(
      decideOnDeviceEncode({ hasMediaRecorder: true, hasCaptureStream: true, tier: 'cinematic' }),
    ).toBe(true);
    expect(
      decideOnDeviceEncode({ hasMediaRecorder: true, hasCaptureStream: true, tier: 'lite' }),
    ).toBe(true);
  });
});

describe('readEncodeCapabilitySignals + canSupportOnDeviceEncode (node env)', () => {
  it('reports both browser signals false under the node test runner', () => {
    // No window.MediaRecorder and no HTMLCanvasElement.captureStream in node -> the
    // signals must be false so the pure decision serves the fallback.
    const signals = readEncodeCapabilitySignals('cinematic');
    expect(signals.hasMediaRecorder).toBe(false);
    expect(signals.hasCaptureStream).toBe(false);
    expect(signals.tier).toBe('cinematic');
  });

  it('canSupportOnDeviceEncode is false headless (SSR-safe fallback path)', () => {
    expect(canSupportOnDeviceEncode('cinematic')).toBe(false);
    expect(canSupportOnDeviceEncode('2d')).toBe(false);
  });
});

describe('pickWebmMimeType: prefers vp9, falls to vp8/webm, null when none', () => {
  it('returns the first supported mime in the preference chain', () => {
    expect(pickWebmMimeType(() => true)).toBe(WEBM_MIME_PREFERENCES[0]);
  });

  it('falls through to vp8 when vp9 is unsupported', () => {
    const supported = new Set(['video/webm;codecs=vp8', 'video/webm']);
    expect(pickWebmMimeType((m) => supported.has(m))).toBe('video/webm;codecs=vp8');
  });

  it('returns null when no WebM mime is supported (caller serves the fallback)', () => {
    expect(pickWebmMimeType(() => false)).toBeNull();
  });

  it('treats a throwing predicate as unsupported and never throws', () => {
    expect(
      pickWebmMimeType(() => {
        throw new Error('boom');
      }),
    ).toBeNull();
  });
});

describe('buildCapturePlan: validity + timing', () => {
  it('is valid for a two-plus scan ordered range', () => {
    const plan = buildCapturePlan({ startIndex: 0, endIndex: 2 }, 3);
    expect(plan.valid).toBe(true);
    expect(plan.range).toEqual({ startIndex: 0, endIndex: 2 });
    expect(plan.fps).toBe(CLIP_CAPTURE_FPS);
    expect(plan.playDurationMs).toBe(CLIP_PLAY_DURATION_MS);
    expect(plan.totalDurationMs).toBe(CLIP_TOTAL_DURATION_MS);
  });

  it('is INVALID with fewer than two scans (no fake one-frame video)', () => {
    expect(buildCapturePlan({ startIndex: 0, endIndex: 0 }, 1).valid).toBe(false);
    expect(buildCapturePlan({ startIndex: 0, endIndex: 0 }, 0).valid).toBe(false);
  });

  it('is INVALID for an unordered range (end not after start)', () => {
    expect(buildCapturePlan({ startIndex: 2, endIndex: 1 }, 3).valid).toBe(false);
    expect(buildCapturePlan({ startIndex: 1, endIndex: 1 }, 3).valid).toBe(false);
  });

  it('clamps out-of-bounds indices into range', () => {
    const plan = buildCapturePlan({ startIndex: -5, endIndex: 99 }, 4);
    expect(plan.range.startIndex).toBe(0);
    expect(plan.range.endIndex).toBe(3);
    expect(plan.valid).toBe(true);
  });
});

describe('rangeLength (coarse telemetry field)', () => {
  it('counts inclusive span', () => {
    expect(rangeLength({ startIndex: 0, endIndex: 2 })).toBe(3);
    expect(rangeLength({ startIndex: 1, endIndex: 1 })).toBe(1);
  });
  it('is 0 for an unordered range', () => {
    expect(rangeLength({ startIndex: 3, endIndex: 1 })).toBe(0);
  });
});
