-- Wipe staged FarmCeutica toolchain ERP rows used by /admin, /admin/board,
-- and /admin/inventory. Those tables were seeded from Q1 2026 PowerShell
-- fixtures (board_metrics.json / inventory_reorder_plan.json), not live
-- Shopify or warehouse snapshots.
-- Append-only. Does not drop tables or edit prior migrations.
-- Does not touch master_skus, products, or orders.

DO $$
BEGIN
  IF to_regclass('public.board_metrics') IS NOT NULL THEN
    DELETE FROM public.board_metrics;
  END IF;

  IF to_regclass('public.inventory_reorder') IS NOT NULL THEN
    DELETE FROM public.inventory_reorder;
  END IF;

  IF to_regclass('public.sku_rationalization') IS NOT NULL THEN
    DELETE FROM public.sku_rationalization;
  END IF;

  IF to_regclass('public.alert_snapshots') IS NOT NULL THEN
    DELETE FROM public.alert_snapshots;
  END IF;

  IF to_regclass('public.executive_risks') IS NOT NULL THEN
    DELETE FROM public.executive_risks;
  END IF;
END $$;
