import { describe, expect, it } from "vitest";
import {
  ADMIN_BOARD_EMPTY_COPY,
  ADMIN_INVENTORY_EMPTY_COPY,
  STAGED_TOOLCHAIN_TABLES,
  catalogForAdminRole,
  formatCatalogPrice,
  isLiveFinanceSnapshotConnected,
  isLiveWarehouseSnapshotConnected,
  isStagedToolchainTable,
  liveCountForAdminRole,
} from "@/lib/admin/erp-honesty";
import {
  emptyLiveCatalogSnapshot,
  loadAdminLiveCatalog,
  snapshotForAdminRole,
  toLiveCatalogSku,
} from "@/lib/admin/live-catalog";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("staged toolchain tables are not live sources", () => {
  it("names the board / inventory / sku / alert fixture tables", () => {
    expect(STAGED_TOOLCHAIN_TABLES).toEqual([
      "board_metrics",
      "inventory_reorder",
      "sku_rationalization",
      "alert_snapshots",
      "executive_risks",
    ]);
    expect(isStagedToolchainTable("board_metrics")).toBe(true);
    expect(isStagedToolchainTable("master_skus")).toBe(false);
    expect(isStagedToolchainTable("orders")).toBe(false);
  });

  it("does not treat Shopify or warehouse as connected", () => {
    expect(isLiveFinanceSnapshotConnected()).toBe(false);
    expect(isLiveWarehouseSnapshotConnected()).toBe(false);
  });

  it("empty copy does not invent ViaCura or investor math", () => {
    expect(ADMIN_BOARD_EMPTY_COPY).toMatch(/live finance snapshot/);
    expect(ADMIN_BOARD_EMPTY_COPY).not.toMatch(/ViaCura|13\.7|8500|Rule of 40/);
    expect(ADMIN_INVENTORY_EMPTY_COPY).toMatch(/warehouse on-hand snapshot/);
    expect(ADMIN_INVENTORY_EMPTY_COPY).not.toMatch(/Urgent PO|211|394/);
  });
});

describe("unauthorized roles fail closed", () => {
  const staged = [{ sku: "01", name: "Fixture+", category: "Base", msrp: 88.88 }];

  it("consumer and clinician do not receive catalog rows or counts", () => {
    expect(catalogForAdminRole("consumer", staged)).toEqual([]);
    expect(catalogForAdminRole("practitioner", staged)).toEqual([]);
    expect(catalogForAdminRole("naturopath", staged)).toEqual([]);
    expect(catalogForAdminRole(undefined, staged)).toEqual([]);
    expect(liveCountForAdminRole("consumer", 64)).toBeNull();
    expect(liveCountForAdminRole("practitioner", 0)).toBeNull();
  });

  it("admin receives the live rows only", () => {
    expect(catalogForAdminRole("admin", staged)).toEqual(staged);
    expect(liveCountForAdminRole("admin", 3)).toBe(3);
    expect(liveCountForAdminRole("admin", 0)).toBe(0);
  });

  it("snapshotForAdminRole blanks a non-admin snapshot", () => {
    const live = {
      skus: staged,
      skuCount: 1,
      orderCount: 4,
      lookupFailed: false,
    };
    expect(snapshotForAdminRole("consumer", live)).toEqual({
      skus: [],
      skuCount: null,
      orderCount: null,
      lookupFailed: false,
    });
    expect(snapshotForAdminRole("admin", live)).toEqual(live);
  });
});

describe("catalog helpers do not invent scores", () => {
  it("maps sku / name / category / msrp only", () => {
    expect(
      toLiveCatalogSku({
        sku: "14",
        name: "NeuroCalm+",
        category: "Advanced",
        msrp: 128.88,
      }),
    ).toEqual({
      sku: "14",
      name: "NeuroCalm+",
      category: "Advanced",
      msrp: 128.88,
    });
  });

  it("loadAdminLiveCatalog does not query when role is not admin", async () => {
    const supabase = {
      from: () => {
        throw new Error("toolchain or catalog must not be read for non-admin");
      },
    } as unknown as SupabaseClient;
    await expect(loadAdminLiveCatalog(supabase, "consumer")).resolves.toEqual(
      emptyLiveCatalogSnapshot(),
    );
    await expect(loadAdminLiveCatalog(supabase, undefined)).resolves.toEqual(
      emptyLiveCatalogSnapshot(),
    );
  });

  it("formats catalog prices without compact investor notation", () => {
    expect(formatCatalogPrice(128.88)).toBe("$128.88");
    expect(formatCatalogPrice(13.7)).toBe("$13.70");
    expect(emptyLiveCatalogSnapshot()).toEqual({
      skus: [],
      skuCount: null,
      orderCount: null,
      lookupFailed: false,
    });
  });
});
