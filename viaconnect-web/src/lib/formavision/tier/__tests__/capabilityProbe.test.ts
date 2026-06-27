// Tests for the FormaVision capability probe (Prompt 210b, P7-T1).
//
// decideInitialTier is a PURE function of device signals, so every branch is
// exercised here with explicit signals (no environment needed). The probe is
// deliberately conservative: a wrong 'lite' guess can never be undone at runtime
// (the ladder never steps UP), while a too-optimistic 'cinematic' guess is caught
// by the runtime frame-budget monitor, so 'lite' is only chosen on a strong single
// low-power signal or two corroborating weak ones, and anything unknown stays
// 'cinematic'. probeRenderTier is the SSR-safe wrapper: in the node runner there
// is no window/document/coarse-pointer, so it must default to cinematic and never
// throw.

import { describe, it, expect } from 'vitest';
import {
  decideInitialTier,
  probeRenderTier,
  LOW_MEMORY_GB_STRONG,
  LOW_MEMORY_GB_COMBINED,
  LOW_CORE_COUNT_COMBINED,
} from '../capabilityProbe';
import type { CapabilitySignals } from '../types';

describe('decideInitialTier', () => {
  it('defaults to cinematic when no signals are known (SSR / unknown device)', () => {
    expect(decideInitialTier({})).toBe('cinematic');
  });

  it('picks cinematic for a capable desktop (ample memory, many cores, fine pointer, hardware GPU)', () => {
    const signals: CapabilitySignals = {
      deviceMemory: 8,
      hardwareConcurrency: 16,
      coarsePointer: false,
      rendererString: 'ANGLE (NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)',
    };
    expect(decideInitialTier(signals)).toBe('cinematic');
  });

  it('picks lite for a software / low-power renderer regardless of other signals', () => {
    expect(decideInitialTier({ rendererString: 'Google SwiftShader' })).toBe('lite');
    expect(decideInitialTier({ rendererString: 'llvmpipe (LLVM 12.0.0, 256 bits)' })).toBe('lite');
    expect(decideInitialTier({ rendererString: 'Microsoft Basic Render Driver' })).toBe('lite');
  });

  it('picks lite on very low memory alone', () => {
    expect(decideInitialTier({ deviceMemory: LOW_MEMORY_GB_STRONG })).toBe('lite');
    expect(decideInitialTier({ deviceMemory: 1 })).toBe('lite');
  });

  it('does NOT downgrade a fine-pointer device on mid memory or core count alone (conservative; the monitor backstops)', () => {
    expect(decideInitialTier({ deviceMemory: 4, coarsePointer: false })).toBe('cinematic');
    expect(decideInitialTier({ hardwareConcurrency: 4, coarsePointer: false })).toBe('cinematic');
    expect(decideInitialTier({ hardwareConcurrency: 4 })).toBe('cinematic');
  });

  it('picks lite for a touch device that is also memory- or core-constrained (combined signals)', () => {
    expect(
      decideInitialTier({ coarsePointer: true, deviceMemory: LOW_MEMORY_GB_COMBINED }),
    ).toBe('lite');
    expect(
      decideInitialTier({ coarsePointer: true, hardwareConcurrency: LOW_CORE_COUNT_COMBINED }),
    ).toBe('lite');
  });

  it('keeps a high-end touch device on cinematic (coarse pointer but plenty of memory and cores)', () => {
    expect(
      decideInitialTier({ coarsePointer: true, deviceMemory: 8, hardwareConcurrency: 8 }),
    ).toBe('cinematic');
  });

  it('is deterministic: identical signals yield identical tiers', () => {
    const signals: CapabilitySignals = { coarsePointer: true, hardwareConcurrency: 4 };
    expect(decideInitialTier(signals)).toBe(decideInitialTier(signals));
    expect(decideInitialTier(signals)).toBe('lite');
  });
});

describe('probeRenderTier (SSR / node)', () => {
  it('returns cinematic in the node runner (no window, no document, no coarse pointer)', () => {
    // No DOM here, so the renderer hint and matchMedia are unavailable and the
    // combined low-power rules cannot fire; the probe must default to cinematic.
    expect(probeRenderTier()).toBe('cinematic');
  });

  it('never throws', () => {
    expect(() => probeRenderTier()).not.toThrow();
  });
});
