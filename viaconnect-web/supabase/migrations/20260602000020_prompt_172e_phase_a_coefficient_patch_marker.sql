-- Prompt 172e Phase A Deliverable 2: 170o coefficient patch marker.
--
-- The live 170o coefficient table is a TypeScript constant
-- HYDRATION_RATIO_ADJUSTED in src/lib/nutrition/hydration/types.ts, not a
-- Supabase lookup. The patch is therefore a code edit applied in the same
-- commit as this migration; this file is a discoverable audit marker so
-- that the migrations directory carries the full Phase A timeline.
--
-- Patch summary per Gordon Deliverable 1 ratified 2026-06-02:
--   pure_water      1.00 -> 1.00 (unchanged)
--   coffee_tea      1.00 -> 1.00 (unchanged)
--   juice_smoothie  0.90 -> 1.20 (OJ BHI 1.39, conservative 0.19 haircut)
--   dairy           0.85 -> 1.30 (whole milk BHI 1.50, conservative 0.20 haircut)
--   soda            0.80 -> 1.00 (cola BHI 1.01 matched)
--   alcohol_low     0.95 -> 1.00 (lager BHI 1.01 matched)
--   alcohol_high    0.65 -> 1.00 (lager anchor extrapolated, flat; wine vs spirits split dropped)
--   sports_drink    0.95 -> 1.00 (BHI 1.04, conservative 0.04 haircut)
--   high_water_food 0    -> 0.90 (Gordon derived, no Maughan anchor; flag for Hannah Phase B review)
--
-- Critical ordering: this marker migration sits BETWEEN the snapshot
-- migration (20260602000010) and the beverage_catalog table create
-- (20260602000030) plus its seed load. Alcohol high routed beverages
-- (alcohol_wine, alcohol_spirits, alcohol_cocktail) thus carry the new
-- 1.00 enum runtime when the seed lands.
--
-- Rollback: revert src/lib/nutrition/hydration/types.ts to the values
-- in this header and restore meal_items.hydration_ml from
-- meal_items_hydration_backup_172e if downstream aggregations drift.

-- Audit row placeholder. Migrations with no DDL body are still valid and
-- still registered; this is a documentation only marker.
DO $$
BEGIN
  RAISE NOTICE 'Prompt 172e Phase A coefficient patch marker; live table is src/lib/nutrition/hydration/types.ts.';
END $$;
