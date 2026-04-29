// Prompt #97 Phase 3: create a new formulation draft.
// POST /api/practitioner/custom-formulations
// Body: { internal_name, delivery_form, units_per_serving, servings_per_container,
//         intended_primary_indication, intended_adult_use, intended_pediatric_use,
//         intended_pregnancy_use }

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const auth = await requirePractitioner();
    if (auth.kind === 'error') return auth.response;

    const body = (await request.json().catch(() => null)) as
      | {
          internal_name?: string;
          delivery_form?: string;
          units_per_serving?: number;
          servings_per_container?: number;
          intended_primary_indication?: string;
          intended_adult_use?: boolean;
          intended_pediatric_use?: boolean;
          intended_pregnancy_use?: boolean;
        }
      | null;

    if (
      !body?.internal_name ||
      !body.delivery_form ||
      !body.units_per_serving ||
      !body.servings_per_container ||
      !body.intended_primary_indication
    ) {
      return NextResponse.json(
        {
          error:
            'internal_name, delivery_form, units_per_serving, servings_per_container, intended_primary_indication required',
        },
        { status: 400 },
      );
    }

    const supabase = createClient();

    const enrollmentRes = await withTimeout(
      (async () => supabase
        .from('level_4_enrollments')
        .select('id, status')
        .eq('practitioner_id', auth.practitionerId)
        .maybeSingle())(),
      8000,
      'api.practitioner.custom-formulations.create.enrollment-load',
    );
    const enroll = enrollmentRes.data as { id: string; status: string } | null;
    if (!enroll) {
      return NextResponse.json({ error: 'Level 4 enrollment required' }, { status: 403 });
    }
    if (!['eligibility_verified', 'formulation_development', 'active'].includes(enroll.status)) {
      return NextResponse.json(
        { error: `Cannot create formulation in enrollment status ${enroll.status}` },
        { status: 409 },
      );
    }

    const insertRes = await withTimeout(
      (async () => supabase
        .from('custom_formulations')
        .insert({
          enrollment_id: enroll.id,
          practitioner_id: auth.practitionerId,
          exclusive_to_practitioner_id: auth.practitionerId,
          internal_name: body.internal_name!.trim(),
          delivery_form: body.delivery_form,
          units_per_serving: body.units_per_serving,
          servings_per_container: body.servings_per_container,
          intended_primary_indication: body.intended_primary_indication!.trim(),
          intended_adult_use: body.intended_adult_use ?? true,
          intended_pediatric_use: body.intended_pediatric_use ?? false,
          intended_pregnancy_use: body.intended_pregnancy_use ?? false,
          status: 'draft',
        } as never)
        .select('id')
        .single())(),
      8000,
      'api.practitioner.custom-formulations.create.insert',
    );
    const data = insertRes.data;
    const error = insertRes.error;

    if (error || !data) {
      safeLog.error('api.practitioner.custom-formulations.create', 'insert failed', { requestId, error });
      return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
    }
    return NextResponse.json({ id: (data as { id: string }).id });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.custom-formulations.create', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.custom-formulations.create', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
