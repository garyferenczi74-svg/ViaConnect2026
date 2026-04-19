// Prompt #91 Phase 4: Practitioner certification enrollment.
//
// Server-only orchestration. Validates prerequisites, creates the
// practitioner_certifications row, calls the LMS provider to enroll, and
// stores the resulting LMS enrollment ID + course access URL.
//
// Prerequisite chain (per spec):
//   foundation:           none
//   precision_designer:   foundation must be 'certified'
//   master_practitioner:  foundation AND precision_designer both 'certified'

import type { CertificationLevelId, CertificationStatus } from '@/lib/practitioner/taxonomy';
import { getLMSProvider, type LMSProvider } from './lms-integration';

export interface CertificationStatusRow {
  certification_level_id: string;
  status: CertificationStatus;
}

const PREREQS: Record<CertificationLevelId, CertificationLevelId[]> = {
  foundation: [],
  precision_designer: ['foundation'],
  master_practitioner: ['foundation', 'precision_designer'],
};

export function certificationPrerequisitesMet(
  target: CertificationLevelId,
  existing: CertificationStatusRow[],
): boolean {
  const required = PREREQS[target] ?? [];
  if (required.length === 0) return true;

  const certifiedSet = new Set(
    existing
      .filter((r) => r.status === 'certified')
      .map((r) => r.certification_level_id),
  );
  return required.every((r) => certifiedSet.has(r));
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

export interface EnrollPractitionerInput {
  practitionerId: string;
  practitionerEmail: string;
  practitionerFirstName: string;
  practitionerLastName: string;
  certificationLevelId: CertificationLevelId;
  lmsCourseId: string;
  amountPaidCents?: number;
  stripePaymentIntentId?: string;
  isRecertification?: boolean;
  parentCertificationId?: string;
}

export interface EnrollPractitionerResult {
  ok: boolean;
  certificationId?: string;
  lmsEnrollmentId?: string;
  courseAccessUrl?: string;
  reason?: string;
}

interface EnrollDeps {
  // Loose typing because the supabase generated types may not include the
  // new practitioner_certifications table yet.
  supabase: any;
  lms?: LMSProvider;
}

export async function enrollPractitionerInCertification(
  input: EnrollPractitionerInput,
  deps: EnrollDeps,
): Promise<EnrollPractitionerResult> {
  const { supabase } = deps;
  const lms = deps.lms ?? getLMSProvider();

  // 1. Load existing certifications for prereq check.
  const { data: existing } = await supabase
    .from('practitioner_certifications')
    .select('certification_level_id, status')
    .eq('practitioner_id', input.practitionerId);

  const ok = certificationPrerequisitesMet(
    input.certificationLevelId,
    (existing ?? []) as CertificationStatusRow[],
  );
  if (!ok) {
    return {
      ok: false,
      reason:
        'Prerequisites not met. Complete the prior certification level first.',
    };
  }

  // 2. Create the row in 'enrolled' state.
  const { data: row, error: insertErr } = await supabase
    .from('practitioner_certifications')
    .insert({
      practitioner_id: input.practitionerId,
      certification_level_id: input.certificationLevelId,
      status: 'enrolled',
      amount_paid_cents: input.amountPaidCents ?? 0,
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      is_recertification: input.isRecertification ?? false,
      parent_certification_id: input.parentCertificationId ?? null,
    })
    .select('id')
    .single();
  if (insertErr || !row) {
    return {
      ok: false,
      reason: insertErr?.message ?? 'Could not create certification row.',
    };
  }
  const certificationId = row.id as string;

  // 3. Enroll with the LMS provider.
  let lmsEnrollmentId: string | undefined;
  let courseAccessUrl: string | undefined;
  try {
    const lmsResult = await lms.enrollPractitioner({
      practitionerId: input.practitionerId,
      email: input.practitionerEmail,
      firstName: input.practitionerFirstName,
      lastName: input.practitionerLastName,
      courseId: input.lmsCourseId,
    });
    lmsEnrollmentId = lmsResult.enrollmentId;
    courseAccessUrl = lmsResult.courseAccessUrl;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'LMS enrollment failed.';
    // Best-effort cleanup: mark row as revoked so it does not block retries.
    await supabase
      .from('practitioner_certifications')
      .update({ status: 'revoked', metadata: { revoked_reason: msg } })
      .eq('id', certificationId);
    return { ok: false, certificationId, reason: msg };
  }

  // 4. Persist LMS link + transition to 'in_progress'.
  await supabase
    .from('practitioner_certifications')
    .update({
      lms_enrollment_id: lmsEnrollmentId,
      lms_progress_percent: 0,
      lms_last_sync_at: new Date().toISOString(),
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .eq('id', certificationId);

  return {
    ok: true,
    certificationId,
    lmsEnrollmentId,
    courseAccessUrl,
  };
}

// ---------------------------------------------------------------------------
// Progress sync (called by webhook + scheduled poller)
// ---------------------------------------------------------------------------

export interface SyncProgressInput {
  certificationId: string;
  progressPercent: number;
  completedAt?: Date | null;
  validityMonths?: number | null;
}

export async function syncProgress(
  input: SyncProgressInput,
  deps: { supabase: any },
): Promise<void> {
  const patch: Record<string, unknown> = {
    lms_progress_percent: clampPercent(input.progressPercent),
    lms_last_sync_at: new Date().toISOString(),
  };
  if (input.completedAt) {
    patch.completed_at = input.completedAt.toISOString();
    patch.certified_at = input.completedAt.toISOString();
    patch.status = 'certified';
    if (input.validityMonths) {
      const expires = new Date(input.completedAt);
      expires.setMonth(expires.getMonth() + input.validityMonths);
      patch.expires_at = expires.toISOString();
    }
  } else if (input.progressPercent >= 100) {
    patch.status = 'completed';
    patch.completed_at = new Date().toISOString();
  }

  await deps.supabase
    .from('practitioner_certifications')
    .update(patch)
    .eq('id', input.certificationId);
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
