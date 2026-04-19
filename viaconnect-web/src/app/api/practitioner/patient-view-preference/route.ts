// Revised Prompt #91 Phase 5.5: save patient_view_mode_override.
//
// Practitioner-only POST. Persists "Save as default for this patient"
// onto practitioner_patients.patient_view_mode_override. The override
// pins this specific patient regardless of the practitioner's
// default_patient_view_mode setting.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const bodySchema = z.object({
  patientId: z.string().uuid(),
  viewMode: z.enum(['standard', 'naturopathic']).nullable(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Verify the caller has an active practitioner_patients relationship
  // with this patient. The UPDATE WHERE-clause ensures the practitioner
  // can only modify rows they own.
  const { data, error } = await (supabase as any)
    .from('practitioner_patients')
    .update({
      patient_view_mode_override: parsed.data.viewMode,
      updated_at: new Date().toISOString(),
    })
    .eq('practitioner_id', user.id)
    .eq('patient_id', parsed.data.patientId)
    .eq('status', 'active')
    .select('id')
    .maybeSingle();

  if (error) {
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
    await (supabase as any).from('agent_messages').insert({
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
    });
  } catch (e) {
    console.warn('[patient-view-preference] agent_messages emit failed (non-fatal)', e);
  }

  return NextResponse.json({ success: true });
}
