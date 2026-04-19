// Prompt #91 Phase 4.2: LMS webhook handler.
//
// Thinkific posts events here on enrollment progress + completion. The
// handler validates the shared-secret header, locates the local
// practitioner_certifications row by lms_enrollment_id, and writes the
// progress update via syncProgress.
//
// Expected event shapes (Thinkific):
//   {
//     "resource": "enrollment",
//     "action":   "updated" | "completed",
//     "payload":  {
//       "id":                  number,
//       "percentage_completed":number,
//       "completed_at":        string | null
//     }
//   }
//
// Other providers can post events shaped the same way; the route does not
// care which provider sent the event as long as the shared secret matches
// LMS_WEBHOOK_SECRET.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncProgress } from '@/lib/certification/enrollment';

export const runtime = 'nodejs';

const VALIDITY_BY_LEVEL: Record<string, number> = {
  foundation: 24,
  precision_designer: 24,
  master_practitioner: 24,
};

function verifySecret(req: NextRequest): boolean {
  const expected = process.env.LMS_WEBHOOK_SECRET ?? '';
  if (!expected) return false;
  // Thinkific sends X-Thinkific-Webhook-Token; generic providers may send
  // X-Webhook-Secret. Accept either.
  const got =
    req.headers.get('x-thinkific-webhook-token') ??
    req.headers.get('x-webhook-secret') ??
    '';
  return got.length > 0 && got === expected;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const enrollmentId = String(body?.payload?.id ?? body?.enrollment_id ?? '');
  if (!enrollmentId) {
    return NextResponse.json({ error: 'Missing enrollment id' }, { status: 400 });
  }

  const supabase = createClient();

  // Locate the certification row by LMS enrollment id.
  const { data: row } = await (supabase as any)
    .from('practitioner_certifications')
    .select('id, certification_level_id, status, expires_at')
    .eq('lms_enrollment_id', enrollmentId)
    .maybeSingle();

  if (!row) {
    // Idempotent: unknown enrollment is a 200 so the LMS does not retry.
    return NextResponse.json({ status: 'ignored', reason: 'no matching certification' });
  }

  const progressPercent = Number(body?.payload?.percentage_completed ?? 0);
  const completedRaw = body?.payload?.completed_at ?? null;
  const completedAt = completedRaw ? new Date(completedRaw) : null;
  const validityMonths = VALIDITY_BY_LEVEL[row.certification_level_id as string] ?? 24;

  await syncProgress(
    {
      certificationId: row.id as string,
      progressPercent,
      completedAt,
      validityMonths,
    },
    { supabase },
  );

  return NextResponse.json({ status: 'ok' });
}
