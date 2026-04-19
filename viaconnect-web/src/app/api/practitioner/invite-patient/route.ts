// =============================================================================
// POST /api/practitioner/invite-patient — Prompt #91 Phase 7
// =============================================================================
// Practitioner-only endpoint. Creates a practitioner_patients row in
// status='invited' with a single-use token. Patient receives the token via
// email (queued) and accepts at /patients/invited?token=X.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  generatePatientInvitationToken,
  buildPatientInvitationUrl,
} from '@/lib/practitioner/patient-invitations';

export const runtime = 'nodejs';

const invitePatientSchema = z.object({
  patientEmail: z.string().email().max(254),
  patientFirstName: z.string().min(1).max(100),
  patientLastName: z.string().min(1).max(100),
  invitationNote: z.string().max(2000).optional(),
  // Consent presets the practitioner is requesting; the patient confirms or
  // adjusts before the relationship activates.
  consentPresets: z
    .object({
      consent_share_caq: z.boolean().optional(),
      consent_share_engagement_score: z.boolean().optional(),
      consent_share_protocols: z.boolean().optional(),
      consent_share_nutrition: z.boolean().optional(),
      can_view_genetics: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = invitePatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid invitation', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createClient();

  // Caller must be authenticated.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Caller must have an active practitioner row.
  const { data: practitioner } = await (supabase as any)
    .from('practitioners')
    .select('id, account_status, display_name, practice_name')
    .eq('user_id', user.id)
    .eq('account_status', 'active')
    .maybeSingle();

  if (!practitioner) {
    return NextResponse.json(
      { error: 'Active practitioner account required' },
      { status: 403 },
    );
  }

  const token = generatePatientInvitationToken();
  const presets = parsed.data.consentPresets ?? {};

  const { data: relRow, error: insertErr } = await (supabase as any)
    .from('practitioner_patients')
    .insert({
      practitioner_id: user.id,
      // patient_id stays null until the patient accepts via the
      // accept_practitioner_invitation RPC. Migration _150 made this
      // column nullable to support invitation rows that have not yet
      // been claimed.
      patient_id: null,
      invited_email:      parsed.data.patientEmail.toLowerCase().trim(),
      invited_first_name: parsed.data.patientFirstName.trim(),
      invited_last_name:  parsed.data.patientLastName.trim(),
      relationship_type: 'primary',
      status: 'invited',
      invitation_token: token,
      invited_at: new Date().toISOString(),
      invitation_note: parsed.data.invitationNote ?? null,
      consent_share_caq: presets.consent_share_caq ?? false,
      consent_share_engagement_score: presets.consent_share_engagement_score ?? true,
      consent_share_protocols: presets.consent_share_protocols ?? true,
      consent_share_nutrition: presets.consent_share_nutrition ?? false,
      can_view_genetics: presets.can_view_genetics ?? false,
    })
    .select('id')
    .single();

  if (insertErr || !relRow) {
    return NextResponse.json(
      { error: insertErr?.message ?? 'Could not create invitation' },
      { status: 500 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://viacurawellness.com';
  const invitationUrl = buildPatientInvitationUrl(baseUrl, token);

  // Best-effort fan-out to Jeffery so the admin LiveFeed sees the invite.
  try {
    await (supabase as any).from('agent_messages').insert({
      from_agent: 'jeffery',
      to_agent: 'jeffery',
      message_type: 'patient_invitation_sent',
      user_id: user.id,
      payload: {
        relationship_id: relRow.id,
        practitioner_user_id: user.id,
        patient_email: parsed.data.patientEmail,
        invitation_url: invitationUrl,
      },
      status: 'pending',
    });
  } catch (e) {
    console.warn('[invite-patient] agent_messages emit failed (non-fatal)', e);
  }

  return NextResponse.json(
    {
      success: true,
      relationshipId: relRow.id,
      invitationUrl,
      practitioner: {
        displayName: practitioner.display_name,
        practiceName: practitioner.practice_name,
      },
    },
    { status: 201 },
  );
}
