// POST /api/integrations/health-sync
// Authenticated HealthKit / Health Connect batch ingest.
// Connected only after a real persist. Empty batches do not connect.
// Sleep / HRV / activity / workouts require wearable PHI consent.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { HealthBatch } from '@/lib/wearables/normalize-health';
import { processPendingEvents } from '@/lib/wearables/processor';
import { seedDefaultPrecedence } from '@/lib/wearables/precedence';
import { filterSamplesForPhiConsent, hasWearablePhiConsent } from '@/lib/hipaa/wearable-phi';
import {
  isEmptyHealthBatch,
  shouldMarkHealthSourceConnected,
} from '@/lib/wearables/health-sync-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.integrations.health-sync';

export async function POST(req: NextRequest) {
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

    let body: HealthBatch;
    try {
      body = (await req.json()) as HealthBatch;
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    if (!body?.batch_id || !body?.source) {
      return NextResponse.json({ error: 'batch_id and source required' }, { status: 400 });
    }
    if (body.source !== 'health_kit' && body.source !== 'health_connect') {
      return NextResponse.json({ error: 'invalid source' }, { status: 400 });
    }
    if (body.source === 'health_connect' && process.env.HEALTH_CONNECT_ENABLED !== '1') {
      return NextResponse.json(
        {
          error: 'health_connect_not_enabled',
          message: 'Health Connect is behind a capability flag. iOS HealthKit is fully supported.',
        },
        { status: 503 },
      );
    }

    const admin = createAdminClient();
    const phiConsent = await hasWearablePhiConsent(admin, userId);
    const rawSamples = Array.isArray(body.samples) ? body.samples : [];
    const samples = filterSamplesForPhiConsent(rawSamples, phiConsent);

    if (isEmptyHealthBatch(samples.length)) {
      return NextResponse.json({
        ok: true,
        batch_id: body.batch_id,
        sample_count: 0,
        connected: false,
      });
    }

    const { error } = await withTimeout(
      admin.from('wearable_events').upsert(
        {
          user_id: userId,
          provider: body.source,
          event_type: 'healthkit.sample_batch',
          external_id: body.batch_id,
          payload: { batch_id: body.batch_id, source: body.source, samples },
          recorded_at: new Date().toISOString(),
          processing_status: 'pending',
        },
        { onConflict: 'provider,external_id,event_type', ignoreDuplicates: true },
      ),
      4000,
      `${SCOPE}.insertEvent`,
    );

    if (error) {
      safeLog.warn(SCOPE, 'insert event failed', { error });
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    }

    if (samples.length <= 500) {
      try {
        await processPendingEvents(admin, 5);
      } catch (err) {
        safeLog.warn(SCOPE, 'inline process failed', { error: err });
      }
    }

    const connected = shouldMarkHealthSourceConnected({
      sampleCount: samples.length,
      eventInserted: true,
    });

    if (connected) {
      await withTimeout(
        admin.from('connected_sources').upsert(
          {
            user_id: userId,
            provider: body.source,
            status: 'connected',
            scopes: ['health_read'],
            connected_at: new Date().toISOString(),
            last_sync_at: new Date().toISOString(),
            error_detail: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,provider' },
        ),
        4000,
        `${SCOPE}.upsertSource`,
      );
      await seedDefaultPrecedence(admin, userId);
    }

    return NextResponse.json({
      ok: true,
      batch_id: body.batch_id,
      sample_count: samples.length,
      connected,
    });
  } catch (err) {
    safeLog.error(SCOPE, 'health-sync failed', { error: err });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
