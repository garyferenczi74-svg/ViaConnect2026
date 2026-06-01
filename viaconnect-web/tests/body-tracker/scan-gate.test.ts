// Tests for scan-gate.ts (Prompt #169a, realigned to the #169f TIER MODEL).
//
// These exercise the REAL guard-point selection logic that the body-scan guard
// surfaces consume:
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
// Under #169f, Body Scan is Platinum-and-above only and the free teaser is
// RETIRED, so the gate is binary: entitled vs a Platinum upgrade prompt. The
// behaviors the spec requires:
//   entitled       -> normal entry / capture allowed / tabs unlocked
//   not entitled   -> upgrade prompt / capture blocked / tabs locked

import { describe, it, expect } from 'vitest';
import {
  selectScanEntryGate,
  selectScanCaptureGate,
  selectScanResultsGate,
  type ScanGateEntitlement,
} from '@/lib/body-tracker/scan-gate';

// The two canonical consumer states the guard points discriminate.
const ENTITLED: ScanGateEntitlement = { entitled: true };
const NOT_ENTITLED: ScanGateEntitlement = { entitled: false };

// ===========================================================================
// 3.1.a  Dashboard / entry card
// ===========================================================================

describe('selectScanEntryGate (dashboard / entry, spec 3.1.a)', () => {
  it('not entitled -> Platinum upgrade prompt', () => {
    expect(selectScanEntryGate(NOT_ENTITLED)).toBe('upgrade_platinum');
  });

  it('entitled -> normal entry (no upgrade prompt)', () => {
    expect(selectScanEntryGate(ENTITLED)).toBe('normal');
  });
});

// ===========================================================================
// 3.1.b  Pre-capture re-check
// ===========================================================================

describe('selectScanCaptureGate (pre-capture, spec 3.1.b)', () => {
  it('entitled -> capture allowed', () => {
    expect(selectScanCaptureGate(ENTITLED).allowed).toBe(true);
  });

  it('not entitled -> capture blocked, routed to the Platinum upgrade prompt', () => {
    expect(selectScanCaptureGate(NOT_ENTITLED).allowed).toBe(false);
  });

  it('a non-entitled consumer is blocked, never silently downgraded', () => {
    // The block (not a downgrade) is the evidence: allowed=false forces the
    // upgrade prompt rather than running a degraded scan.
    expect(selectScanCaptureGate(NOT_ENTITLED).allowed).toBe(false);
  });
});

// ===========================================================================
// 3.1.c  Results upgrade card + locked tabs
// ===========================================================================

describe('selectScanResultsGate (results upgrade card, spec 3.1.c)', () => {
  it('not entitled -> premium tabs locked + upgrade prompt shown', () => {
    const gate = selectScanResultsGate(NOT_ENTITLED);
    expect(gate.premiumTabsUnlocked).toBe(false);
    expect(gate.showPaywall).toBe(true);
  });

  it('entitled -> premium tabs unlocked + no upgrade prompt', () => {
    const gate = selectScanResultsGate(ENTITLED);
    expect(gate.premiumTabsUnlocked).toBe(true);
    expect(gate.showPaywall).toBe(false);
  });

  it('premium unlock and upgrade prompt are mutually exclusive across all states', () => {
    for (const state of [ENTITLED, NOT_ENTITLED]) {
      const gate = selectScanResultsGate(state);
      expect(gate.premiumTabsUnlocked).toBe(!gate.showPaywall);
    }
  });
});

// ===========================================================================
// Cross-guard consistency: the three guard points agree on each consumer state.
// ===========================================================================

describe('guard-point consistency across the three surfaces', () => {
  it('entitled: normal entry, capture allowed, tabs unlocked', () => {
    expect(selectScanEntryGate(ENTITLED)).toBe('normal');
    expect(selectScanCaptureGate(ENTITLED).allowed).toBe(true);
    expect(selectScanResultsGate(ENTITLED).premiumTabsUnlocked).toBe(true);
  });

  it('not entitled: upgrade prompt, capture blocked, results upgrade prompt', () => {
    expect(selectScanEntryGate(NOT_ENTITLED)).toBe('upgrade_platinum');
    expect(selectScanCaptureGate(NOT_ENTITLED).allowed).toBe(false);
    expect(selectScanResultsGate(NOT_ENTITLED).showPaywall).toBe(true);
  });
});
