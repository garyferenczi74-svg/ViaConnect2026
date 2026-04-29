// Prompt #122 P5: Admin + cron-triggered SOC 2 packet generation.
//
// Accepts either:
//   1. Admin/superadmin user session (profiles.role IN admin/superadmin), OR
//   2. x-soc2-internal-token header equal to SOC2_INTERNAL_TOKEN env,
//      used exclusively by the soc2_packet_generator Edge Function shim.
//
// Runs the full pipeline: orchestrator → persist → distribute. All I/O
// uses the service-role admin Supabase client; user-session clients are
// only consulted for authn/authz.

import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSoc2Packet } from '@/lib/soc2/assemble/orchestrator';
import { persistPacket } from '@/lib/soc2/assemble/persist';
import { distributePacket } from '@/lib/soc2/distribute';
import { buildSupabaseFetcher } from '@/lib/soc2/collectors/supabaseFetcher';
import { loadActiveSigningKey } from '@/lib/soc2/assemble/signingKey';
import { loadActiveManualEvidence } from '@/lib/soc2/manualEvidence/loader';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const maxDuration = 300;

const ADMIN_ROLES = new Set(['admin', 'superadmin']);

interface GenerateBody {
  period: { start: string; end: string };
  attestationType?: 'Type I' | 'Type II';
  generatedBy?: string;
  ruleRegistryVersion?: string;
  systemBoundary?: string;
}

async function authenticate(req: NextRequest): Promise<
  { ok: true; actor: string } | { ok: false; response: NextResponse }
> {
  // Path 1: internal token (Edge Function shim or cron). Compare length first,
  // then timing-safe compare to avoid a bytewise early-exit oracle.
  const internalToken = req.headers.get('x-soc2-internal-token');
  const expected = process.env.SOC2_INTERNAL_TOKEN;
  if (internalToken && expected && internalToken.length === expected.length) {
    const a = Buffer.from(internalToken);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return { ok: true, actor: 'cron:monthly' };
    }
  }

  // Path 2: admin user session.
  const supabase = createServerClient();
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.soc2.packets.generate.auth');
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }
  const profileRes = await withTimeout(
    (async () => supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle())(),
    5000,
    'api.soc2.packets.generate.load-profile',
  );
  const role = (profileRes.data as { role?: string } | null)?.role ?? '';
  if (!ADMIN_ROLES.has(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Admin role required' }, { status: 403 }),
    };
  }
  return { ok: true, actor: `admin:${user.id}` };
}

function computeRetentionUntil(periodEndIso: string): string {
  // SOC 2 guidance: keep evidence 7 years. We anchor to period_end + 7y.
  const d = new Date(periodEndIso);
  d.setUTCFullYear(d.getUTCFullYear() + 7);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const authResult = await authenticate(req);
  if (!authResult.ok) return authResult.response;

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.period?.start || !body.period?.end) {
    return NextResponse.json({ error: 'period.start and period.end required' }, { status: 400 });
  }
  if (new Date(body.period.end).getTime() <= new Date(body.period.start).getTime()) {
    return NextResponse.json({ error: 'period.end must be after period.start' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const signingKey = await loadActiveSigningKey(supabase);
    const manualEvidence = await loadActiveManualEvidence({ supabase, period: body.period });

    const packet = await generateSoc2Packet({
      period: body.period,
      attestationType: body.attestationType ?? 'Type II',
      ruleRegistryVersion: body.ruleRegistryVersion ?? 'v4.3.7',
      generatedBy: body.generatedBy ?? authResult.actor,
      systemBoundary: body.systemBoundary ?? 'ViaConnect production: viaconnectapp.com + Supabase project nnhkcufyqjojdbvdrpky',
      activeSigningKey: { id: signingKey.id, privateKeyPem: signingKey.privateKeyPem },
      fetch: buildSupabaseFetcher(supabase),
      manualEvidence,
    });

    const persisted = await persistPacket({
      supabase,
      period: body.period,
      packet,
      signingKeyId: signingKey.id,
      retentionUntil: computeRetentionUntil(body.period.end),
      generatedBy: body.generatedBy ?? authResult.actor,
      pseudonymKeyVaultRef: `soc2/pseudonym/${packet.packetUuid}`,
    });

    const distribution = await distributePacket({
      supabase,
      packetId: persisted.packetId,
      packetUuid: packet.packetUuid,
      rootHash: packet.rootHash,
      signatureJwt: packet.signatureJwt,
      storageKey: persisted.storageKey,
      sizeBytes: persisted.sizeBytes,
      periodStart: body.period.start,
      periodEnd: body.period.end,
      tscInScope: packet.tscInScope,
    });

    return NextResponse.json({
      ok: true,
      packetId: persisted.packetId,
      packetUuid: packet.packetUuid,
      storageKey: persisted.storageKey,
      sizeBytes: persisted.sizeBytes,
      rootHash: packet.rootHash,
      totalFiles: packet.totalFiles,
      collectorErrorCount: packet.collectorErrors.length,
      coverageGaps: packet.coverageGaps,
      isBootstrappedKey: signingKey.isBootstrapped,
      distribution,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.soc2.packets.generate', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.soc2.packets.generate', 'unexpected error', { error: err });
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
