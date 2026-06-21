// Prompt 204 (2026-06-21): the per-tab panel scope on persistInterpretedVariants.
// A genotype panel tab passes its panel_key so an upload populates only that
// panel's variants (each upload tab is its own independent capture). Verified by
// inspecting exactly which rows reach the user_variants upsert.

import { describe, it, expect } from "vitest";
import { persistInterpretedVariants } from "../dnaUploadStore";
import type { InterpretedVariant } from "../dnaAnalysisEngine";

function variant(rsid: string, panel_key: InterpretedVariant["panel_key"]): InterpretedVariant {
  return {
    rsid,
    gene: "GENE",
    panel_key,
    chromosome: "1",
    position: "1",
    genotype: "CT",
    allele1: "C",
    allele2: "T",
    status: "+/-",
    clinical_significance: "",
  };
}

// A mock supabase that records the rows handed to the user_variants upsert.
function makeSupabase() {
  const captured: { userVariants: unknown[][] } = { userVariants: [] };
  const client = {
    from(table: string) {
      if (table === "dna_uploads") {
        return {
          insert: () => ({
            select: () => ({ single: async () => ({ data: { id: "up1" }, error: null }) }),
          }),
        };
      }
      if (table === "user_variants") {
        return {
          upsert: async (rows: unknown[]) => {
            captured.userVariants.push(rows);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  return { client, captured };
}

const PROV = { provider: "test", isFarmceutica: false, brandedProductCode: null, sourceFilename: null };

describe("persistInterpretedVariants panel scope", () => {
  const mixed: InterpretedVariant[] = [
    variant("rs1", "methylation"),
    variant("rs2", "nutrition"),
    variant("rs3", "nutrition"),
    variant("rs4", "hormone"),
  ];

  it("writes only the scoped panel's variants", async () => {
    const { client, captured } = makeSupabase();
    const result = await persistInterpretedVariants(client, "u1", mixed, PROV, "nutrition");
    expect(result.variantCount).toBe(2);
    const written = captured.userVariants.flat() as Array<{ rsid: string; panel_key: string }>;
    expect(written.map((r) => r.rsid).sort()).toEqual(["rs2", "rs3"]);
    expect(written.every((r) => r.panel_key === "nutrition")).toBe(true);
  });

  it("writes every panel when no scope is given", async () => {
    const { client, captured } = makeSupabase();
    const result = await persistInterpretedVariants(client, "u1", mixed, PROV);
    expect(result.variantCount).toBe(4);
    expect((captured.userVariants.flat() as unknown[]).length).toBe(4);
  });

  it("writes nothing when the scope matches no variant", async () => {
    const { client, captured } = makeSupabase();
    const result = await persistInterpretedVariants(client, "u1", mixed, PROV, "cannabis");
    expect(result.variantCount).toBe(0);
    expect(captured.userVariants.length).toBe(0);
  });
});
