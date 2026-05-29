// Tests for scan-gate.ts (Prompt #169a, spec section 3.1).
//
// These exercise the REAL guard-point selection logic that the three body-scan
// guard surfaces consume:
//   selectScanEntryGate    (3.1.a dashboard / entry card)
//   selectScanCaptureGate  (3.1.b pre-capture re-check)
//   selectScanResultsGate  (3.1.c results upgrade card + locked tabs)
//
// The project's vitest config runs node-environment .test.ts only, so the
// testable contract lives in the pure selection functions (the React components
// are thin wrappers that render the chosen surface). This mirrors the existing
// flag-upgrade-card.test.ts pattern (pure copy/selection helper tested directly)
// and the entitlement-check.test.ts pattern (pure decision tested directly).
//
// The three behaviors the spec requires are asserted end to end:
//   teaser unused                -> free-teaser banner / capture allowed
//   teaser used + non-premium    -> paywall / capture blocked / tabs locked
//   premium                      -> normal entry / capture allowed / tabs unlocked

import { describe, it, expect } from 'vitest';
import {
  selectScanEntryGate,
  selectScanCaptureGate,
  selectScanResultsGate,
  type ScanGateEntitlement,
} from '@/lib/body-tracker/scan-gate';

// The three canonical consumer states the guard points discriminate.
const PREMIUM: ScanGateEntitlement = { premium: true, freeTeaserUsed: false };
const PREMIUM_TEASER_USED: ScanGateEntitlement = { premium: true, freeTeaserUsed: true };
const TEASER_UNUSED: ScanGateEntitlement = { premium: false, freeTeaserUsed: false };
const TEASER_USED: ScanGateEntitlement = { premium: false, freeTeaserUsed: true };

// ===========================================================================
// 3.1.a  Dashboard / entry card
// ===========================================================================

describe('selectScanEntryGate (dashboard / entry, spec 3.1.a)', () => {
  it('non-premium + teaser unused -> free-teaser banner', () => {
    expect(selectScanEntryGate(TEASER_UNUSED)).toBe('free_teaser');
  });

  it('non-premium + teaser used -> paywall', () => {
    expect(selectScanEntryGate(TEASER_USED)).toBe('paywall');
  });

  it('premium -> normal entry (no banner, no paywall)', () => {
    expect(selectScanEntryGate(PREMIUM)).toBe('normal');
  });

  it('premium takes precedence even if the teaser flag is set', () => {
    // A consumer who used the free teaser and later upgraded must see the
    // normal entry, never the paywall.
    expect(selectScanEntryGate(PREMIUM_TEASER_USED)).toBe('normal');
  });
});

// ===========================================================================
// 3.1.b  Pre-capture re-check
// ===========================================================================

describe('selectScanCaptureGate (pre-capture, spec 3.1.b)', () => {
  it('non-premium + teaser unused -> capture allowed (the one free scan)', () => {
    const gate = selectScanCaptureGate(TEASER_UNUSED);
    expect(gate.allowed).toBe(true);
    expect(gate.teaserExhausted).toBe(false);
  });

  it('non-premium + teaser used -> capture blocked, routed to paywall', () => {
    const gate = selectScanCaptureGate(TEASER_USED);
    expect(gate.allowed).toBe(false);
    expect(gate.teaserExhausted).toBe(true);
  });

  it('premium -> capture allowed, not a teaser path', () => {
    const gate = selectScanCaptureGate(PREMIUM);
    expect(gate.allowed).toBe(true);
    expect(gate.teaserExhausted).toBe(false);
  });

  it('a teaser-exhausted non-premium consumer is blocked, never silently downgraded', () => {
    // The block (not a downgrade) is the evidence: allowed=false forces the
    // upgrade prompt rather than running a degraded scan.
    const gate = selectScanCaptureGate(TEASER_USED);
    expect(gate.allowed).toBe(false);
  });
});

// ===========================================================================
// 3.1.c  Results upgrade card + locked tabs
// ===========================================================================

describe('selectScanResultsGate (results upgrade card, spec 3.1.c)', () => {
  it('non-premium -> premium tabs locked + paywall shown (teaser used)', () => {
    const gate = selectScanResultsGate(TEASER_USED);
    expect(gate.premiumTabsUnlocked).toBe(false);
    expect(gate.showPaywall).toBe(true);
  });

  it('non-premium -> premium tabs locked + paywall shown (teaser unused, just spent on this scan)', () => {
    // After a free-teaser scan the consumer is still non-premium; the Compare /
    // Insights tabs render locked as the upgrade evidence regardless of the
    // teaser flag's exact value at render time.
    const gate = selectScanResultsGate(TEASER_UNUSED);
    expect(gate.premiumTabsUnlocked).toBe(false);
    expect(gate.showPaywall).toBe(true);
  });

  it('premium -> premium tabs unlocked + no paywall', () => {
    const gate = selectScanResultsGate(PREMIUM);
    expect(gate.premiumTabsUnlocked).toBe(true);
    expect(gate.showPaywall).toBe(false);
  });

  it('premium unlock and paywall are mutually exclusive across all states', () => {
    for (const state of [PREMIUM, PREMIUM_TEASER_USED, TEASER_UNUSED, TEASER_USED]) {
      const gate = selectScanResultsGate(state);
      expect(gate.premiumTabsUnlocked).toBe(!gate.showPaywall);
    }
  });
});

// ===========================================================================
// Cross-guard consistency: the three guard points agree on each consumer state.
// ===========================================================================

describe('guard-point consistency across the three surfaces', () => {
  it('premium: normal entry, capture allowed, tabs unlocked', () => {
    expect(selectScanEntryGate(PREMIUM)).toBe('normal');
    expect(selectScanCaptureGate(PREMIUM).allowed).toBe(true);
    expect(selectScanResultsGate(PREMIUM).premiumTabsUnlocked).toBe(true);
  });

  it('non-premium + teaser unused: banner, capture allowed, results paywall', () => {
    expect(selectScanEntryGate(TEASER_UNUSED)).toBe('free_teaser');
    expect(selectScanCaptureGate(TEASER_UNUSED).allowed).toBe(true);
    expect(selectScanResultsGate(TEASER_UNUSED).showPaywall).toBe(true);
  });

  it('non-premium + teaser used: paywall, capture blocked, results paywall', () => {
    expect(selectScanEntryGate(TEASER_USED)).toBe('paywall');
    expect(selectScanCaptureGate(TEASER_USED).allowed).toBe(false);
    expect(selectScanResultsGate(TEASER_USED).showPaywall).toBe(true);
  });
});
