-- Prompt 172e Phase A Deliverable 1: pre patch snapshot of hydration meal items.
--
-- Append only. Captures the pre Maughan patch state of every meal_items row
-- that has a hydration_ml value so the 170o Gordon LP1 1.0 coefficient table
-- (the OLD coefficients) is recoverable for rollback verification before the
-- Prompt 172e patch lands the new Maughan grounded coefficients in
-- src/lib/nutrition/hydration/types.ts.
--
-- effective_hydration_ml_old captures the value as it was computed and
-- persisted under the old coefficients; the column is what the row would
-- evaluate to if the OLD ratio table were re run against portion_volume_ml
-- and hydration_source_kind. We do not recompute that here: hydration_ml
-- already stores the result the old code wrote at save time, so a faithful
-- snapshot is the persisted column itself.
--
-- RLS: service role only. Snapshot tables are operational, not consumer
-- facing.

CREATE TABLE IF NOT EXISTS public.meal_items_hydration_backup_172e (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_item_id UUID NOT NULL,
  user_id UUID NOT NULL,
  meal_id UUID NOT NULL,
  hydration_ml NUMERIC(10,2) NOT NULL,
  hydration_source_kind TEXT,
  portion_volume_ml NUMERIC(10,2),
  effective_hydration_ml_old NUMERIC(10,2) NOT NULL,
  snapshot_taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_items_hydration_backup_172e_user
  ON public.meal_items_hydration_backup_172e(user_id, meal_id);

ALTER TABLE public.meal_items_hydration_backup_172e ENABLE ROW LEVEL SECURITY;
-- Service role inserts and selects only. No client visible policies.

COMMENT ON TABLE public.meal_items_hydration_backup_172e IS
  'Prompt 172e Phase A pre patch snapshot. Captures meal_items hydration state under the OLD Gordon LP1 1.0 coefficients before the Maughan conservative patch in src/lib/nutrition/hydration/types.ts lands. Use snapshot_taken_at + row count for rollback verification.';

-- Capture every existing meal_items row that has a hydration_source_kind. The
-- meals table holds user_id and meal_id, so we join through to fill those
-- columns; effective_hydration_ml_old is the persisted hydration_ml under
-- the old coefficient table.
INSERT INTO public.meal_items_hydration_backup_172e (
  meal_item_id, user_id, meal_id, hydration_ml,
  hydration_source_kind, portion_volume_ml, effective_hydration_ml_old
)
SELECT
  mi.id,
  m.user_id,
  m.meal_id,
  mi.hydration_ml,
  mi.hydration_source_kind,
  mi.portion_volume_ml,
  mi.hydration_ml
FROM public.meal_items mi
JOIN public.meals m ON m.meal_id = mi.meal_id
WHERE mi.hydration_source_kind IS NOT NULL;
