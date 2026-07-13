// Prompt 211b Workstream 1A -- TDD tests for cohortClaimGate.ts.
//
// Tests the claim gate: gate is closed unless heldOutPass && garySignedOff.
// RED first (written before implementation), then GREEN.
//
// HONESTY INVARIANT (non-negotiable):
//   The gate must NEVER return status='open' unless BOTH conditions are true.
//   Every 'open' branch in these tests asserts both flags are true on the input.
//   Every 'closed' branch asserts the gate stays closed despite a partial pass.

import { describe, it, expect } from 'vitest';
import {
  evaluateClaimGate,
  closedGateCopy,
} from '../cohortClaimGate';
import type { ClaimGateDb, LatestValidationRunRow } from '../cohortClaimGate';
import type { ValidationReport } from '../../accuracy/validationHarness';
import { CALIBRATION_VERSION } from '../../accuracy/calibrationConfig';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeReport(overrides: Partial<ValidationReport> = {}): ValidationReport {
  return {
    perRegion:         {},
    heldOutPerRegion:  {},
    overallPass:       false,
    heldOutPass:       false,
    calibrationVersion: CALIBRATION_VERSION,
    fittedConfig:      { version: 'v2-fitted-2026-07-12', factors: {} },
    cohortStatus:      'unproven',
    minimumCohortNote: 'Minimum cohort: 30 pairs per region.',
    ...overrides,
  };
}

function makeRun(
  held_out_pass: boolean,
  gary_signed_off: boolean,
  overrides: Partial<LatestValidationRunRow> = {},
): LatestValidationRunRow {
  return {
    id:                   'run-1',
    run_at:               '2026-07-12T22:00:00.000Z',
    calibration_version:  CALIBRATION_VERSION,
    report:               makeReport({ heldOutPass: held_out_pass }),
    held_out_pass,
    gary_signed_off,
    ...overrides,
  };
}

function dbWith(row: LatestValidationRunRow | null): ClaimGateDb {
  return { fetchLatestRun: async () => row };
}

// ---------------------------------------------------------------------------
// 1. Gate closed: no run exists
// ---------------------------------------------------------------------------

describe('evaluateClaimGate: no run', () => {
  it('returns status=closed and reason=no_run when DB has no row', async () => {
    const state = await evaluateClaimGate(dbWith(null));
    expect(state.status).toBe('closed');
    if (state.status === 'closed') {
      expect(state.reason).toBe('no_run');
      expect(state.accuracyClaim).toBe('unproven');
    }
  });

  it('does not leak any accuracy figure when no run exists', async () => {
    const state = await evaluateClaimGate(dbWith(null));
    // No 'report' key must exist on the closed state
    expect('report' in state).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Gate closed: held_out_pass is false
// ---------------------------------------------------------------------------

describe('evaluateClaimGate: held_out_pass=false', () => {
  it('returns status=closed and reason=held_out_failed when held_out_pass is false', async () => {
    const state = await evaluateClaimGate(dbWith(makeRun(false, false)));
    expect(state.status).toBe('closed');
    if (state.status === 'closed') {
      expect(state.reason).toBe('held_out_failed');
    }
  });

  it('stays closed even when gary_signed_off is true but held_out_pass is false', async () => {
    // Gary cannot sign off a failed run and open the gate.
    const state = await evaluateClaimGate(dbWith(makeRun(false, true)));
    expect(state.status).toBe('closed');
    if (state.status === 'closed') {
      expect(state.reason).toBe('held_out_failed');
    }
  });

  it('does not expose the report when held_out_pass is false', async () => {
    const state = await evaluateClaimGate(dbWith(makeRun(false, false)));
    expect('report' in state).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Gate closed: held_out_pass=true but gary has not signed off
// ---------------------------------------------------------------------------

describe('evaluateClaimGate: pending sign-off', () => {
  it('returns status=closed and reason=pending_sign_off when gary_signed_off is false', async () => {
    const state = await evaluateClaimGate(dbWith(makeRun(true, false)));
    expect(state.status).toBe('closed');
    if (state.status === 'closed') {
      expect(state.reason).toBe('pending_sign_off');
    }
  });

  it('does not expose the report while sign-off is pending', async () => {
    const state = await evaluateClaimGate(dbWith(makeRun(true, false)));
    expect('report' in state).toBe(false);
  });

  it('accuracyClaim is unproven while sign-off is pending', async () => {
    const state = await evaluateClaimGate(dbWith(makeRun(true, false)));
    if (state.status === 'closed') {
      expect(state.accuracyClaim).toBe('unproven');
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Gate open: held_out_pass=true AND gary_signed_off=true
// ---------------------------------------------------------------------------

describe('evaluateClaimGate: gate open', () => {
  it('returns status=open when both held_out_pass and gary_signed_off are true', async () => {
    const row = makeRun(true, true, {
      report: makeReport({ heldOutPass: true, cohortStatus: 'proven' }),
    });
    const state = await evaluateClaimGate(dbWith(row));
    expect(state.status).toBe('open');
  });

  it('accuracyClaim is "proven" when gate is open', async () => {
    const row = makeRun(true, true, {
      report: makeReport({ heldOutPass: true, cohortStatus: 'proven' }),
    });
    const state = await evaluateClaimGate(dbWith(row));
    if (state.status === 'open') {
      expect(state.accuracyClaim).toBe('proven');
    }
  });

  it('exposes the report when gate is open', async () => {
    const report = makeReport({ heldOutPass: true, cohortStatus: 'proven' });
    const row = makeRun(true, true, { report });
    const state = await evaluateClaimGate(dbWith(row));
    if (state.status === 'open') {
      expect(state.report).toBeDefined();
      expect(state.report.cohortStatus).toBe('proven');
    }
  });

  it('exposes runId and runAt when gate is open', async () => {
    const row = makeRun(true, true, {
      id:     'run-open-1',
      run_at: '2026-07-12T22:00:00.000Z',
      report: makeReport({ heldOutPass: true, cohortStatus: 'proven' }),
    });
    const state = await evaluateClaimGate(dbWith(row));
    if (state.status === 'open') {
      expect(state.runId).toBe('run-open-1');
      expect(state.runAt).toBe('2026-07-12T22:00:00.000Z');
    }
  });

  it('exposes calibrationVersion when gate is open', async () => {
    const row = makeRun(true, true, {
      calibration_version: CALIBRATION_VERSION,
      report:              makeReport({ heldOutPass: true, cohortStatus: 'proven' }),
    });
    const state = await evaluateClaimGate(dbWith(row));
    if (state.status === 'open') {
      expect(state.calibrationVersion).toBe(CALIBRATION_VERSION);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. closedGateCopy: honest placeholder text for UI consumers
// ---------------------------------------------------------------------------

describe('closedGateCopy: honest text for each reason', () => {
  it('returns non-empty text for no_run', () => {
    expect(closedGateCopy('no_run').length).toBeGreaterThan(0);
  });

  it('returns non-empty text for held_out_failed', () => {
    expect(closedGateCopy('held_out_failed').length).toBeGreaterThan(0);
  });

  it('returns non-empty text for pending_sign_off', () => {
    expect(closedGateCopy('pending_sign_off').length).toBeGreaterThan(0);
  });

  it('copy for no_run does not contain a percentage figure (no fabrication)', () => {
    const copy = closedGateCopy('no_run');
    expect(copy).not.toMatch(/\d+%/);
  });

  it('copy for held_out_failed does not contain a percentage figure (no fabrication)', () => {
    const copy = closedGateCopy('held_out_failed');
    expect(copy).not.toMatch(/\d+%/);
  });

  it('copy for pending_sign_off does not contain a percentage figure (no fabrication)', () => {
    const copy = closedGateCopy('pending_sign_off');
    expect(copy).not.toMatch(/\d+%/);
  });
});
