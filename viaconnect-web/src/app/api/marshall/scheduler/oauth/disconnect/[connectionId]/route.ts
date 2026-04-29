// Prompt #125 P3: Disconnect a scheduler connection.
//
// POST /api/marshall/scheduler/oauth/disconnect/{connectionId}
//   Marks the connection row inactive, attempts to revoke the OAuth
//   token on the platform side (best effort), deletes the Vault secret.
//   Idempotent: disconnecting an already-disconnected row returns ok.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { bufferAdapter } from '@/lib/marshall/scheduler/adapters/buffer';
import { hootsuiteAdapter } from '@/lib/marshall/scheduler/adapters/hootsuite';
import { laterAdapter } from '@/lib/marshall/scheduler/adapters/later';
import { sproutAdapter } from '@/lib/marshall/scheduler/adapters/sprout';
import { planolyAdapter } from '@/lib/marshall/scheduler/adapters/planoly';
import { supabaseTokenVault } from '@/lib/marshall/scheduler/tokenVault';
import { schedulerLogger } from '@/lib/marshall/scheduler/logging';
import type { SchedulerPlatform, DisconnectReason } from '@/lib/marshall/scheduler/types';
import type { SchedulerAdapter } from '@/lib/marshall/scheduler/adapters/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const VALID_REASONS = new Set<DisconnectReason>([
  'user_requested', 'scope_reduction', 'token_revoked', 'platform_error', 'admin_action',
]);

function adapterFor(platform: SchedulerPlatform): SchedulerAdapter | null {
  switch (platform) {
    case 'buffer':        return bufferAdapter();
    case 'hootsuite':     return hootsuiteAdapter();
    case 'later':         return laterAdapter();
    case 'sprout_social': return sproutAdapter();
    case 'planoly':       return planolyAdapter();
    default: return null;
  }
}

interface DisconnectBody {
  reason?: DisconnectReason;
}

export async function POST(req: NextRequest, { params }: { params: { connectionId: string } }) {
  try {
    const connectionId = (params.connectionId ?? '').trim();
    if (!connectionId) return NextResponse.json({ error: 'missing_connection_id' }, { status: 400 });

    const session = createServerClient();
    const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.marshall.scheduler.oauth.disconnect.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    let body: DisconnectBody;
    try { body = (await req.json().catch(() => ({}))) as DisconnectBody; }
    catch { body = {}; }
    const reason: DisconnectReason = VALID_REASONS.has(body.reason as DisconnectReason)
      ? (body.reason as DisconnectReason)
      : 'user_requested';

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sbAdmin = admin as any;

    const { data: row, error: readError } = await sbAdmin
      .from('scheduler_connections')
      .select('id, practitioner_id, platform, token_vault_ref, active')
      .eq('id', connectionId)
      .maybeSingle();
    if (readError) {
      return NextResponse.json({ error: 'read_failed' }, { status: 500 });
    }
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Authorization: practitioner owns it, OR is a compliance admin.
    if (row.practitioner_id !== user.id) {
      const { data: profile } = await session
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      const role = (profile as { role?: string } | null)?.role ?? '';
      if (!['admin', 'superadmin', 'compliance_admin'].includes(role)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    if (!row.active) {
      return NextResponse.json({ ok: true, already_disconnected: true });
    }

    const vault = supabaseTokenVault(admin);
    const adapter = adapterFor(row.platform as SchedulerPlatform);
    if (adapter) {
      try {
        const bundle = await vault.read(row.token_vault_ref, `scheduler:${row.platform}:disconnect`);
        await adapter.revokeOAuthToken({ accessToken: bundle.accessToken, refreshToken: bundle.refreshToken });
      } catch (err) {
        schedulerLogger.warn('[scheduler/disconnect] platform revoke skipped', {
          platform: row.platform,
          error: (err as Error).message,
        });
      }
    }

    try {
      await vault.delete(row.token_vault_ref);
    } catch (err) {
      schedulerLogger.warn('[scheduler/disconnect] vault delete failed', {
        platform: row.platform,
        error: (err as Error).message,
      });
    }

    const { error: updateError } = await sbAdmin
      .from('scheduler_connections')
      .update({
        active: false,
        disconnected_at: new Date().toISOString(),
        disconnected_reason: reason,
      })
      .eq('id', connectionId);
    if (updateError) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, platform: row.platform });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.scheduler.oauth.disconnect', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.scheduler.oauth.disconnect', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
