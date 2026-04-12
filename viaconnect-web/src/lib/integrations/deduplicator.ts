// Deduplication engine (Prompt #62j).
// Prevents duplicate data from repeat webhook fires or polling overlaps.

import type { NormalizedData } from './dataNormalizer';

interface ExistingRecord {
  source_id: string;
  external_id: string;
  synced_at: string;
}

export async function deduplicateData(
  incoming: NormalizedData[],
  userId: string,
): Promise<NormalizedData[]> {
  if (incoming.length === 0) return [];

  // Fetch existing records for dedup check
  let existing: ExistingRecord[] = [];
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const date = incoming[0].date;

    const { data } = await (supabase as any)
      .from('daily_score_inputs')
      .select('source_id, external_id:raw_value, synced_at:recorded_at')
      .eq('user_id', userId)
      .eq('score_date', date);

    existing = (data ?? []).filter((e: any) => e.external_id);
  } catch {
    // Table may not exist; allow all data through
    return incoming;
  }

  return incoming.filter((item) => {
    const isDupe = existing.some(
      (e) => e.source_id === item.source.appId && String(e.external_id) === item.source.originalId,
    );

    if (isDupe) {
      // Allow if incoming is newer (update case)
      const existingRecord = existing.find(
        (e) => e.source_id === item.source.appId && String(e.external_id) === item.source.originalId,
      );
      if (existingRecord && new Date(item.timestamp) > new Date(existingRecord.synced_at)) {
        return true;
      }
      return false;
    }

    return true;
  });
}
