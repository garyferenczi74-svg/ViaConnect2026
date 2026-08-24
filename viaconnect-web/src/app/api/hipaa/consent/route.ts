// GET/POST /api/hipaa/consent — consumer wearable PHI consent.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { acceptWearablePhiConsent, hasWearablePhiConsent } from '@/lib/hipaa/wearable-phi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.hipaa.consent';

async function authUserId(): Promise<string | null> {
  const supabase = await createClient();
  try {
    const { data } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
    return data.user?.id ?? null;
  } catch (err) {
    if (isTimeoutError(err)) return null;
    throw err;
  }
}

export async function GET() {
  try {
    const userId = await authUserId();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const admin = createAdminClient();
    const accepted = await hasWearablePhiConsent(admin, userId);
    return NextResponse.json({ wearable_phi_accepted: accepted });
  } catch (err) {
    safeLog.error(SCOPE, 'GET failed', { error: err });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const userId = await authUserId();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const admin = createAdminClient();
    const acceptedAt = await acceptWearablePhiConsent(admin, userId);
    return NextResponse.json({ ok: true, wearable_phi_accepted: true, accepted_at: acceptedAt });
  } catch (err) {
    safeLog.error(SCOPE, 'POST failed', { error: err });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
