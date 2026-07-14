/**
 * Prompt 211b Workstream 1B: render tests for GatedReportPanel.
 *
 * Uses react-dom/server renderToStaticMarkup (node-safe, no jsdom), mirroring
 * ScanAccuracyClaim.bare.test.tsx / ConfidenceChip.bare.test.tsx.
 *
 * HARD RULE under test: no digit-percent accuracy figure renders in ANY
 * closed-gate state (no_run / held_out_failed / pending_sign_off). A number
 * renders ONLY in the open state (held_out_pass && gary_signed_off both true
 * on the underlying persisted run).
 *
 * No em-dashes, no en-dashes in this source file.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GatedReportPanel from '../GatedReportPanel';
import type { GatedAccuracyState } from '@/lib/arnold/scanning/cohort/cohortClaimGate';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function render(gate: GatedAccuracyState | null): string {
  return renderToStaticMarkup(React.createElement(GatedReportPanel, { gate }));
}

// ---------------------------------------------------------------------------
// Loading state (gate === null)
// ---------------------------------------------------------------------------

describe('GatedReportPanel - loading (gate=null)', () => {
  const html = render(null);

  it('renders without crashing', () => {
    expect(html.length).toBeGreaterThan(0);
  });

  it('does not render any digit-percent figure', () => {
    expect(html).not.toMatch(/\d+(\.\d+)?%/);
  });
});

// ---------------------------------------------------------------------------
// Closed states -- pre-cohort, honest gated copy, NEVER a number
// ---------------------------------------------------------------------------

describe('GatedReportPanel - closed: no_run', () => {
  const gate: GatedAccuracyState = { status: 'closed', accuracyClaim: 'unproven', reason: 'no_run' };
  const html = render(gate);

  it('renders without crashing', () => {
    expect(html.length).toBeGreaterThan(0);
  });

  it('does NOT render any digit-percent accuracy figure', () => {
    expect(html).not.toMatch(/\d+(\.\d+)?%/);
  });

  it('renders the honest no_run copy', () => {
    expect(html.toLowerCase()).toContain('has not yet been run');
  });

  it('renders "Not yet proven"', () => {
    expect(html).toContain('Not yet proven');
  });

  it('contains no em-dashes', () => {
    expect(html).not.toContain(EM_DASH);
  });

  it('contains no en-dashes', () => {
    expect(html).not.toContain(EN_DASH);
  });
});

describe('GatedReportPanel - closed: held_out_failed', () => {
  const gate: GatedAccuracyState = { status: 'closed', accuracyClaim: 'unproven', reason: 'held_out_failed' };
  const html = render(gate);

  it('does NOT render any digit-percent accuracy figure', () => {
    expect(html).not.toMatch(/\d+(\.\d+)?%/);
  });

  it('renders the honest held_out_failed copy', () => {
    expect(html.toLowerCase()).toContain('not yet publishable');
  });
});

describe('GatedReportPanel - closed: pending_sign_off', () => {
  const gate: GatedAccuracyState = { status: 'closed', accuracyClaim: 'unproven', reason: 'pending_sign_off' };
  const html = render(gate);

  it('does NOT render any digit-percent accuracy figure', () => {
    expect(html).not.toMatch(/\d+(\.\d+)?%/);
  });

  it('renders the honest pending_sign_off copy', () => {
    expect(html.toLowerCase()).toContain('pending review');
  });

  it('explains the sign-off gate condition without fabricating a number', () => {
    expect(html.toLowerCase()).toContain('gary signs off');
  });
});

// ---------------------------------------------------------------------------
// Open state -- gate cleared, real per-region figures are safe to render
// ---------------------------------------------------------------------------

describe('GatedReportPanel - open (gate cleared)', () => {
  const gate: GatedAccuracyState = {
    status: 'open',
    accuracyClaim: 'proven',
    runId: 'run-123',
    runAt: '2026-08-01T00:00:00Z',
    calibrationVersion: 'v1-uncalibrated-2026-06',
    report: {
      perRegion: {},
      heldOutPerRegion: {
        waist: { mape: 4.2, withinTolerancePct: 0.95, icc: 0.93, bias: 0.1, n: 40 },
      },
      overallPass: true,
      heldOutPass: true,
      calibrationVersion: 'v1-uncalibrated-2026-06',
      fittedConfig: { version: 'v2-fitted-2026-08-01', factors: {} },
      cohortStatus: 'proven',
      minimumCohortNote: 'ok',
    },
  };
  const html = render(gate);

  it('renders without crashing', () => {
    expect(html.length).toBeGreaterThan(0);
  });

  it('renders the proven per-region figure (gate is legitimately open)', () => {
    expect(html).toMatch(/4\.2%/);
  });

  it('renders "Proven, signed off"', () => {
    expect(html).toContain('Proven, signed off');
  });

  it('contains no em-dashes', () => {
    expect(html).not.toContain(EM_DASH);
  });

  it('contains no en-dashes', () => {
    expect(html).not.toContain(EN_DASH);
  });
});
