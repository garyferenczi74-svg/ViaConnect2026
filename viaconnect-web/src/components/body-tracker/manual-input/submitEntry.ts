import { createClient } from '@/lib/supabase/client';
import {
  getDataSource,
  type DataSourceId,
  type ConditionContext,
  type TimeOfDay,
} from '@/lib/body-tracker/manual-input';

export type DetailTable =
  | 'body_tracker_weight'
  | 'body_tracker_segmental_fat'
  | 'body_tracker_segmental_muscle'
  | 'body_tracker_metabolic';

export interface SubmitEntryInput {
  userId: string;
  entryDate: string;
  manualSourceId: DataSourceId;
  scanPhotoUrl?: string | null;
  notes?: string | null;
  conditionContext?: ConditionContext;
  timeOfDay?: TimeOfDay;
  details: Array<{
    table: DetailTable;
    row: Record<string, unknown>;
  }>;
}

export interface SubmitEntryResult {
  entryId: string;
}

/**
 * Inserts a body_tracker_entries row plus N detail rows atomically enough
 * for our needs (single transaction isn't exposed via supabase-js, but
 * the entry id is required for detail FK so any failure after the header
 * leaves an orphan header — we surface the error so UI can offer retry).
 */
export async function submitEntry(input: SubmitEntryInput): Promise<SubmitEntryResult> {
  const supabase = createClient();
  const src = getDataSource(input.manualSourceId);
  if (!src) throw new Error(`Unknown data source: ${input.manualSourceId}`);

  const { data: entry, error: entryErr } = await supabase
    .from('body_tracker_entries')
    .insert({
      user_id: input.userId,
      entry_date: input.entryDate,
      source: 'manual',
      manual_source_id: src.id,
      manual_source_tier: src.tier,
      confidence: src.confidence,
      scan_photo_url: input.scanPhotoUrl ?? null,
      notes: input.notes ?? null,
      condition_context: input.conditionContext ?? 'resting',
      time_of_day: input.timeOfDay ?? null,
      device_name: null,
    } as never)
    .select('id')
    .single();

  if (entryErr || !entry) {
    throw new Error(entryErr?.message ?? 'Failed to create body tracker entry');
  }

  const entryId = (entry as { id: string }).id;

  for (const d of input.details) {
    const { error: dErr } = await supabase
      .from(d.table)
      .insert({
        ...d.row,
        entry_id: entryId,
        user_id: input.userId,
      } as never);
    if (dErr) {
      throw new Error(`Failed to insert ${d.table}: ${dErr.message}`);
    }
  }

  return { entryId };
}
