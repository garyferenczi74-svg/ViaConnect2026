import { createClient } from '@/lib/supabase/client';
import {
  getDataSource,
  type DataSourceId,
  type ConditionContext,
  type TimeOfDay,
} from '@/lib/body-tracker/manual-input';
import { canWriteSegmentalMuscleLbs } from '@/lib/body-tracker/composition/segmentalMuscleSources';

export type DetailTable =
  | 'body_tracker_weight'
  | 'body_tracker_segmental_fat'
  | 'body_tracker_segmental_muscle'
  | 'body_tracker_metabolic'
  | 'body_tracker_circumference';

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
 * leaves an orphan header , we surface the error so UI can offer retry).
 */
export function filterSubmitDetails(
  details: SubmitEntryInput['details'],
  sourceId: DataSourceId,
): SubmitEntryInput['details'] {
  return details.filter((d) => {
    if (d.table !== 'body_tracker_segmental_muscle') return true;
    return canWriteSegmentalMuscleLbs(sourceId);
  });
}

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

  let weightLogged = false;

  const details = filterSubmitDetails(input.details, input.manualSourceId);

  for (const d of details) {
    // Cast table name: body_tracker_circumference is in the live DB but not yet in
    // generated Supabase types until next typegen pass.
    const { error: dErr } = await supabase
      .from(d.table as never)
      .insert({
        ...d.row,
        entry_id: entryId,
        user_id: input.userId,
      } as never);
    if (dErr) {
      throw new Error(`Failed to insert ${d.table}: ${dErr.message}`);
    }
    if (d.table === 'body_tracker_weight') weightLogged = true;
  }

  // Prompt 173 Phase 7: a new weight log changes the live current weight
  // input to the Gordon macro engine (Section 5.6 + Section 7 precedence).
  // Fire-and-forget the recompute so the engine refreshes targets without
  // blocking the form save. Any failure is non-fatal; the next page mount
  // can retry via useNutritionTargets.regenerate().
  if (weightLogged) {
    void fetch('/api/nutrition/generate-targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => { /* non-fatal; UX continues */ });
  }

  return { entryId };
}
