// Tests for the IDEMPOTENT-RESUME guard added in Prompt #169b Task 20 review fix
// (the duplicate-body_scan_measurements-on-sequential-resume Critical).
//
// THE DEFECT THIS LOCKS DOWN: runScanAnalysis.persistScan finalized with an
// UPDATE keyed only on the session id (no `.neq('scan_status','complete')`) and
// then ran an UNCONDITIONAL body_scan_measurements INSERT. The DB finalize
// trigger (migration 20260516000080) only fires on the TRANSITION to 'complete',
// so re-completing an already-complete session did not raise, finalizeError was
// null, and the INSERT ran a second time -> a duplicate measurement row.
//
// The fix is app-layer idempotency, factored into two PURE decision helpers that
// are unit tested here (the I/O probe measurementExists + the actual UPDATE/INSERT
// are exercised by the existing suite + tsc):
//   * shouldReturnPersisted(scanStatus, hasMeasurementRow) -> whether to
//     short-circuit and return the already-persisted result (true ONLY when the
//     session is already 'complete' AND a measurement row already exists).
//   * reconstructPersistedOutput(session) -> rebuild the ScanAnalysisOutput from
//     the persisted JSONB columns (or null when a result column is missing, so
//     the caller falls back to a duplicate-guarded recompute).
//
// PLUS the RunScanButton transient-attempt fix: a TRANSIENT live-capture failure
// records the attempt on the pending record (via the same recordTransientFailure
// reducer) so the backoff schedule starts from capture, not from the first
// background tick (a null last-attempt reads as immediately due, skipping 30s).
//
// Node-environment pure-logic tests (project convention). No Supabase, no DOM.

import { describe, it, expect } from 'vitest';
import {
  shouldReturnPersisted,
  reconstructPersistedOutput,
} from '@/lib/arnold/scanning/runScanAnalysis';
import type {
  ExtractedMeasurements,
  CompositionEstimate,
  AsymmetryReport,
  BodyModelParameters,
} from '@/lib/arnold/scanning/types';
import {
  makePendingItem,
  recordTransientFailure,
  isDueForRetry,
  nextRetryDelayMs,
  type CapturePayload,
} from '@/lib/body-tracker/pending-scan-sync';

// ---------------------------------------------------------------------------
// Minimal persisted-result fixtures. reconstructPersistedOutput does a
// structural passthrough of the JSONB columns (it does not validate the inner
// shape), so a lightweight cast is faithful to how a real persisted row is read.
// ---------------------------------------------------------------------------
const measurements = { waistToHipRatio: 0.85 } as unknown as ExtractedMeasurements;
const composition = { bodyFatPct: { low: 18, mid: 20, high: 22 } } as unknown as CompositionEstimate;
const asymmetry = { overallScore: 0.95, checks: [], flaggedAreas: [], recommendations: [] } as unknown as AsymmetryReport;
const avatarParameters = { heightCm: 180 } as unknown as BodyModelParameters;

function persistedSession(overrides: Partial<{
  extracted_measurements: ExtractedMeasurements | null;
  composition_estimate: CompositionEstimate | null;
  asymmetry_report: AsymmetryReport | null;
  avatar_parameters: BodyModelParameters | null;
  scan_quality_score: number | null;
  quality_issues: string[] | null;
}> = {}) {
  return {
    extracted_measurements: measurements,
    composition_estimate: composition,
    asymmetry_report: asymmetry,
    avatar_parameters: avatarParameters,
    scan_quality_score: 0.8,
    quality_issues: ['lighting_front'],
    ...overrides,
  };
}

// ===========================================================================
// shouldReturnPersisted: the short-circuit decision (no recompute, no re-insert)
// ===========================================================================

describe('shouldReturnPersisted (re-run of an already-finalized session is a no-op)', () => {
  it('short-circuits ONLY when already complete AND a measurement row exists', () => {
    // The resume case the defect mishandled: prior run persisted, response lost.
    expect(shouldReturnPersisted('complete', true)).toBe(true);
  });

  it('does NOT short-circuit a normal FIRST run (not complete, no measurement)', () => {
    expect(shouldReturnPersisted('not_started', false)).toBe(false);
    expect(shouldReturnPersisted('extracting', false)).toBe(false);
    expect(shouldReturnPersisted('measuring', false)).toBe(false);
    expect(shouldReturnPersisted(null, false)).toBe(false);
    expect(shouldReturnPersisted(undefined, false)).toBe(false);
  });

  it('does NOT short-circuit when complete but NO measurement row yet (finalize succeeded, INSERT had not run)', () => {
    // This is the window where the original run finalized but crashed BEFORE the
    // INSERT. Re-running must PROCEED so the (single) measurement row gets written.
    expect(shouldReturnPersisted('complete', false)).toBe(false);
  });

  it('does NOT short-circuit when a measurement row exists but the session is not complete (defensive)', () => {
    expect(shouldReturnPersisted('measuring', true)).toBe(false);
    expect(shouldReturnPersisted('failed', true)).toBe(false);
  });
});

// ===========================================================================
// reconstructPersistedOutput: return the SAME result without recomputing
// ===========================================================================

describe('reconstructPersistedOutput (rebuild the prior result from persisted JSONB)', () => {
  it('rebuilds the full ScanAnalysisOutput from a complete persisted row', () => {
    const out = reconstructPersistedOutput(persistedSession());
    expect(out).not.toBeNull();
    expect(out!.measurements).toBe(measurements);
    expect(out!.composition).toBe(composition);
    expect(out!.asymmetry).toBe(asymmetry);
    expect(out!.avatarParameters).toBe(avatarParameters);
    expect(out!.qualityScore).toBe(0.8);
    expect(out!.qualityIssues).toEqual(['lighting_front']);
  });

  it('defaults missing quality fields (score -> 0, issues -> []) without failing', () => {
    const out = reconstructPersistedOutput(persistedSession({ scan_quality_score: null, quality_issues: null }));
    expect(out).not.toBeNull();
    expect(out!.qualityScore).toBe(0);
    expect(out!.qualityIssues).toEqual([]);
  });

  it('returns null when ANY required result column is missing (caller falls back to a duplicate-guarded recompute)', () => {
    expect(reconstructPersistedOutput(persistedSession({ extracted_measurements: null }))).toBeNull();
    expect(reconstructPersistedOutput(persistedSession({ composition_estimate: null }))).toBeNull();
    expect(reconstructPersistedOutput(persistedSession({ asymmetry_report: null }))).toBeNull();
    expect(reconstructPersistedOutput(persistedSession({ avatar_parameters: null }))).toBeNull();
  });
});

// ===========================================================================
// RunScanButton transient-attempt fix: stamp the attempt so the 30s tier applies
// ===========================================================================

describe('transient capture failure records the attempt (RunScanButton fix)', () => {
  const payload: CapturePayload = {
    sessionId: 'sess-resume-1',
    posePaths: { front: 'a.jpg', back: 'b.jpg' },
    weightKgAtScan: 80,
    heightCmAtScan: 180,
    tier: 1,
  };
  const t0 = 1_700_000_000_000;

  it('BEFORE the fix a freshly captured pending item is immediately due (the bug being fixed)', () => {
    // A just-persisted capture has lastAttemptAtMs === null. The schedule reads a
    // null last-attempt as "due now", so the first background tick would resume
    // instantly, skipping the 30s tier-1 backoff. The fix records the attempt.
    const fresh = makePendingItem(payload, t0);
    expect(fresh.lastAttemptAtMs).toBeNull();
    expect(isDueForRetry({ firstCapturedAtMs: fresh.firstCapturedAtMs, lastAttemptAtMs: fresh.lastAttemptAtMs, nowMs: t0 })).toBe(true);
  });

  it('AFTER recording the capture-time transient attempt, the next retry honors the 30s tier (NOT immediately due)', () => {
    const fresh = makePendingItem(payload, t0);
    // This mirrors exactly what RunScanButton.start() now does on a transient fail:
    // recordTransientFailure([pending], key, Date.now(), msg) then store.put.
    const [updated] = recordTransientFailure([fresh], fresh.processingKey, t0, 'Failed to fetch');
    expect(updated.lastAttemptAtMs).toBe(t0);
    expect(updated.attemptCount).toBe(1);
    expect(updated.lastError).toBe('Failed to fetch');

    // Right after the capture-time attempt it is NOT due (30s must elapse first).
    expect(isDueForRetry({ firstCapturedAtMs: updated.firstCapturedAtMs, lastAttemptAtMs: updated.lastAttemptAtMs, nowMs: t0 })).toBe(false);
    // The next attempt is scheduled a full tier-1 interval (30s) out from capture.
    expect(nextRetryDelayMs({ firstCapturedAtMs: updated.firstCapturedAtMs, lastAttemptAtMs: updated.lastAttemptAtMs, nowMs: t0 })).toBe(30_000);
    // ...and it becomes due once 30s have elapsed.
    expect(isDueForRetry({ firstCapturedAtMs: updated.firstCapturedAtMs, lastAttemptAtMs: updated.lastAttemptAtMs, nowMs: t0 + 30_000 })).toBe(true);
  });

  it('keeps the captured scan in the queue (transient never loses a scan)', () => {
    const fresh = makePendingItem(payload, t0);
    const next = recordTransientFailure([fresh], fresh.processingKey, t0, 'Load failed');
    expect(next).toHaveLength(1);
    expect(next[0].processingKey).toBe(fresh.processingKey);
  });
});
