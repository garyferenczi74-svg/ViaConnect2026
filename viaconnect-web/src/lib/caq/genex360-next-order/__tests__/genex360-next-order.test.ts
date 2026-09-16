import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getProtocolFromContext, routeGroundedTool } from "@/lib/jeffery/grounded/tool-router";
import { LLM_GROUNDED_CHAT_FLAG } from "@/lib/jeffery/grounded/flag";
import {
  STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST,
  isEducationShapedViacuraSupplementEduCite,
} from "@/lib/jeffery/grounded/viacura-supplement-edu";
import { PROTOCOL_NEXT_ORDER_FLAG } from "@/lib/caq/protocol-next-order";
import { PROTOCOL_ENTRY_SOURCES, PROTOCOL_ENTRY_STATUSES } from "@/lib/caq/protocol-next-order/types";
import type { LookupSnpEnginePayload, LookupSnpHubRow } from "@/lib/jeffery/grounded/lookup-snp-assemble";
import {
  GENEX360_ENGINE_STATUSES,
  GENEX360_GENE_SKU_PAIRS,
  GENEX360_MAP_STATUSES,
  GENEX360_NEXT_ORDER_FLAG,
  GENEX360_SKU_PANELS,
  GENEX360_SPOKEN_GENEXM,
  GENEX360_SPOKEN_HUB,
  NUTRIGEN_DX_SOFT_GENES,
  NUTRIGEN_DX_SOFT_RSIDS,
  attachGenex360NextOrder,
  citeForMappedSku,
  isGenex360NextOrderEnabled,
  isPresentGenotype,
  mapEnginePayloadToNextOrder,
} from "../index";

const MODULE_DIR = join(process.cwd(), "src/lib/caq/genex360-next-order");
const GROUNDED_DIR = join(process.cwd(), "src/lib/jeffery/grounded");

function moduleSources(): string[] {
  return readdirSync(MODULE_DIR)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".d.ts"))
    .map((name) => readFileSync(join(MODULE_DIR, name), "utf8"));
}

function row(partial: Partial<LookupSnpHubRow> & Pick<LookupSnpHubRow, "rsid">): LookupSnpHubRow {
  return {
    gene: null,
    genotype: null,
    panel_key: "methylation",
    stored_panel_key: "genex_m",
    status: null,
    clinical_significance: null,
    is_sample: false,
    chip: "genexm",
    ...partial,
  };
}

function okPayload(
  variants: LookupSnpHubRow[],
  extra: Partial<LookupSnpEnginePayload> = {}
): LookupSnpEnginePayload {
  return {
    loadStatus: "ok",
    variants,
    snpCountsUnknown: false,
    demoAccount: false,
    nutrigenAttempted: false,
    nutrigenFailed: false,
    ...extra,
  };
}

function assertNoInventedFacts(serialized: string): void {
  expect(serialized).not.toMatch(/\b\d+\s*(mg|mcg|iu)\b/i);
  expect(serialized).not.toMatch(/\b(milligram|monograph)\b/i);
  expect(serialized).not.toMatch(/coa/i);
  expect(serialized).not.toMatch(/10\s*[–-]\s*27\s*x/i);
  expect(serialized).not.toMatch(/\b(diagnose|prescribe|safe to take|dose coach|can't methylate|cannot methylate)\b/i);
}

const PROTOCOL_CTX = {
  userId: "user-1",
  role: "consumer" as const,
  requestId: "req-genex360",
  advisorContextVariables: {
    currentSupplements: "Thorne Mg Bisglycinate (1 capsule daily)",
  },
};

describe("GENEX360_NEXT_ORDER_ENABLED flag", () => {
  afterEach(() => {
    delete process.env[GENEX360_NEXT_ORDER_FLAG];
    delete process.env[PROTOCOL_NEXT_ORDER_FLAG];
    delete process.env[LLM_GROUNDED_CHAT_FLAG];
  });

  it("defaults OFF so get_protocol stays unchanged", () => {
    delete process.env[GENEX360_NEXT_ORDER_FLAG];
    expect(isGenex360NextOrderEnabled()).toBe(false);
    process.env[GENEX360_NEXT_ORDER_FLAG] = "false";
    expect(isGenex360NextOrderEnabled()).toBe(false);
    process.env[GENEX360_NEXT_ORDER_FLAG] = "banana";
    expect(isGenex360NextOrderEnabled()).toBe(false);

    const result = getProtocolFromContext({ user_id: "user-1" }, PROTOCOL_CTX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toHaveProperty("protocol_entries");
  });

  it("enables only for explicit truthy tokens", () => {
    process.env[GENEX360_NEXT_ORDER_FLAG] = "true";
    expect(isGenex360NextOrderEnabled()).toBe(true);
  });
});

describe("Elysium 1 — GeneX360 hub / GeneXM chip naming", () => {
  it("speaks GeneX360 for hub and GeneXM (no dash) for methylation SSOT", () => {
    expect(GENEX360_SPOKEN_HUB).toBe("GeneX360");
    expect(GENEX360_SPOKEN_GENEXM).toBe("GeneXM");
    expect(GENEX360_SPOKEN_GENEXM).not.toMatch(/-/);
    expect(GENEX360_SPOKEN_GENEXM).not.toBe("ViaCura");
    expect(GENEX360_SKU_PANELS).toEqual(["genex_m", "nutrigen_dx"]);

    const src = moduleSources().join("\n");
    expect(src).toMatch(/GeneX360/);
    expect(src).toMatch(/GeneXM/);
    expect(src).not.toMatch(/ViaCura360|GeneXM→ViaCura|rename GeneXM/);
    expect(src).not.toMatch(/GeneXM\s*=\s*nutrigen_dx|nutrigen_dx\s*=\s*genex_m/);
  });

  it("does not blur GeneXM MTHFR with nutrigen_dx", () => {
    const mthfrOnNutrigen = mapEnginePayloadToNextOrder(
      okPayload([
        row({
          rsid: "rs1801133",
          gene: "MTHFR",
          genotype: "CT",
          panel_key: "nutrition",
          stored_panel_key: "nutrigen_dx",
        }),
      ])
    );
    expect(mthfrOnNutrigen.suggestions).toEqual([]);
    expect(mthfrOnNutrigen.hits.some((hit) => hit.status === "wrong_panel")).toBe(true);
    expect(mthfrOnNutrigen.suggestions.some((row) => row.via_cura_sku === "MTHFR+")).toBe(false);

    const vdrOnGenexm = mapEnginePayloadToNextOrder(
      okPayload([
        row({
          rsid: "rs1544410",
          gene: "VDR",
          genotype: "AA",
          panel_key: "methylation",
          stored_panel_key: "genex_m",
        }),
      ])
    );
    expect(vdrOnGenexm.suggestions).toEqual([]);
    expect(vdrOnGenexm.hits.some((hit) => hit.status === "wrong_panel")).toBe(true);
  });
});

describe("Elysium 2 — panel split + concrete pairs", () => {
  it("live nutrigen_dx Soft map is FTO / VDR / ACTN3 only", () => {
    expect([...NUTRIGEN_DX_SOFT_GENES]).toEqual(["FTO", "VDR", "ACTN3"]);
    expect([...NUTRIGEN_DX_SOFT_RSIDS]).toEqual(["rs9939609", "rs1544410", "rs1815739"]);
    const nutrigenPairs = GENEX360_GENE_SKU_PAIRS.filter((pair) => pair.panel === "nutrigen_dx");
    expect(nutrigenPairs.map((pair) => pair.gene).sort()).toEqual(["ACTN3", "FTO", "VDR"]);
    expect(GENEX360_GENE_SKU_PAIRS.some((pair) => pair.gene === "MTHFR" && pair.panel === "nutrigen_dx")).toBe(
      false
    );
  });

  it("maps GeneXM MTHFR present genotype to MTHFR+ and VDR on nutrigen_dx to VDR+", () => {
    const mapped = mapEnginePayloadToNextOrder(
      okPayload([
        row({
          rsid: "rs1801133",
          gene: "MTHFR",
          genotype: "CT",
          panel_key: "methylation",
          stored_panel_key: "genex_m",
        }),
        row({
          rsid: "rs1544410",
          gene: "VDR",
          genotype: "AA",
          panel_key: "nutrition",
          stored_panel_key: "nutrigen_dx",
          chip: "nutrigendx",
        }),
      ])
    );
    expect(mapped.engine_status).toBe("ok");
    expect(mapped.suggestions.map((row) => row.via_cura_sku)).toEqual(["MTHFR+", "VDR+"]);
    expect(mapped.suggestions.every((row) => row.status === "suggested_viacura")).toBe(true);
    expect(mapped.suggestions.every((row) => row.source === "hannah_suggest")).toBe(true);
    expect(mapped.suggestions.every((row) => row.why_pillar_ids?.includes("snp_targeted_catalog"))).toBe(true);
    assertNoInventedFacts(JSON.stringify(mapped.suggestions));
  });

  it("does not invent MTR+ / extra Master genes without GeneXM data", () => {
    const noMtr = mapEnginePayloadToNextOrder(
      okPayload([
        row({
          rsid: "rs1801133",
          gene: "MTHFR",
          genotype: "TT",
          stored_panel_key: "genex_m",
        }),
      ])
    );
    expect(noMtr.suggestions.some((row) => row.via_cura_sku === "MTR+")).toBe(false);
    expect(noMtr.suggestions.some((row) => /COMT\+|CBS|MTRR\+|GST\+/.test(row.via_cura_sku ?? ""))).toBe(
      false
    );

    const mtrPresent = mapEnginePayloadToNextOrder(
      okPayload([
        row({
          rsid: "rs1805087",
          gene: "MTR",
          genotype: "AG",
          panel_key: "methylation",
          stored_panel_key: "genex_m",
        }),
      ])
    );
    expect(mtrPresent.suggestions).toHaveLength(1);
    expect(mtrPresent.suggestions[0]?.via_cura_sku).toBe("MTR+");
    expect(mtrPresent.suggestions[0]?.cite).toEqual({
      cite_id: "genex360-map:mtr+",
      label: "MTR+",
    });
    expect(mtrPresent.suggestions[0]?.cite?.cite_id).not.toMatch(/edu-viacura/);
  });

  it("FTO and ACTN3 stay live nutrigen_dx without inventing a SKU", () => {
    const mapped = mapEnginePayloadToNextOrder(
      okPayload([
        row({
          rsid: "rs9939609",
          gene: "FTO",
          genotype: "AA",
          panel_key: "nutrition",
          stored_panel_key: "nutrigen_dx",
        }),
        row({
          rsid: "rs1815739",
          gene: "ACTN3",
          genotype: "CC",
          panel_key: "nutrition",
          stored_panel_key: "nutrigen_dx",
        }),
      ])
    );
    expect(mapped.suggestions).toEqual([]);
    expect(mapped.hits.every((hit) => hit.status === "unavailable")).toBe(true);
    expect(JSON.stringify(mapped)).not.toMatch(/FOCUS\+|SHRED\+|CREATINE|BLAST\+/);
  });

  it("HormoneIQ DUTCH and EpigenHQ clocks are not SNPs", () => {
    const mapped = mapEnginePayloadToNextOrder(
      okPayload([
        row({
          rsid: "dutch-cortisol",
          gene: "CORTISOL",
          genotype: "high",
          panel_key: "hormone",
          stored_panel_key: "hormone_iq",
        }),
        row({
          rsid: "clock-horvath",
          gene: "HORVATH",
          genotype: "present",
          panel_key: "epigenetic",
          stored_panel_key: "epigen_hq",
        }),
      ])
    );
    expect(mapped.suggestions).toEqual([]);
    expect(mapped.hits.every((hit) => hit.status === "not_snp")).toBe(true);
  });
});

describe("Elysium 3 — null / UNKNOWN / pending never drive a SKU", () => {
  it("empty genotypes and CYP2C9 UNKNOWN/pending never rewrite to 0 or a SKU", () => {
    expect(isPresentGenotype(null)).toBe(false);
    expect(isPresentGenotype("UNKNOWN")).toBe(false);
    expect(isPresentGenotype("pending")).toBe(false);
    expect(isPresentGenotype("CT", "pending")).toBe(false);
    expect(isPresentGenotype("CT")).toBe(true);

    const mapped = mapEnginePayloadToNextOrder(
      okPayload([
        row({
          rsid: "rs1801133",
          gene: "MTHFR",
          genotype: null,
          stored_panel_key: "genex_m",
        }),
        row({
          rsid: "rs1801131",
          gene: "MTHFR",
          genotype: "UNKNOWN",
          stored_panel_key: "genex_m",
        }),
        row({
          rsid: "rs1799853",
          gene: "CYP2C9",
          genotype: "UNKNOWN",
          status: "pending",
          stored_panel_key: "genex_m",
        }),
        row({
          rsid: "rs1544410",
          gene: "VDR",
          genotype: "pending",
          panel_key: "nutrition",
          stored_panel_key: "nutrigen_dx",
        }),
      ])
    );
    expect(mapped.suggestions).toEqual([]);
    expect(mapped.hits.find((hit) => hit.gene === "CYP2C9")?.genotype).toBe("UNKNOWN");
    expect(mapped.hits.find((hit) => hit.gene === "CYP2C9")?.genotype).not.toBe("0");
    expect(JSON.stringify(mapped.suggestions)).not.toMatch(/\b0\b/);
    expect(mapped.hits.filter((hit) => hit.gene === "MTHFR").every((hit) => hit.status === "empty")).toBe(
      true
    );
  });
});

describe("Elysium 4 — only genotypes actually present; engines unread refuse", () => {
  it("engines unread / unauthorized / error return empty suggestions", () => {
    expect(mapEnginePayloadToNextOrder(undefined).engine_status).toBe("engines_unread");
    expect(mapEnginePayloadToNextOrder(undefined).suggestions).toEqual([]);
    expect(mapEnginePayloadToNextOrder({ loadStatus: "unauthorized", variants: [] }).suggestions).toEqual(
      []
    );
    expect(mapEnginePayloadToNextOrder({ loadStatus: "error", variants: [] }).suggestions).toEqual([]);
    expect(
      mapEnginePayloadToNextOrder(okPayload([], { snpCountsUnknown: true })).engine_status
    ).toBe("engines_unread");
  });

  it("does not invent alleles or fake SKUs when the member has no mapped genotype", () => {
    const mapped = mapEnginePayloadToNextOrder(okPayload([]));
    expect(mapped.engine_status).toBe("ok");
    expect(mapped.suggestions).toEqual([]);
    expect(JSON.stringify(mapped)).not.toMatch(/\b(TT|CT|AA|AG)\b/);
  });
});

describe("Elysium 5 — never Demo Client 4634 / demo@", () => {
  it("drops is_sample / demo chip rows and demoAccount payloads", () => {
    const sample = mapEnginePayloadToNextOrder(
      okPayload([
        row({
          rsid: "rs1801133",
          gene: "MTHFR",
          genotype: "TT",
          is_sample: true,
          chip: "demo",
        }),
      ])
    );
    expect(sample.suggestions).toEqual([]);

    const demoAccount = mapEnginePayloadToNextOrder(
      okPayload(
        [
          row({
            rsid: "rs1801133",
            gene: "MTHFR",
            genotype: "CT",
          }),
        ],
        { demoAccount: true }
      )
    );
    expect(demoAccount.engine_status).toBe("demo_refused");
    expect(demoAccount.suggestions).toEqual([]);

    const src = moduleSources().join("\n");
    expect(src).toMatch(/4634|demo@|is_sample/);
    expect(src).not.toMatch(/demo@genemetrics\.com.*CT|4634.*TT/);
  });
});

describe("Lex enums + edu-viacura allowlist + no new consumer sentences", () => {
  it("reuses #238 status/source enums and allowlisted MTHFR+ cite only", () => {
    expect(GENEX360_MAP_STATUSES).toEqual([
      "mapped",
      "empty",
      "unavailable",
      "engines_unread",
      "demo_refused",
      "wrong_panel",
      "not_snp",
    ]);
    expect(GENEX360_ENGINE_STATUSES).toEqual(["ok", "engines_unread", "demo_refused"]);
    expect(PROTOCOL_ENTRY_STATUSES).toEqual(["current", "suggested_viacura", "on_next_order"]);
    expect(PROTOCOL_ENTRY_SOURCES).toEqual(["caq", "photo", "manual", "hannah_suggest"]);

    const mthfrCite = citeForMappedSku("MTHFR+");
    expect(mthfrCite).toEqual({
      cite_id: "edu-viacura:mthfr-plus",
      label: "ViaCura MTHFR+",
    });
    expect(isEducationShapedViacuraSupplementEduCite(mthfrCite)).toBe(true);
    expect(citeForMappedSku("VDR+")).toEqual({
      cite_id: "genex360-map:vdr+",
      label: "VDR+",
    });
    expect(citeForMappedSku("MTR+").cite_id).not.toMatch(/edu-viacura/);
    expect([...STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST]).not.toContain("edu-viacura:mtr-plus");
    expect([...STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST]).not.toContain("edu-viacura:vdr-plus");
  });

  it("module source has no diagnose / can't-methylate / new member sentences", () => {
    const src = moduleSources().join("\n");
    expect(src).not.toMatch(/you can't methylate|cannot methylate|you should take|safe to take/i);
    expect(src).not.toMatch(/formavision|\bglb\b|medisearch/i);
    expect(src).not.toMatch(/\b\d+\s*mg\b/i);
    expect(src).not.toMatch(/GENEX360_NEXT_ORDER_ENABLED.*=.*true/);
  });
});

describe("get_protocol additive attach", () => {
  afterEach(() => {
    delete process.env[GENEX360_NEXT_ORDER_FLAG];
    delete process.env[PROTOCOL_NEXT_ORDER_FLAG];
    delete process.env[LLM_GROUNDED_CHAT_FLAG];
  });

  it("flag on attaches GeneXM MTHFR+ without deleting current rows", () => {
    process.env[GENEX360_NEXT_ORDER_FLAG] = "true";
    const result = getProtocolFromContext(
      { user_id: "user-1" },
      {
        ...PROTOCOL_CTX,
        genex360EnginePayload: okPayload([
          row({
            rsid: "rs1801133",
            gene: "MTHFR",
            genotype: "CT",
            stored_panel_key: "genex_m",
          }),
        ]),
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entries = result.data.protocol_entries ?? [];
    expect(entries.some((row) => row.status === "current" && /bisglycinate/i.test(row.product_name))).toBe(
      true
    );
    expect(entries.some((row) => row.status === "suggested_viacura" && row.via_cura_sku === "MTHFR+")).toBe(
      true
    );
    expect(result.data.items[0]?.productName).toMatch(/Thorne/i);
    assertNoInventedFacts(JSON.stringify(entries));
    expect(JSON.stringify(entries)).not.toMatch(/1 capsule daily/);
  });

  it("is additive with CAQ suggestions and does not self-suggest an on-stack SKU", () => {
    process.env[GENEX360_NEXT_ORDER_FLAG] = "true";
    process.env[PROTOCOL_NEXT_ORDER_FLAG] = "true";
    const result = getProtocolFromContext(
      { user_id: "user-1" },
      {
        userId: "user-1",
        role: "consumer",
        requestId: "req-both",
        advisorContextVariables: {
          currentSupplements: "Thorne Mg Bisglycinate (1 capsule daily); ViaCura MTHFR+",
        },
        genex360EnginePayload: okPayload([
          row({
            rsid: "rs1801133",
            gene: "MTHFR",
            genotype: "TT",
            stored_panel_key: "genex_m",
          }),
        ]),
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entries = result.data.protocol_entries ?? [];
    expect(entries.filter((row) => row.status === "current").length).toBeGreaterThanOrEqual(2);
    expect(entries.some((row) => row.via_cura_sku === "Magnesium Synergy Matrix")).toBe(true);
    expect(entries.filter((row) => row.via_cura_sku === "MTHFR+" && row.status === "suggested_viacura")).toEqual(
      []
    );
  });

  it("engines unread attach no SNP SKU", () => {
    process.env[GENEX360_NEXT_ORDER_FLAG] = "true";
    const unread = getProtocolFromContext({ user_id: "user-1" }, PROTOCOL_CTX);
    expect(unread.ok).toBe(true);
    if (!unread.ok) return;
    const entries = unread.data.protocol_entries ?? [];
    expect(entries.some((row) => row.status === "suggested_viacura")).toBe(false);
    expect(entries.every((row) => row.status === "current")).toBe(true);
  });

  it("route assembles via lookup_snp SSOT when flag on and payload omitted", async () => {
    process.env[GENEX360_NEXT_ORDER_FLAG] = "true";
    const result = await routeGroundedTool("get_protocol", {
      ...PROTOCOL_CTX,
      lookupSnpAssemble: async () =>
        okPayload([
          row({
            rsid: "rs1801133",
            gene: "MTHFR",
            genotype: "CT",
            stored_panel_key: "genex_m",
          }),
        ]),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { protocol_entries?: Array<{ via_cura_sku?: string }> };
    expect(data.protocol_entries?.some((row) => row.via_cura_sku === "MTHFR+")).toBe(true);
  });

  it("attach never deletes current rows when merging genetics suggestions", () => {
    const currents = [
      {
        brand: "Thorne",
        product_name: "NAC",
        status: "current" as const,
        source: "caq" as const,
      },
    ];
    const merged = attachGenex360NextOrder(
      currents,
      okPayload([
        row({
          rsid: "rs1801133",
          gene: "MTHFR",
          genotype: "CT",
          stored_panel_key: "genex_m",
        }),
      ])
    );
    expect(merged[0]).toEqual(currents[0]);
    expect(merged.some((row) => row.status === "suggested_viacura" && row.via_cura_sku === "MTHFR+")).toBe(
      true
    );
  });
});

describe("diff audit — Soft locks", () => {
  it("docs one-liner and flag stay OFF", () => {
    const flagSrc = readFileSync(join(MODULE_DIR, "flag.ts"), "utf8");
    expect(flagSrc).not.toMatch(/GENEX360_NEXT_ORDER_ENABLED.*=.*true/);

    const routerSrc = readFileSync(join(GROUNDED_DIR, "tool-router.ts"), "utf8");
    expect(routerSrc).toContain("isGenex360NextOrderEnabled");
    expect(routerSrc).toContain("const ALLOW_GENERATE = false");
    expect(routerSrc).not.toMatch(/GENEX360_NEXT_ORDER_ENABLED.*=.*true/);

    const stageA = readFileSync(join(process.cwd(), "../docs/viaconnect-llm/STAGE-A.md"), "utf8");
    const contracts = readFileSync(
      join(process.cwd(), "../docs/viaconnect-llm/TOOL-CONTRACTS.md"),
      "utf8"
    );
    expect(stageA).toMatch(/GeneX360 Soft = engines SSOT \+ catalog map/);
    expect(stageA).toMatch(/GeneXM naming/);
    expect(stageA).toMatch(/GENEX360_NEXT_ORDER_ENABLED` default false/);
    expect(contracts).toMatch(/GeneX360 Soft = engines SSOT \+ catalog map/);
    expect(contracts).toMatch(/GeneXM naming/);
    expect(contracts).toMatch(/GENEX360_NEXT_ORDER_ENABLED` default \*\*false\*\*/);
  });
});
