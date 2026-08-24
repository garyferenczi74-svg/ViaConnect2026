/**
 * Live Admin catalog and order reads. master_skus and orders are real
 * tables. Do not join toolchain score / reorder / board fixture tables.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionRole } from "@/lib/auth/session-role";
import { catalogForAdminRole, liveCountForAdminRole } from "@/lib/admin/erp-honesty";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export type LiveCatalogSku = {
  sku: string;
  name: string;
  category: string;
  msrp: number;
};

export type LiveCatalogSnapshot = {
  skus: readonly LiveCatalogSku[];
  skuCount: number | null;
  orderCount: number | null;
  lookupFailed: boolean;
};

type CatalogRow = {
  sku: string;
  name: string;
  category: string;
  msrp: number;
};

export function emptyLiveCatalogSnapshot(): LiveCatalogSnapshot {
  return {
    skus: [],
    skuCount: null,
    orderCount: null,
    lookupFailed: false,
  };
}

export function snapshotForAdminRole(
  role: SessionRole | undefined,
  snapshot: LiveCatalogSnapshot,
): LiveCatalogSnapshot {
  return {
    skus: catalogForAdminRole(role, snapshot.skus),
    skuCount: liveCountForAdminRole(role, snapshot.skuCount),
    orderCount: liveCountForAdminRole(role, snapshot.orderCount),
    lookupFailed: snapshot.lookupFailed,
  };
}

export function toLiveCatalogSku(row: CatalogRow): LiveCatalogSku {
  return {
    sku: row.sku,
    name: row.name,
    category: row.category,
    msrp: row.msrp,
  };
}

export async function loadAdminLiveCatalog(
  supabase: SupabaseClient,
  role: SessionRole | undefined,
  scope = "admin.catalog",
): Promise<LiveCatalogSnapshot> {
  if (role !== "admin") {
    return emptyLiveCatalogSnapshot();
  }

  try {
    const [skuResult, orderResult] = await Promise.all([
      withTimeout(
        supabase
          .from("master_skus")
          .select("sku, name, category, msrp")
          .order("sku"),
        8000,
        `${scope}.master_skus`,
      ),
      withTimeout(
        supabase.from("orders").select("*", { count: "exact", head: true }),
        8000,
        `${scope}.orders`,
      ),
    ]);

    if (skuResult.error || orderResult.error) {
      safeLog.warn(scope, "live catalog lookup failed", {
        skuError: skuResult.error?.message,
        orderError: orderResult.error?.message,
      });
      return snapshotForAdminRole(role, {
        skus: [],
        skuCount: null,
        orderCount: null,
        lookupFailed: true,
      });
    }

    const rows = (skuResult.data ?? []) as CatalogRow[];
    const skus = rows.map(toLiveCatalogSku);
    return snapshotForAdminRole(role, {
      skus,
      skuCount: skus.length,
      orderCount: orderResult.count ?? 0,
      lookupFailed: false,
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(scope, "live catalog timed out", {
        operation: error.operation,
      });
    } else {
      safeLog.error(scope, "live catalog lookup failed", { error });
    }
    return snapshotForAdminRole(role, {
      skus: [],
      skuCount: null,
      orderCount: null,
      lookupFailed: true,
    });
  }
}
