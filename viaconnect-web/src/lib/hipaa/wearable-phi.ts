// Consumer wearable PHI consent. Sleep / HRV / activity / workouts require
// this stamp. Body composition and weight do not.

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';

const SCOPE = 'lib.hipaa.wearable-phi';

interface ConsentRow {
  wearable_phi_accepted_at?: string | null;
}

export function isPhiMetricType(type: string): boolean {
  const t = type.toLowerCase();
  if (t.includes('bodymass') || t.includes('bodyfat') || t.includes('leanbody') || t.includes('bodymassindex')) {
    return false;
  }
  return (
    t.includes('sleep') ||
    t.includes('step') ||
    t.includes('workout') ||
    t.includes('activeenergy') ||
    t.includes('hrv') ||
    t.includes('heartratevariability') ||
    t.includes('restingheartrate') ||
    t.includes('heart_rate') ||
    t.includes('workout')
  );
}

export function isBodyMetricType(type: string): boolean {
  const t = type.toLowerCase();
  return (
    t.includes('bodymass') ||
    t.includes('bodyfat') ||
    t.includes('leanbody') ||
    t.includes('bodymassindex') ||
    t.includes('weight')
  );
}

export async function hasWearablePhiConsent(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await withTimeout(
    admin.from('user_consents').select('wearable_phi_accepted_at').eq('user_id', userId).maybeSingle(),
    4000,
    `${SCOPE}.load`,
  );
  if (error || !data) return false;
  const row = data as ConsentRow;
  return Boolean(row.wearable_phi_accepted_at);
}

export async function acceptWearablePhiConsent(
  admin: SupabaseClient,
  userId: string,
): Promise<string> {
  const acceptedAt = new Date().toISOString();
  await withTimeout(
    admin.from('user_consents').upsert(
      {
        user_id: userId,
        wearable_phi_accepted_at: acceptedAt,
      },
      { onConflict: 'user_id' },
    ),
    4000,
    `${SCOPE}.upsert`,
  );
  return acceptedAt;
}

export function filterSamplesForPhiConsent<T extends { type: string }>(
  samples: T[],
  phiConsent: boolean,
): T[] {
  if (phiConsent) return samples;
  return samples.filter((s) => !isPhiMetricType(s.type) || isBodyMetricType(s.type));
}
