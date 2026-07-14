// Prompt 211b Workstream 1B -- labeled measurement pair entry API.
//
// GET  /api/admin/cohort/measurements?subject_id=...&session_id=...
//   Lists cohort_labeled_measurements rows, optionally filtered by subject_id
//   and/or session_id, for the admin console session view.
//
// POST /api/admin/cohort/measurements
//   Batch-inserts labeled measurement pairs (predicted_cm vs truth_cm) for
//   one subject + session. region must match the GirthRegion union in
//   accuracyTargets.ts exactly (matches the cohort_labeled_measurements CHECK
//   constraint). measurer_id defaults to the authenticated admin's id when
//   omitted (the person entering the data is presumed to be the measurer
//   unless another researcher's id is explicitly supplied).
//
// Auth: requireResearchAdmin() (401/403 for non-research-admins). Writes use
// createAdminClient() (service-role).
//
// No em-dashes, no en-dashes. Zero `any`. No new dependency.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireResearchAdmin } from '@/lib/arnold/scanning/cohort/researchAdminGuard';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Region list -- mirrors GirthRegion in accuracyTargets.ts and the
// cohort_labeled_measurements CHECK constraint exactly.
// ---------------------------------------------------------------------------

export const GIRTH_REGIONS = [
  'neck', 'upperArm', 'forearm', 'upperLeg', 'lowerLeg', 'chest', 'waist', 'hip',
] as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const MeasurementPairSchema = z.object({
  region: z.enum(GIRTH_REGIONS),
  predicted_cm: z.number().positive('predicted_cm must be positive'),
  truth_cm: z.number().positive('truth_cm must be positive'),
});

export const AddMeasurementsSchema = z.object({
  subject_id: z.string().uuid('subject_id must be a valid uuid'),
  session_id: z.string().uuid('session_id must be a valid uuid'),
  measurer_id: z.string().uuid().nullable().optional(),
  measurements: z.array(MeasurementPairSchema).min(1, 'at least one measurement pair is required').max(100),
});

export type AddMeasurementsInput = z.infer<typeof AddMeasurementsSchema>;

// ---------------------------------------------------------------------------
// GET: list measurements, optionally filtered
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireResearchAdmin();
  if (auth.kind === 'error') return auth.response;

  const subjectId = req.nextUrl.searchParams.get('subject_id');
  const sessionId = req.nextUrl.searchParams.get('session_id');

  try {
    const admin = createAdminClient();

    let query = admin
      .from('cohort_labeled_measurements')
      .select('id, subject_id, region, predicted_cm, truth_cm, session_id, measurer_id, created_at');

    if (subjectId) query = query.eq('subject_id', subjectId);
    if (sessionId) query = query.eq('session_id', sessionId);

    const result = await withTimeout(
      Promise.resolve(query.order('created_at', { ascending: false })),
      4000,
      'api.admin.cohort.measurements.list',
    );

    if (result.error) {
      safeLog.error('api.admin.cohort.measurements', 'list query failed', { error: result.error });
      return NextResponse.json({ error: 'Could not load labeled measurements' }, { status: 500 });
    }

    return NextResponse.json({ measurements: result.data ?? [] });
  } catch (err) {
    safeLog.error('api.admin.cohort.measurements', 'unexpected error on list', { error: err });
    return NextResponse.json({ error: 'Could not load labeled measurements' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST: batch-insert labeled measurement pairs for one subject + session
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireResearchAdmin();
  if (auth.kind === 'error') return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = AddMeasurementsSchema.safeParse(rawBody);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFieldError = Object.entries(flat.fieldErrors)[0];
    const message = firstFieldError
      ? `${firstFieldError[0]}: ${firstFieldError[1]?.[0] ?? 'invalid value'}`
      : flat.formErrors[0] ?? 'Invalid body';
    return NextResponse.json({ error: message, details: flat }, { status: 400 });
  }

  const payload = parsed.data;
  const measurerId = payload.measurer_id ?? auth.user.id;

  const rows = payload.measurements.map((m) => ({
    subject_id: payload.subject_id,
    region: m.region,
    predicted_cm: m.predicted_cm,
    truth_cm: m.truth_cm,
    session_id: payload.session_id,
    measurer_id: measurerId,
  }));

  try {
    const admin = createAdminClient();

    const result = await withTimeout(
      Promise.resolve(admin.from('cohort_labeled_measurements').insert(rows).select('*')),
      5000,
      'api.admin.cohort.measurements.create',
    );

    if (result.error || !result.data) {
      safeLog.error('api.admin.cohort.measurements', 'insert failed', {
        error: result.error,
        adminId: auth.user.id,
        subjectId: payload.subject_id,
        sessionId: payload.session_id,
      });
      return NextResponse.json({ error: 'Could not add labeled measurements' }, { status: 500 });
    }

    safeLog.info('api.admin.cohort.measurements', 'labeled measurements added', {
      count: result.data.length,
      subjectId: payload.subject_id,
      sessionId: payload.session_id,
      adminId: auth.user.id,
    });

    return NextResponse.json({ measurements: result.data }, { status: 201 });
  } catch (err) {
    safeLog.error('api.admin.cohort.measurements', 'unexpected error on create', {
      error: err,
      adminId: auth.user.id,
    });
    return NextResponse.json({ error: 'Could not add labeled measurements' }, { status: 500 });
  }
}
