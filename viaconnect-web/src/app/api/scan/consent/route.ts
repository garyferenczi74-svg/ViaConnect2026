/**
 * Prompt 231: scan consent status (GET) and server-side acknowledgement
 * (POST), mirroring the 226 acknowledge route. Never trusts a client
 * supplied version id; the ack write is an idempotent upsert.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveScanConsentVersion, hasScanConsent } from '@/lib/scan/scanConsentGate';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const active = await getActiveScanConsentVersion();
  if (!active) {
    return NextResponse.json({ ok: true, available: false });
  }

  const consent = await hasScanConsent(user.id);

  return NextResponse.json({
    ok: true,
    available: true,
    version: active.version,
    bodyMarkdown: active.bodyMarkdown,
    acknowledged: consent.ok,
  });
}

export async function POST(_request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!inMemoryRateLimit(`scan-consent-ack:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const active = await getActiveScanConsentVersion();
  if (!active) {
    return NextResponse.json(
      { ok: false, error: 'consent_not_cleared' },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from('scan_consent_acks').upsert(
    {
      user_id: user.id,
      consent_version_id: active.id,
      acknowledged_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,consent_version_id' },
  );

  if (error) {
    safeLog.error('scan.consent.acknowledge', 'failed to record scan consent ack', {
      error: error.message,
      userId: user.id,
    });
    return NextResponse.json({ ok: false, error: 'ack_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    acknowledged: true,
    version: active.version,
  });
}
