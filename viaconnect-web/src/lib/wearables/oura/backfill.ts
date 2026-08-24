// 90-day Oura backfill through wearable_events. Secrets stay in env.

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { ouraGet } from './client';
import { getOuraAccessToken } from './tokens';

const SCOPE = 'lib.wearables.oura.backfill';

interface CollectionPage {
  data?: Array<Record<string, unknown>>;
  next_token?: string | null;
}

async function enqueue(
  admin: SupabaseClient,
  userId: string,
  eventType: string,
  externalId: string,
  payload: unknown,
  recordedAt: string | null,
): Promise<void> {
  const { error } = await withTimeout(
    admin.from('wearable_events').upsert(
      {
        user_id: userId,
        provider: 'oura',
        event_type: eventType,
        external_id: externalId,
        payload,
        recorded_at: recordedAt,
        processing_status: 'pending',
      },
      { onConflict: 'provider,external_id,event_type', ignoreDuplicates: true },
    ),
    4000,
    `${SCOPE}.enqueue`,
  );
  if (error) safeLog.warn(SCOPE, 'enqueue failed', { error, eventType });
}

async function paginate(
  admin: SupabaseClient,
  userId: string,
  access: string,
  path: string,
  eventType: string,
): Promise<void> {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 90);
  const startDate = start.toISOString().slice(0, 10);
  let next: string | null = null;
  let pages = 0;

  do {
    const qs = new URLSearchParams({ start_date: startDate });
    if (next) qs.set('next_token', next);
    const page = await ouraGet<CollectionPage>(`${path}?${qs.toString()}`, access);
    if (!page) break;
    for (const rec of page.data ?? []) {
      const id = String(rec.id ?? rec.day ?? '');
      if (!id) continue;
      const recorded =
        typeof rec.timestamp === 'string'
          ? rec.timestamp
          : typeof rec.day === 'string'
            ? `${rec.day}T00:00:00.000Z`
            : null;
      await enqueue(admin, userId, eventType, id, rec, recorded);
    }
    next = page.next_token ?? null;
    pages += 1;
    if (pages > 40) break;
    await new Promise((r) => setTimeout(r, 150));
  } while (next);
}

export async function enqueueOuraBackfill(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const access = await getOuraAccessToken(admin, userId);
  if (!access) {
    safeLog.warn(SCOPE, 'no access token for backfill', {});
    return;
  }
  try {
    await paginate(admin, userId, access, '/usercollection/daily_sleep', 'daily_sleep');
    await paginate(admin, userId, access, '/usercollection/sleep', 'sleep');
    await paginate(admin, userId, access, '/usercollection/daily_readiness', 'daily_readiness');
  } catch (err) {
    safeLog.error(SCOPE, 'backfill failed', { error: err });
  }
}
