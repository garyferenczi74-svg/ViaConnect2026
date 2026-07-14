// Prompt 211b Workstream 1B -- trigger + read the accuracy validation run.
//
// POST /api/admin/cohort/validation-runs
//   Loads cohort_labeled_measurements (joined with cohort_subjects.sex),
//   maps them via cohortLoader.rowsToLabeledSamples, runs runValidation(),
//   and persists the report via runAndPersist.runCohortValidationAndPersist.
//   The response NEVER returns the raw report or a bare accuracy number: it
//   evaluates the freshly-persisted run through cohortClaimGate.evaluateClaimGate
//   and returns that gated state. A brand-new run always has
//   gary_signed_off = false, so the response is always 'closed' immediately
//   after a trigger -- that is the honest, correct behavior (Gary must sign
//   off out of band before the gate can ever open).
//
// GET /api/admin/cohort/validation-runs
//   Returns the current gated state (evaluateClaimGate on the latest run)
//   without triggering a new run, for the admin console's report view.
//
// Auth: requireResearchAdmin() (401/403 for non-research-admins).
//
// HARD RULE: this route must never fabricate or leak an accuracy number.
// The claim gate is the single source of truth for whether a number may be
// shown; this route only ever returns the gate's own output.
//
// No em-dashes, no en-dashes. Zero `any`. No new dependency.

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireResearchAdmin } from '@/lib/arnold/scanning/cohort/researchAdminGuard';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { runCohortValidationAndPersist } from '@/lib/arnold/scanning/cohort/runAndPersist';
import type { CohortDb } from '@/lib/arnold/scanning/cohort/runAndPersist';
import type { CohortMeasurementRow } from '@/lib/arnold/scanning/cohort/cohortLoader';
import { evaluateClaimGate } from '@/lib/arnold/scanning/cohort/cohortClaimGate';
import type { ClaimGateDb, LatestValidationRunRow } from '@/lib/arnold/scanning/cohort/cohortClaimGate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// DB adapters -- build the CohortDb / ClaimGateDb interfaces against the
// injected admin (service-role) client. Kept as small pure functions so the
// wiring (cohortLoader -> runValidation -> runAndPersist -> claim gate) stays
// visible and independently testable.
// ---------------------------------------------------------------------------

interface RawMeasurementJoinRow {
  id: string;
  subject_id: string;
  region: string;
  predicted_cm: number;
  truth_cm: number;
  cohort_subjects: { sex: string | null } | { sex: string | null }[] | null;
}

function extractSex(joined: RawMeasurementJoinRow['cohort_subjects']): string | null {
  if (!joined) return null;
  if (Array.isArray(joined)) return joined[0]?.sex ?? null;
  return joined.sex ?? null;
}

export function buildCohortDb(admin: SupabaseClient): CohortDb {
  return {
    async fetchMeasurements(): Promise<CohortMeasurementRow[]> {
      const result = await withTimeout(
        Promise.resolve(
          admin
            .from('cohort_labeled_measurements')
            .select('id, subject_id, region, predicted_cm, truth_cm, cohort_subjects(sex)'),
        ),
        8000,
        'api.admin.cohort.validation-runs.fetchMeasurements',
      );

      if (result.error) {
        throw new Error(`Could not load labeled measurements: ${result.error.message}`);
      }

      const rows = (result.data ?? []) as unknown as RawMeasurementJoinRow[];
      return rows.map((r) => ({
        id: r.id,
        subject_id: r.subject_id,
        region: r.region,
        predicted_cm: r.predicted_cm,
        truth_cm: r.truth_cm,
        sex: extractSex(r.cohort_subjects),
      }));
    },

    async insertValidationRun(run) {
      const result = await withTimeout(
        Promise.resolve(admin.from('cohort_validation_runs').insert(run).select('id').single()),
        5000,
        'api.admin.cohort.validation-runs.insert',
      );

      if (result.error || !result.data) {
        throw new Error(
          `Could not persist validation run: ${result.error?.message ?? 'no row returned'}`,
        );
      }

      return { id: (result.data as { id: string }).id };
    },
  };
}

export function buildClaimGateDb(admin: SupabaseClient): ClaimGateDb {
  return {
    async fetchLatestRun(): Promise<LatestValidationRunRow | null> {
      const result = await withTimeout(
        Promise.resolve(
          admin
            .from('cohort_validation_runs')
            .select('id, run_at, calibration_version, report, held_out_pass, gary_signed_off')
            .order('run_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ),
        5000,
        'api.admin.cohort.validation-runs.fetchLatestForGate',
      );

      if (result.error || !result.data) return null;
      return result.data as LatestValidationRunRow;
    },
  };
}

// ---------------------------------------------------------------------------
// GET: current gated state, no new run triggered
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  const auth = await requireResearchAdmin();
  if (auth.kind === 'error') return auth.response;

  try {
    const admin = createAdminClient();
    const gate = await evaluateClaimGate(buildClaimGateDb(admin));
    return NextResponse.json({ gate });
  } catch (err) {
    safeLog.error('api.admin.cohort.validation-runs', 'unexpected error on gate read', {
      error: err,
      adminId: auth.user.id,
    });
    return NextResponse.json({ error: 'Could not read validation status' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST: trigger a new run -- cohortLoader -> runValidation -> runAndPersist,
// then respond with the gated state (never the raw report/number).
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireResearchAdmin();
  if (auth.kind === 'error') return auth.response;

  let notes: string | null = null;
  try {
    const raw: unknown = await req.json();
    if (raw && typeof raw === 'object' && 'notes' in raw) {
      const n = (raw as { notes?: unknown }).notes;
      notes = typeof n === 'string' ? n : null;
    }
  } catch {
    // No body / invalid JSON is fine -- notes is optional.
    notes = null;
  }

  try {
    const admin = createAdminClient();
    const persisted = await runCohortValidationAndPersist(buildCohortDb(admin), notes);

    safeLog.info('api.admin.cohort.validation-runs', 'validation run triggered', {
      runId: persisted.runId,
      totalSamples: persisted.totalSamples,
      skippedRows: persisted.skippedRows,
      heldOutPass: persisted.report.heldOutPass,
      adminId: auth.user.id,
    });

    const gate = await evaluateClaimGate(buildClaimGateDb(admin));

    return NextResponse.json(
      {
        runId: persisted.runId,
        totalSamples: persisted.totalSamples,
        skippedRows: persisted.skippedRows,
        gate,
      },
      { status: 201 },
    );
  } catch (err) {
    safeLog.error('api.admin.cohort.validation-runs', 'run trigger failed', {
      error: err,
      adminId: auth.user.id,
    });
    return NextResponse.json({ error: 'Could not run validation' }, { status: 500 });
  }
}
