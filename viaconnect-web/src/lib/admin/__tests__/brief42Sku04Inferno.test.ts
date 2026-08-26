import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MASTER_FORMULATIONS } from "@/data/masterFormulations";

type MasterSkuRow = {
  SKU: string;
  Name: string;
  MSRP: number;
  COGS: number;
  Category: string;
};

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function loadMasterSkus(): MasterSkuRow[] {
  const raw = read("src/data/farmceutica_master_skus.json").replace(/^\uFEFF/, "");
  return JSON.parse(raw) as MasterSkuRow[];
}

describe("Brief 42 SKU 04 display name is Inferno", () => {
  const catalog = loadMasterSkus();
  const sku04 = catalog.find((row) => row.SKU === "04");

  it("keeps SKU 04 at the same id and $88.88 price", () => {
    expect(sku04).toBeDefined();
    expect(sku04?.SKU).toBe("04");
    expect(sku04?.MSRP).toBe(88.88);
    expect(sku04?.COGS).toBe(7.68);
    expect(sku04?.Category).toBe("Base");
  });

  it("renders Inferno, not GLP-1 Activator Complex", () => {
    expect(sku04?.Name).toBe("Inferno");
    expect(sku04?.Name).not.toMatch(/GLP-1/i);
    expect(sku04?.Name).not.toContain("Metabolic Activator Complex");
    expect(sku04?.Name).not.toMatch(/Semaglutide|tirzepatide|GLP-1 companion/i);
  });

  it("does not invent SKUs 63-66 into the live 64-SKU set", () => {
    const liveIds = catalog
      .map((row) => row.SKU)
      .filter((sku) => Number(sku) <= 62 || sku === "67" || sku === "68");
    expect(liveIds).toHaveLength(64);
    expect(liveIds).toContain("04");
    expect(liveIds).toContain("67");
    expect(liveIds).toContain("68");
    expect(catalog.some((row) => row.SKU === "04" && row.Name === "Inferno")).toBe(true);
  });

  it("admin catalog pages render live master_skus.name, not a hardcoded GLP-1 title", () => {
    const home = read("src/app/(app)/admin/page.tsx");
    const skus = read("src/app/(app)/admin/skus/page.tsx");
    const loader = read("src/lib/admin/live-catalog.ts");
    expect(home).toContain("sku.name");
    expect(skus).toContain("s.name");
    expect(loader).toContain('from("master_skus")');
    expect(home).not.toContain("GLP-1 Activator Complex");
    expect(skus).not.toContain("GLP-1 Activator Complex");
    expect(loader).not.toContain("GLP-1 Activator Complex");
  });

  it("consumer formulation display name for this SKU is Inferno", () => {
    const inferno = MASTER_FORMULATIONS.find((row) => row.slug === "inferno-glp1-activator-complex");
    expect(inferno?.name).toBe("Inferno");
    expect(inferno?.name).not.toMatch(/GLP-1/i);
    expect(inferno?.marketingDescription).toContain("Inferno is engineered");
    expect(inferno?.marketingDescription).not.toContain("GLP-1 Activator Complex");
    expect(inferno?.marketingDescription).not.toContain("Metabolic Activator Complex");
    expect(inferno?.marketingDescription).not.toMatch(/Semaglutide|tirzepatide/i);
  });

  it("protocol lines for this SKU use Inferno", () => {
    const protocol = read("src/lib/ultrathink/generateProtocol.ts");
    expect(protocol).toContain("- Inferno (Capsule)");
    expect(protocol).toContain("Metabolic / blood sugar → Inferno (PRIMARY)");
    expect(protocol).not.toMatch(/GLP-1 Activator Complex \(Capsule\)/);
    expect(protocol).not.toMatch(/→ GLP-1 Activator Complex/);
    expect(protocol).not.toContain("Metabolic Activator Complex");
    expect(protocol).not.toMatch(/Semaglutide|tirzepatide|GLP-1 companion/);
  });

  it("migration renames display strings only and locks price/id", () => {
    const migration = read(
      "supabase/migrations/20260826010000_brief42_sku04_inferno_rename.sql",
    );
    expect(migration).toContain("name = 'Inferno'");
    expect(migration).toContain("WHERE sku = '04'");
    expect(migration).toContain("msrp = 88.88");
    expect(migration).toContain("master_sku = '04'");
    expect(migration).not.toContain("INSERT INTO public.master_skus");
    expect(migration).not.toMatch(/sku\s*=\s*'63'/);
    expect(migration).not.toContain("Semaglutide");
    expect(migration).not.toContain("tirzepatide");
    expect(migration).not.toContain("Metabolic Activator Complex");
    expect(migration).not.toContain("GLP-1 companion");
  });
});
