// GET /api/integrations/wearable-tiles — first-class tile + score-detail state.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { isWhoopConfigured } from '@/lib/wearables/whoop/config';
import { isOuraConfigured } from '@/lib/wearables/oura/config';
import {
  assembleWearableSnapshot,
  type AppleImportRow,
  type ConnectedSourceRow,
  type HumeBodyRow,
  type RecoveryIngestRow,
  type SleepIngestRow,
  type TokenPresenceRow,
  type WorkoutIngestRow,
} from '@/lib/body-tracker/wearable-snapshot';
import { parseTrustOverrides } from '@/lib/body-tracker/arnold-trust';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.integrations.wearable-tiles';

function platformOf(req: NextRequest): 'web' | 'ios' | 'android' {
  const raw = req.nextUrl.searchParams.get('platform');
  if (raw === 'ios' || raw === 'android' || raw === 'web') return raw;
  return 'web';
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    let userId: string | null = null;
    try {
      const { data } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
      userId = data.user?.id ?? null;
    } catch (err) {
      if (isTimeoutError(err)) {
        return NextResponse.json({ error: 'auth_timeout' }, { status: 503 });
      }
      throw err;
    }
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    const [connectedRes, tokensRes, importsRes, bodyRes, sleepRes, recoveryRes, workoutRes, healthKitRes] =
      await Promise.all([
        withTimeout(
          admin
            .from('connected_sources')
            .select('provider, status, last_sync_at')
            .eq('user_id', userId),
          4000,
          `${SCOPE}.connected`,
        ),
        withTimeout(
          admin.from('wearable_oauth_tokens').select('provider').eq('user_id', userId),
          4000,
          `${SCOPE}.tokens`,
        ),
        withTimeout(
          admin
            .from('apple_health_imports')
            .select('records_ingested, created_at, updated_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5),
          4000,
          `${SCOPE}.imports`,
        ),
        withTimeout(
          admin
            .from('wearable_body_composition')
            .select('measured_at, updated_at, source_app, weight_kg, body_fat_pct')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('measured_at', { ascending: false })
            .limit(20),
          4000,
          `${SCOPE}.body`,
        ),
        withTimeout(
          admin
            .from('wearable_sleep_sessions')
            .select('source_provider, sleep_efficiency_pct, total_sleep_min, end_at, source_app')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('end_at', { ascending: false })
            .limit(10),
          4000,
          `${SCOPE}.sleep`,
        ),
        withTimeout(
          admin
            .from('wearable_recovery')
            .select('source_provider, recovery_score, cycle_date')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('cycle_date', { ascending: false })
            .limit(10),
          4000,
          `${SCOPE}.recovery`,
        ),
        withTimeout(
          admin
            .from('wearable_workouts')
            .select('source_provider, strain, start_at')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('start_at', { ascending: false })
            .limit(10),
          4000,
          `${SCOPE}.workouts`,
        ),
        withTimeout(
          admin
            .from('wearable_events')
            .select('recorded_at, processing_status')
            .eq('user_id', userId)
            .in('provider', ['health_kit', 'health_connect'])
            .eq('processing_status', 'processed')
            .order('recorded_at', { ascending: false })
            .limit(1),
          4000,
          `${SCOPE}.healthKit`,
        ),
      ]);

    const connected = (connectedRes.data ?? []) as ConnectedSourceRow[];
    const tokenProviders = ((tokensRes.data ?? []) as TokenPresenceRow[]).map((r) => r.provider);
    const appleImports = (importsRes.data ?? []) as AppleImportRow[];
    const bodyRows = (bodyRes.data ?? []) as HumeBodyRow[];
    const sleepRows = (sleepRes.data ?? []) as SleepIngestRow[];
    const recoveryRows = (recoveryRes.data ?? []) as RecoveryIngestRow[];
    const workoutRows = (workoutRes.data ?? []) as WorkoutIngestRow[];
    const hk = (healthKitRes.data ?? []) as Array<{ recorded_at: string | null }>;

    let trustOverrides: Record<string, number> = {};
    try {
      const profileRes = await withTimeout(
        admin.from('arnold_user_profiles').select('trust_overrides').eq('user_id', userId).maybeSingle(),
        3000,
        `${SCOPE}.trust`,
      );
      trustOverrides = parseTrustOverrides(
        (profileRes.data as { trust_overrides?: unknown } | null)?.trust_overrides,
      );
    } catch {
      trustOverrides = {};
    }

    const snapshot = assembleWearableSnapshot({
      connected,
      tokenProviders,
      appleImports,
      bodyRows,
      sleepRows,
      recoveryRows,
      workoutRows,
      healthKitPersisted: hk.length > 0,
      healthKitLastPersistAt: hk[0]?.recorded_at ?? null,
      whoopConfigured: isWhoopConfigured(),
      ouraConfigured: isOuraConfigured(),
      platform: platformOf(req),
      metabolicManual: false,
      trustOverrides,
    });

    return NextResponse.json({
      tiles: snapshot.tiles,
      scoreDetail: snapshot.scoreDetail,
      lastUpdatedAt: snapshot.lastUpdatedAt,
      whoopConfigured: isWhoopConfigured(),
      ouraConfigured: isOuraConfigured(),
    });
  } catch (err) {
    safeLog.error(SCOPE, 'GET failed', { error: err });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
