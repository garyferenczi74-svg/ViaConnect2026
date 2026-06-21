// Prompt: GeneX360 purchase seeding. Tests for seedSamplePanels, the service that
// seeds a member's six GeneX360 panels with curated SAMPLE data once when they buy
// the bundle. Idempotent, owner-scoped, fail-soft.
//
// The mock supabase is a hand-rolled object whose .from(table) returns a chainable
// builder. Each builder records inserts and upserts into a shared captures object
// keyed by table name. The is_sample idempotency check is driven by a configurable
// seedCheckRows value (empty by default = not yet seeded).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { seedSamplePanels } from "../seedSamplePanels";
import { SAMPLE_VARIANTS } from "../samplePanelData";
import { SAMPLE_EPIGEN } from "../samplePanelData";

interface Capture {
  table: string;
  rows: unknown;
  conflict?: string;
}

interface MockOptions {
  // Rows returned by the user_variants is_sample idempotency select.
  seedCheckRows?: unknown[];
  // If set, the named operation throws to exercise fail-soft.
  throwOn?: "variants-upsert" | "epigen-upsert" | "dna-insert";
}

function makeSupabase(opts: MockOptions = {}) {
  const captures: Capture[] = [];
  const seedCheckRows = opts.seedCheckRows ?? [];
  let dnaUploadId = 0;
  let epigenUploadId = 0;

  function from(table: string) {
    const builder: Record<string, unknown> = {};

    // Chainable no-op filters for the idempotency select.
    builder.select = () => builder;
    builder.eq = () => builder;
    builder.limit = () =>
      Promise.resolve({ data: seedCheckRows, error: null });

    builder.insert = (rows: unknown) => {
      if (table === "dna_uploads" && opts.throwOn === "dna-insert") {
        throw new Error("boom dna insert");
      }
      captures.push({ table, rows });
      // The provenance inserts chain .select('id').single().
      return {
        select: () => ({
          single: () => {
            if (table === "dna_uploads") {
              dnaUploadId += 1;
              return Promise.resolve({
                data: { id: `dna-${dnaUploadId}` },
                error: null,
              });
            }
            if (table === "epigenetic_uploads") {
              epigenUploadId += 1;
              return Promise.resolve({
                data: { id: `epi-${epigenUploadId}` },
                error: null,
              });
            }
            return Promise.resolve({ data: { id: "x" }, error: null });
          },
        }),
      };
    };

    builder.upsert = (rows: unknown, options: { onConflict: string }) => {
      if (table === "user_variants" && opts.throwOn === "variants-upsert") {
        throw new Error("boom variants upsert");
      }
      if (
        table === "user_epigenetic_markers" &&
        opts.throwOn === "epigen-upsert"
      ) {
        throw new Error("boom epigen upsert");
      }
      captures.push({ table, rows, conflict: options.onConflict });
      return Promise.resolve({ error: null });
    };

    return builder;
  }

  return { client: { from }, captures };
}

function captureFor(captures: Capture[], table: string): Capture | undefined {
  return captures.find((c) => c.table === table);
}

describe("seedSamplePanels", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("is idempotent: writes nothing and returns skipped when a sample row already exists", async () => {
    const { client, captures } = makeSupabase({ seedCheckRows: [{ id: "s1" }] });

    const result = await seedSamplePanels(client, "user-1");

    expect(result).toEqual({ variants: 0, epigen: 0, skipped: true });
    // No provenance or data writes happened.
    expect(captureFor(captures, "dna_uploads")).toBeUndefined();
    expect(captureFor(captures, "user_variants")).toBeUndefined();
    expect(captureFor(captures, "epigenetic_uploads")).toBeUndefined();
    expect(captureFor(captures, "user_epigenetic_markers")).toBeUndefined();
  });

  it("happy path: seeds variants and epigen with provenance, is_sample, and conflict keys", async () => {
    const { client, captures } = makeSupabase({ seedCheckRows: [] });

    const result = await seedSamplePanels(client, "user-1");

    expect(result.skipped).toBe(false);
    expect(result.variants).toBe(SAMPLE_VARIANTS.length);
    expect(result.epigen).toBe(SAMPLE_EPIGEN.length);

    // dna_uploads provenance row.
    const dnaUpload = captureFor(captures, "dna_uploads");
    expect(dnaUpload).toBeDefined();
    expect(dnaUpload?.rows).toMatchObject({
      user_id: "user-1",
      provider: "ViaConnect GeneX360",
      is_farmceutica: true,
      branded_product_code: "genex360-complete",
      source_filename: null,
      status: "completed",
    });

    // user_variants upsert.
    const variants = captureFor(captures, "user_variants");
    expect(variants).toBeDefined();
    expect(variants?.conflict).toBe("user_id,rsid,panel_key");
    const variantRows = variants?.rows as Array<Record<string, unknown>>;
    expect(variantRows).toHaveLength(SAMPLE_VARIANTS.length);
    expect(variantRows.every((r) => r.is_sample === true)).toBe(true);
    expect(variantRows.every((r) => r.user_id === "user-1")).toBe(true);
    expect(variantRows.every((r) => r.upload_id === "dna-1")).toBe(true);
    // Mirror dnaUploadStore exact shape fields.
    expect(variantRows[0]).toMatchObject({
      chromosome: "",
      position: "",
      status: "",
    });

    // epigenetic_uploads provenance row.
    const epiUpload = captureFor(captures, "epigenetic_uploads");
    expect(epiUpload).toBeDefined();
    const todayIso = new Date().toISOString().slice(0, 10);
    expect(epiUpload?.rows).toMatchObject({
      user_id: "user-1",
      source_filename: null,
      source_type: "manual",
      lab_name: "ViaConnect GeneX360 (sample)",
      measured_on: todayIso,
      status: "completed",
    });

    // user_epigenetic_markers upsert.
    const epi = captureFor(captures, "user_epigenetic_markers");
    expect(epi).toBeDefined();
    expect(epi?.conflict).toBe("user_id,marker_key,measured_on");
    const epiRows = epi?.rows as Array<Record<string, unknown>>;
    expect(epiRows).toHaveLength(SAMPLE_EPIGEN.length);
    expect(epiRows.every((r) => r.is_sample === true)).toBe(true);
    expect(epiRows.every((r) => r.upload_id === "epi-1")).toBe(true);
    expect(epiRows[0]).toMatchObject({
      user_id: "user-1",
      confidence: "medium",
      source_type: "manual",
      measured_on: todayIso,
    });
  });

  it("splits genotype into allele1 and allele2 by first and second char", async () => {
    const { client, captures } = makeSupabase({ seedCheckRows: [] });

    await seedSamplePanels(client, "user-1");

    const variantRows = captureFor(captures, "user_variants")
      ?.rows as Array<Record<string, unknown>>;

    // Pick a known variant from the dataset (MTHFR rs1801133, methylation, TT).
    const known = SAMPLE_VARIANTS.find(
      (v) => v.rsid === "rs1801133" && v.panel_key === "methylation",
    );
    expect(known).toBeDefined();
    const row = variantRows.find(
      (r) => r.rsid === known?.rsid && r.panel_key === known?.panel_key,
    );
    expect(row).toBeDefined();
    expect(row?.allele1).toBe(known?.genotype.charAt(0) || "");
    expect(row?.allele2).toBe(known?.genotype.charAt(1) || "");
  });

  it("fail-soft: when a builder throws, resolves to a zeroed result rather than rejecting", async () => {
    const { client } = makeSupabase({
      seedCheckRows: [],
      throwOn: "variants-upsert",
    });

    const result = await seedSamplePanels(client, "user-1");

    expect(result).toEqual({ variants: 0, epigen: 0, skipped: false });
  });

  it("source file contains no em or en dashes", () => {
    const src = readFileSync(
      join(__dirname, "..", "seedSamplePanels.ts"),
      "utf8",
    );
    expect(src.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(src.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
