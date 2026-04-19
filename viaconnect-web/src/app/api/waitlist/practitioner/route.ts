// =============================================================================
// POST /api/waitlist/practitioner — Prompt #91 Phase 1.7
// =============================================================================
// Public endpoint. Accepts a practitioner waitlist submission, validates with
// the canonical Zod schema, optionally claims an invitation token, persists to
// practitioner_waitlist, and enqueues the welcome email through the
// Supabase-only mailer queue. Returns 201 + waitlistId on success, 409 on
// duplicate email, 400 on validation error.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  waitlistSubmissionSchema,
  type WaitlistSubmission,
} from '@/lib/practitioner/waitlistSchema';
import { validateInvitationToken } from '@/lib/practitioner/invitations';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let validated: WaitlistSubmission;
  try {
    validated = waitlistSubmissionSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid submission', details: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  }

  const supabase = createClient();
  const userAgent = request.headers.get('user-agent') ?? null;
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  const referrer = request.headers.get('referer') ?? null;

  // Resolve invitation context if a token was supplied. Invalid tokens
  // downgrade to a public submission rather than rejecting outright, since the
  // user has already filled the form. Admins can reconcile post-hoc.
  let submissionType: 'public' | 'invitation' = 'public';
  let invitationToken: string | null = null;
  if (validated.invitationToken) {
    const result = await validateInvitationToken(validated.invitationToken, { claim: true });
    if (result.valid) {
      submissionType = 'invitation';
      invitationToken = validated.invitationToken;
    }
  }

  const { data, error } = await (supabase as any)
    .from('practitioner_waitlist')
    .insert({
      email: validated.email.toLowerCase().trim(),
      first_name: validated.firstName.trim(),
      last_name: validated.lastName.trim(),
      phone: validated.phone ?? null,
      practice_name: validated.practiceName.trim(),
      practice_url: validated.practiceUrl ? validated.practiceUrl.trim() : null,
      practice_street_address: validated.practiceStreetAddress ?? null,
      practice_city: validated.practiceCity ?? null,
      practice_state: validated.practiceState ?? null,
      practice_postal_code: validated.practicePostalCode ?? null,
      credential_type: validated.credentialType,
      credential_type_other: validated.credentialTypeOther ?? null,
      license_state: validated.licenseState ?? null,
      license_number: validated.licenseNumber ?? null,
      npi_number: validated.npiNumber ?? null,
      years_in_practice: validated.yearsInPractice ?? null,
      approximate_patient_panel_size: validated.approximatePatientPanelSize ?? null,
      primary_clinical_focus: validated.primaryClinicalFocus,
      primary_clinical_focus_other: validated.primaryClinicalFocusOther ?? null,
      specialties: validated.specialties ?? [],
      uses_genetic_testing: validated.usesGeneticTesting ?? null,
      currently_dispensing_supplements: validated.currentlyDispensingSupplements ?? null,
      estimated_monthly_supplement_volume_cents:
        validated.estimatedMonthlySupplementVolumeCents ?? null,
      referral_source: validated.referralSource,
      referral_source_other: validated.referralSourceOther ?? null,
      interest_reason: validated.interestReason,
      biggest_clinical_challenge: validated.biggestClinicalChallenge ?? null,
      desired_platform_features: validated.desiredPlatformFeatures ?? [],
      submission_type: submissionType,
      invitation_token: invitationToken,
      user_agent: userAgent,
      ip_address: ipAddress,
      referrer_url: referrer,
      utm_source: validated.utmSource ?? null,
      utm_medium: validated.utmMedium ?? null,
      utm_campaign: validated.utmCampaign ?? null,
    })
    .select('id')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json(
        { error: 'This email is already on our waitlist. We will reach out to you shortly.' },
        { status: 409 },
      );
    }
    console.error('[waitlist] insert failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Best-effort enqueue of welcome email via the Supabase-only RPC.
  try {
    await (supabase as any).rpc('enqueue_practitioner_welcome_email', {
      p_waitlist_id: data.id,
    });
  } catch (e) {
    console.warn('[waitlist] welcome email enqueue failed (non-fatal)', e);
  }

  return NextResponse.json({ success: true, waitlistId: data.id }, { status: 201 });
}
