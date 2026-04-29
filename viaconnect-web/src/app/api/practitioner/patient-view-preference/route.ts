// Revised Prompt #91 Phase 5.5: save patient_view_mode_override.
//
// Practitioner-only POST. Persists "Save as default for this patient"
// onto practitioner_patients.patient_view_mode_override. The override
// pins this specific patient regardless of the practitioner's
// default_patient_view_mode setting.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const bodySchema = z.object({
  patientId: z.string().uuid(),
  viewMode: z.enum(['standard', 'naturopathic']).nullable(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.practitioner.patient-view-preference.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.patient-view-preference', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sb = supabase as any;

    // Verify the caller has an active practitioner_patients relationship
    // with this patient. The UPDATE WHERE-clause ensures the practitioner
    // can only modify rows they own.
    const updateRes = await withTimeout(
      (async () => sb
        .from('practitioner_patients')
        .update({
          patient_view_mode_override: parsed.data.viewMode,
          updated_at: new Date().toISOString(),
        })
        .eq('practitioner_id', user.id)
        .eq('patient_id', parsed.data.patientId)
        .eq('status', 'active')
        .select('id')
        .maybeSingle())(),
      8000,
      'api.practitioner.patient-view-preference.update',
    );
    const data = updateRes.data;
    const error = updateRes.error;

    if (error) {
      safeLog.error('api.practitioner.patient-view-preference', 'update failed', { requestId, error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: 'No active relationship with this patient' },
        { status: 403 },
      );
    }

    // Best-effort fan-out so Jeffery's admin LiveFeed surfaces per-patient
    // override changes. Failure is non-fatal: the override is already
    // persisted on practitioner_patients.
    try {
      await withTimeout(
        (async () => sb.from('agent_messages').insert({
          from_agent: 'jeffery',
          to_agent: 'jeffery',
          message_type: 'patient_view_override_set',
          user_id: user.id,
          payload: {
            relationship_id: data.id,
            practitioner_user_id: user.id,
            patient_user_id: parsed.data.patientId,
            view_mode: parsed.data.viewMode,
          },
          status: 'pending',
        }))(),
        5000,
        'api.practitioner.patient-view-preference.agent-emit',
      );
    } catch (e) {
      safeLog.warn('api.practitioner.patient-view-preference', 'agent_messages emit failed (non-fatal)', { requestId, error: e });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.patient-view-preference', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.patient-view-preference', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
