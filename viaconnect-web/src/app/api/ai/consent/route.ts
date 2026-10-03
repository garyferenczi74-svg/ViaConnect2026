/**
 * GET  /api/ai/consent  current agree state and the consent text
 * POST /api/ai/consent  { action: "agree" | "revoke" }
 *
 * Recording an agree is allowed while the gate is off, so a choice can be
 * stored before AI_THIRD_PARTY_CONSENT_GATE is turned on.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  AI_CONSENT_DECLINE,
  AI_CONSENT_INTRO,
  AI_DATA_SHARING_CONSENT_VERSION,
  AI_VENDORS,
  PERMISSION_DISCLOSURES,
  consentIsCurrent,
  isAiDataSharingGateEnabled,
} from '@/lib/ai/data-sharing/consent';
import { readAiConsentSnapshot } from '@/lib/ai/data-sharing/read-consent';

export const dynamic = 'force-dynamic';

function statusBody(
  snapshot: Awaited<ReturnType<typeof readAiConsentSnapshot>>,
) {
  const row = snapshot === 'error' ? null : snapshot;
  return {
    gateEnabled: isAiDataSharingGateEnabled(),
    consented: snapshot === 'error' ? false : consentIsCurrent(snapshot),
    version: AI_DATA_SHARING_CONSENT_VERSION,
    acceptedAt: row?.acceptedAt ?? null,
    revokedAt: row?.revokedAt ?? null,
    intro: AI_CONSENT_INTRO,
    decline: AI_CONSENT_DECLINE,
    vendors: AI_VENDORS,
    disclosures: PERMISSION_DISCLOSURES,
    readError: snapshot === 'error',
  };
}

async function requireUser() {
  const supabase = await createClient();
  const { data } = await withTimeout(supabase.auth.getUser(), 5000, 'api.ai.consent.auth');
  return { supabase, user: data.user };
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    const snapshot = await readAiConsentSnapshot(supabase, user.id);
    return NextResponse.json(statusBody(snapshot));
  } catch (error) {
    if (isTimeoutError(error)) {
      return NextResponse.json({ error: 'Authentication check timed out.' }, { status: 503 });
    }
    safeLog.error('api.ai.consent', 'get failed', { error });
    return NextResponse.json({ error: 'Could not read AI sharing choice.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let action: string | undefined;
  try {
    const body = (await request.json()) as { action?: unknown };
    action = typeof body.action === 'string' ? body.action : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (action !== 'agree' && action !== 'revoke') {
    return NextResponse.json({ error: 'action must be agree or revoke' }, { status: 400 });
  }

  try {
    const { supabase, user } = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const now = new Date().toISOString();
    const patch =
      action === 'agree'
        ? {
            user_id: user.id,
            ai_data_sharing_accepted_at: now,
            ai_data_sharing_revoked_at: null,
            ai_data_sharing_consent_version: AI_DATA_SHARING_CONSENT_VERSION,
          }
        : {
            user_id: user.id,
            ai_data_sharing_revoked_at: now,
          };

    const { error } = await supabase.from('user_consents').upsert(patch, { onConflict: 'user_id' });
    if (error) {
      safeLog.error('api.ai.consent', 'upsert failed', { code: error.code });
      return NextResponse.json({ error: 'Could not save AI sharing choice.' }, { status: 500 });
    }

    safeLog.info('api.ai.consent', 'saved', { action, version: AI_DATA_SHARING_CONSENT_VERSION });
    const snapshot = await readAiConsentSnapshot(supabase, user.id);
    return NextResponse.json(statusBody(snapshot));
  } catch (error) {
    if (isTimeoutError(error)) {
      return NextResponse.json({ error: 'Authentication check timed out.' }, { status: 503 });
    }
    safeLog.error('api.ai.consent', 'post failed', { error });
    return NextResponse.json({ error: 'Could not save AI sharing choice.' }, { status: 500 });
  }
}
