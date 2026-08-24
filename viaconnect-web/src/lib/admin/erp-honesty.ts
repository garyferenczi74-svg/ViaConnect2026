/**
 * Admin ERP honesty. The FarmCeutica PowerShell toolchain
 * (board / inventory / sku-rationalize / alerts) seeded Q1 2026 fixtures.
 * Those tables are not a live finance or warehouse snapshot.
 */

import type { SessionRole } from "@/lib/auth/session-role";

export const STAGED_TOOLCHAIN_TABLES = [
  "board_metrics",
  "inventory_reorder",
  "sku_rationalization",
  "alert_snapshots",
  "executive_risks",
] as const;

export type StagedToolchainTable = (typeof STAGED_TOOLCHAIN_TABLES)[number];

export const STAGED_BOARD_MARKERS = [
  "13.7M",
  "13673531",
  "8500",
  "138.6",
  "Q1 2026",
  "farmceutica.ps1",
] as const;

export const ADMIN_BOARD_EMPTY_COPY =
  "Board Metrics stay empty until a live finance snapshot is connected. Shopify is not a KPI source, and investor figures are not generated.";

export const ADMIN_INVENTORY_EMPTY_COPY =
  "No warehouse on-hand snapshot is connected. Demand, safety stock, and reorder points are not generated.";

export const ADMIN_ALERTS_EMPTY_COPY = "No live operational alerts.";

export const ADMIN_CATALOG_EMPTY_COPY = "No catalog rows yet.";

export const ADMIN_ORDERS_EMPTY_COPY = "No orders yet.";

export const ADMIN_LOOKUP_FAILED_COPY =
  "Live data could not be loaded. No staged figures are shown.";

/** Shopify / finance KPI snapshot is not connected. */
export function isLiveFinanceSnapshotConnected(): boolean {
  return false;
}

/** Warehouse demand / safety / reorder snapshot is not connected. */
export function isLiveWarehouseSnapshotConnected(): boolean {
  return false;
}

export function isStagedToolchainTable(name: string): boolean {
  return (STAGED_TOOLCHAIN_TABLES as readonly string[]).includes(name);
}

/**
 * Catalog rows for Admin chrome. Unauthorized roles stay empty.
 * Never substitute a staged SKU score list.
 */
export function catalogForAdminRole<T>(
  role: SessionRole | undefined,
  rows: readonly T[],
): readonly T[] {
  if (role !== "admin") return [];
  return rows;
}

/**
 * Live count for Admin chrome. Unauthorized roles get null (not 0).
 * Null means "do not render a number."
 */
export function liveCountForAdminRole(
  role: SessionRole | undefined,
  count: number | null,
): number | null {
  if (role !== "admin") return null;
  return count;
}

export function formatCatalogPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
