// Admin ERP wipe: /admin, /admin/board, /admin/inventory must not show
// staged Q1 2026 toolchain figures. Unauthorized roles fail closed.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  canAccessPortalPath,
  failClosedOnAuthTimeout,
  outOfRoleRedirect,
  OUT_OF_ROLE_REDIRECT,
} from "@/lib/auth/session-role";

const REPO = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(REPO, rel), "utf8");
}

const ADMIN_PAGES = [
  "src/app/(app)/admin/page.tsx",
  "src/app/(app)/admin/board/page.tsx",
  "src/app/(app)/admin/inventory/page.tsx",
  "src/app/(app)/admin/skus/page.tsx",
  "src/app/(app)/admin/alerts/page.tsx",
] as const;

const STAGED_MARKERS = [
  "13.7M",
  "13673531",
  "8500",
  "138.6",
  "Q1 2026",
  "farmceutica.ps1",
  "62 Products",
  "Star SKUs",
  "Urgent POs",
  "ViaCura",
  "Semaglutide",
  "as any",
  ": any",
  "as any[]",
];

const TOOLCHAIN_READS = [
  'from("board_metrics")',
  'from("inventory_reorder")',
  'from("sku_rationalization")',
  'from("alert_snapshots")',
  'from("executive_risks")',
];

describe("admin ERP pages no longer read toolchain fixtures", () => {
  it.each(ADMIN_PAGES)("%s has no staged markers or toolchain reads", (rel) => {
    const src = read(rel);
    for (const marker of STAGED_MARKERS) {
      expect(src, `${rel} still contains ${marker}`).not.toContain(marker);
    }
    for (const query of TOOLCHAIN_READS) {
      expect(src, `${rel} still queries ${query}`).not.toContain(query);
    }
  });

  it("board page requires a live snapshot and does not render KPI tiles", () => {
    const src = read("src/app/(app)/admin/board/page.tsx");
    expect(src).toMatch(/ADMIN_BOARD_EMPTY_COPY/);
    expect(src).not.toMatch(/rule_of_40|ltv_to_cac|monthly_fcf|cash_runway/);
    expect(src).not.toMatch(/Investor Highlights/);
  });

  it("inventory page does not clone demand / safety / reorder theater", () => {
    const src = read("src/app/(app)/admin/inventory/page.tsx");
    expect(src).toMatch(/ADMIN_INVENTORY_EMPTY_COPY/);
    expect(src).not.toMatch(/avg_monthly_demand|safety_stock|reorder_point|po_urgency/);
    expect(src).not.toMatch(/211|394|493/);
  });

  it("admin home wires live catalog loader and honest empty board copy", () => {
    const src = read("src/app/(app)/admin/page.tsx");
    expect(src).toMatch(/loadAdminLiveCatalog/);
    expect(src).toMatch(/resolveSessionRole/);
    expect(src).toMatch(/ADMIN_BOARD_EMPTY_COPY/);
    expect(src).toMatch(/ADMIN_INVENTORY_EMPTY_COPY/);
    expect(src).toMatch(/ADMIN_ALERTS_EMPTY_COPY/);
    expect(src).not.toMatch(/from\("board_metrics"\)/);
  });

  it("sku page lists live catalog columns, not star scores", () => {
    const src = read("src/app/(app)/admin/skus/page.tsx");
    expect(src).toMatch(/loadAdminLiveCatalog/);
    expect(src).not.toMatch(/composite_score|rationalization|tierCounts/);
  });

  it("live catalog loader reads master_skus and orders only", () => {
    const src = read("src/lib/admin/live-catalog.ts");
    expect(src).toMatch(/from\("master_skus"\)/);
    expect(src).toMatch(/from\("orders"\)/);
    expect(src).not.toMatch(/board_metrics|inventory_reorder|sku_rationalization/);
  });

  it("wipe migration deletes staged rows and leaves catalog tables", () => {
    const src = read("supabase/migrations/20260824200000_wipe_staged_admin_erp.sql");
    expect(src).toMatch(/DELETE FROM public.board_metrics/);
    expect(src).toMatch(/DELETE FROM public.inventory_reorder/);
    expect(src).toMatch(/DELETE FROM public.sku_rationalization/);
    expect(src).toMatch(/DELETE FROM public.alert_snapshots/);
    expect(src).toMatch(/DELETE FROM public.executive_risks/);
    expect(src).toMatch(/Does not touch master_skus, products, or orders/);
    expect(src).not.toMatch(/DROP TABLE/);
    expect(src).not.toMatch(/INSERT INTO/);
  });
});

describe("unauthorized roles fail closed on admin ERP URLs", () => {
  it("consumer cannot open /admin, /admin/board, or /admin/inventory", () => {
    expect(canAccessPortalPath("consumer", "/admin")).toBe(false);
    expect(canAccessPortalPath("consumer", "/admin/board")).toBe(false);
    expect(canAccessPortalPath("consumer", "/admin/inventory")).toBe(false);
    expect(outOfRoleRedirect("consumer", "/admin/board")).toBe(OUT_OF_ROLE_REDIRECT);
  });

  it("practitioner and naturopath cannot open admin ERP URLs", () => {
    expect(canAccessPortalPath("practitioner", "/admin")).toBe(false);
    expect(canAccessPortalPath("practitioner", "/admin/board")).toBe(false);
    expect(canAccessPortalPath("naturopath", "/admin/inventory")).toBe(false);
  });

  it("admin can open the three ERP URLs", () => {
    expect(canAccessPortalPath("admin", "/admin")).toBe(true);
    expect(canAccessPortalPath("admin", "/admin/board")).toBe(true);
    expect(canAccessPortalPath("admin", "/admin/inventory")).toBe(true);
  });

  it("auth timeout denies the three ERP URLs", () => {
    expect(failClosedOnAuthTimeout("/admin")).toBe(true);
    expect(failClosedOnAuthTimeout("/admin/board")).toBe(true);
    expect(failClosedOnAuthTimeout("/admin/inventory")).toBe(true);
  });

  it("admin layout still fail-closes on profiles.role", () => {
    const src = read("src/app/(app)/admin/layout.tsx");
    expect(src).toMatch(/resolveSessionRole/);
    expect(src).toMatch(/canAccessPortalPath/);
    expect(src).toMatch(/outOfRoleRedirect/);
  });

  it("helix remains consumer-only for APIs", () => {
    expect(canAccessPortalPath("admin", "/api/helix/redeem")).toBe(false);
    expect(canAccessPortalPath("consumer", "/helix")).toBe(true);
    expect(canAccessPortalPath("practitioner", "/helix")).toBe(false);
  });
});
