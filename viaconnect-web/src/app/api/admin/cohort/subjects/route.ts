// Prompt 211b Workstream 1B -- cohort subject enrollment API.
//
// GET  /api/admin/cohort/subjects
//   Lists cohort_subjects (chain-of-custody columns included: collected_by,
//   collected_at, protocol_version, consent_ledger_id) for the admin console.
//
// POST /api/admin/cohort/subjects
//   Enrolls a new research participant. Validates a consent reference is
//   present (consent_ledger_id is required at this application layer, even
//   though the column itself is nullable for legacy pre-ledger rows per the
//   migration comment). collected_by / collected_at are set server-side from
//   the authenticated admin, never trusted from the client -- this is the
//   chain-of-custody guarantee.
//
// Auth: requireResearchAdmin() (401/403 for non-research-admins). Writes use
// createAdminClient() (service-role) since the caller has already been
// authorized at the application layer; RLS on cohort_subjects still applies
// once the merge-deferred migration lands.
//
// No em-dashes, no en-dashes. Zero `any`. No new dependency. No PHI in logs
// (only ids are logged, never sex/height/weight/notes).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireResearchAdmin } from '@/lib/arnold/scanning/cohort/researchAdminGuard';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const SEX_VALUES = ['male', 'female', 'other'] as const;

export const EnrollSubjectSchema = z.object({
  sex: z.enum(SEX_VALUES),
  height_cm: z.number().positive('height_cm must be positive'),
  weight_kg: z.number().positive('weight_kg must be positive').nullable().optional(),
  body_size_bucket: z.string().max(10).nullable().optional(),
  // Required at the application layer: a new enrollment must carry a consent
  // reference. The column is nullable in the schema only for legacy rows.
  consent_ledger_id: z.string().uuid('consent_ledger_id is required for new cohort enrollments'),
  protocol_version: z.string().min(1).max(40).default('tape-v1'),
  notes: z.string().max(2000).nullable().optional(),
});

export type EnrollSubjectInput = z.infer<typeof EnrollSubjectSchema>;

// ---------------------------------------------------------------------------
// GET: list subjects (chain-of-custody columns included)
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  const auth = await requireResearchAdmin();
  if (auth.kind === 'error') return auth.response;

  try {
    const admin = createAdminClient();

    const result = await withTimeout(
      Promise.resolve(
        admin
          .from('cohort_subjects')
          .select(
            'id, sex, height_cm, weight_kg, body_size_bucket, consent_ledger_id, ' +
            'collected_by, collected_at, protocol_version, notes, created_at',
          )
          .order('collected_at', { ascending: false }),
      ),
      4000,
      'api.admin.cohort.subjects.list',
    );

    if (result.error) {
      safeLog.error('api.admin.cohort.subjects', 'list query failed', { error: result.error });
      return NextResponse.json({ error: 'Could not load cohort subjects' }, { status: 500 });
    }

    return NextResponse.json({ subjects: result.data ?? [] });
  } catch (err) {
    safeLog.error('api.admin.cohort.subjects', 'unexpected error on list', { error: err });
    return NextResponse.json({ error: 'Could not load cohort subjects' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST: enroll a new subject
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

  const parsed = EnrollSubjectSchema.safeParse(rawBody);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFieldError = Object.entries(flat.fieldErrors)[0];
    const message = firstFieldError
      ? `${firstFieldError[0]}: ${firstFieldError[1]?.[0] ?? 'invalid value'}`
      : flat.formErrors[0] ?? 'Invalid body';
    return NextResponse.json({ error: message, details: flat }, { status: 400 });
  }

  const payload = parsed.data;

  try {
    const admin = createAdminClient();

    const result = await withTimeout(
      Promise.resolve(
        admin
          .from('cohort_subjects')
          .insert({
            sex: payload.sex,
            height_cm: payload.height_cm,
            weight_kg: payload.weight_kg ?? null,
            body_size_bucket: payload.body_size_bucket ?? null,
            consent_ledger_id: payload.consent_ledger_id,
            // Chain-of-custody: server-set, never trusted from the client.
            collected_by: auth.user.id,
            collected_at: new Date().toISOString(),
            protocol_version: payload.protocol_version,
            notes: payload.notes ?? null,
          })
          .select('*')
          .single(),
      ),
      5000,
      'api.admin.cohort.subjects.create',
    );

    if (result.error || !result.data) {
      safeLog.error('api.admin.cohort.subjects', 'insert failed', {
        error: result.error,
        adminId: auth.user.id,
      });
      return NextResponse.json({ error: 'Could not enroll subject' }, { status: 500 });
    }

    // No PHI in logs: only the new row id and the enrolling admin's id.
    safeLog.info('api.admin.cohort.subjects', 'subject enrolled', {
      subjectId: (result.data as { id: string }).id,
      adminId: auth.user.id,
    });

    return NextResponse.json({ subject: result.data }, { status: 201 });
  } catch (err) {
    safeLog.error('api.admin.cohort.subjects', 'unexpected error on create', {
      error: err,
      adminId: auth.user.id,
    });
    return NextResponse.json({ error: 'Could not enroll subject' }, { status: 500 });
  }
}
