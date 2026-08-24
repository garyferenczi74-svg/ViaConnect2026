// After a real wearable persist, copy a contributor into BOS breakdown
// and enqueue recompute. Does not invent a history row.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getWearableSource } from '@/lib/scoring/sources/wearable-source';
import {
  applyWearableContributorToBreakdown,
  enqueueWearableBosRecompute,
} from '@/lib/scoring/wearable-contributor';
import { persistParsedHealthRecords } from './wearable-ingest';
import type { ParsedHealthRecord } from './apple-health-xml';

export async function persistRecordsAndBosContributor(
  admin: SupabaseClient,
  userId: string,
  records: ParsedHealthRecord[],
): Promise<{ stored: number; humeStored: number; bosApplied: boolean }> {
  const persist = await persistParsedHealthRecords(admin, userId, records);
  if (persist.stored <= 0) {
    return { stored: 0, humeStored: persist.humeStored, bosApplied: false };
  }
  const source = await getWearableSource(userId, admin);
  const applied = await applyWearableContributorToBreakdown(admin, userId, source);
  await enqueueWearableBosRecompute(admin, userId);
  return {
    stored: persist.stored,
    humeStored: persist.humeStored,
    bosApplied: applied.applied,
  };
}
