import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getProtocolFromContext, routeGroundedTool } from "@/lib/jeffery/grounded/tool-router";
import { LLM_GROUNDED_CHAT_FLAG } from "@/lib/jeffery/grounded/flag";
import { STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST } from "@/lib/jeffery/grounded/viacura-supplement-edu";
import { PROTOCOL_NEXT_ORDER_FLAG } from "@/lib/caq/protocol-next-order";
import { PROTOCOL_ENTRY_SOURCES, PROTOCOL_ENTRY_STATUSES } from "@/lib/caq/protocol-next-order/types";
import { GENEX360_NEXT_ORDER_FLAG } from "@/lib/caq/genex360-next-order";
import {
  LABS_ENGINE_STATUSES,
  LABS_MAP_STATUSES,
  LABS_NEXT_ORDER_FLAG,
  LABS_SKU_PAIRS,
  LABS_SSOT_READ,
  LABS_SSOT_ROUTE,
  assembleLabsNextOrder,
  attachLabsNextOrder,
  citeForMappedSku,
  findLabSkuPair,
  isBannedDemoLabRow,
  isLabsNextOrderEnabled,
  mapEnginePayloadToNextOrder,
  type LabsEnginePayload,
  type LabsMemberRow,
} from "../index";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/labs/loadLabResults", () => ({
  loadLabResults: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { loadLabResults } from "@/lib/labs/loadLabResults";

const MODULE_DIR = join(process.cwd(), "src/lib/caq/labs-next-order");
const GROUNDED_DIR = join(process.cwd(), "src/lib/jeffery/grounded");

function moduleSources(): string[] {
  return readdirSync(MODULE_DIR)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".d.ts"))
    .map((name) => readFileSync(join(MODULE_DIR, name), "utf8"));
}

function row(partial: Partial<LabsMemberRow> & Pick<LabsMemberRow, "biomarker_key">): LabsMemberRow {
  return {
    is_sample: false,
    source_type: "csv",
    lab_name: "quest",
    ...partial,
  };
}

function okPayload(
  biomarkers: LabsMemberRow[],
  extra: Partial<LabsEnginePayload> = {}
): LabsEnginePayload {
  return {
    loadStatus: "ok",
    biomarkers,
    demoAccount: false,
    ...extra,
  };
}

function assertNoInventedFacts(serialized: string): void {
  expect(serialized).not.toMatch(/\b\d+\s*(mg|mcg|iu|ng\/ml|pg\/ml)\b/i);
  expect(serialized).not.toMatch(/\b(milligram|monograph)\b/i);
  expect(serialized).not.toMatch(/coa/i);
  expect(serialized).not.toMatch(/10\s*[–-]\s*27\s*x/i);
  expect(serialized).not.toMatch(
    /\b(diagnose|prescribe|safe to take|dose coach|treat this lab|treat-this-lab)\b/i
  );
}

const PROTOCOL_CTX = {
  userId: "user-1",
  role: "consumer" as const,
  requestId: "req-labs",
  advisorContextVariables: {
    currentSupplements: "Thorne Mg Bisglycinate (1 capsule daily)",
  },
};

describe("LABS_NEXT_ORDER_ENABLED flag", () => {
  afterEach(() => {
    delete process.env[LABS_NEXT_ORDER_FLAG];
    delete process.env[PROTOCOL_NEXT_ORDER_FLAG];
    delete process.env[GENEX360_NEXT_ORDER_FLAG];
    delete process.env[LLM_GROUNDED_CHAT_FLAG];
  });

  it("defaults OFF so get_protocol stays unchanged", () => {
    delete process.env[LABS_NEXT_ORDER_FLAG];
    expect(isLabsNextOrderEnabled()).toBe(false);
    process.env[LABS_NEXT_ORDER_FLAG] = "false";
    expect(isLabsNextOrderEnabled()).toBe(false);
    process.env[LABS_NEXT_ORDER_FLAG] = "banana";
    expect(isLabsNextOrderEnabled()).toBe(false);

    const result = getProtocolFromContext({ user_id: "user-1" }, PROTOCOL_CTX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toHaveProperty("protocol_entries");
  });

  it("enables only for explicit truthy tokens", () => {
    process.env[LABS_NEXT_ORDER_FLAG] = "true";
    expect(isLabsNextOrderEnabled()).toBe(true);
  });
});

describe("honesty Soft path — zero on-file lab→SKU pairs", () => {
  it("pair table is empty and does not invent Master SKUs", () => {
    expect(LABS_SKU_PAIRS).toEqual([]);
    expect(findLabSkuPair("vitamin_d")).toBeNull();
    expect(findLabSkuPair("ferritin")).toBeNull();
    expect(findLabSkuPair("magnesium")).toBeNull();
    expect(findLabSkuPair("homocysteine")).toBeNull();

    const src = moduleSources().join("\n");
    expect(src).toMatch(/ZERO pairs|zero concrete/i);
    expect(src).not.toMatch(/vitamin_d\s*:\s*["']NAD\+/);
    expect(src).not.toMatch(/ferritin\s*:\s*["']/);
    expect(JSON.stringify(LABS_SKU_PAIRS)).not.toMatch(/NAD\+|MTHFR\+|FOCUS\+|SHRED\+|BLAST\+|RISE\+/);
  });

  it("SSOT is loadLabResults / lab_biomarkers — no invent tables", () => {
    expect(LABS_SSOT_READ).toBe("loadLabResults / lab_biomarkers");
    expect(LABS_SSOT_ROUTE).toBe("GET /api/labs/results");
    const src = moduleSources().join("\n");
    expect(src).toMatch(/loadLabResults/);
    expect(src).toMatch(/lab_biomarkers/);
    expect(src).not.toMatch(/CREATE TABLE/);
    expect(src).not.toMatch(/apply_migration/);
  });

  it("labs on file with no pair → unavailable and no SKU", () => {
    const mapped = mapEnginePayloadToNextOrder(
      okPayload([row({ biomarker_key: "vitamin_d" }), row({ biomarker_key: "ferritin" })])
    );
    expect(mapped.engine_status).toBe("ok");
    expect(mapped.suggestions).toEqual([]);
    expect(mapped.hits).toEqual([
      { biomarker_key: "vitamin_d", status: "unavailable" },
      { biomarker_key: "ferritin", status: "unavailable" },
    ]);
    expect(JSON.stringify(mapped)).not.toMatch(/NAD\+|MTHFR\+|FOCUS\+|SHRED\+|Magnesium Synergy/);
    assertNoInventedFacts(JSON.stringify(mapped));
  });

  it("missing labs → no fake SKUs", () => {
    const mapped = mapEnginePayloadToNextOrder(okPayload([]));
    expect(mapped.engine_status).toBe("ok");
    expect(mapped.suggestions).toEqual([]);
    expect(mapped.hits).toEqual([]);
    expect(JSON.stringify(mapped)).not.toMatch(/via_cura_sku/);
  });

  it("empty biomarker key → empty status, no SKU", () => {
    const mapped = mapEnginePayloadToNextOrder(okPayload([row({ biomarker_key: "" })]));
    expect(mapped.suggestions).toEqual([]);
    expect(mapped.hits.some((hit) => hit.status === "empty")).toBe(true);
  });
});

describe("unread engines refuse", () => {
  it("undefined / unauthorized / error / labsUnread return empty suggestions", () => {
    expect(mapEnginePayloadToNextOrder(undefined).engine_status).toBe("engines_unread");
    expect(mapEnginePayloadToNextOrder(undefined).suggestions).toEqual([]);
    expect(mapEnginePayloadToNextOrder({ loadStatus: "unauthorized", biomarkers: [] }).suggestions).toEqual(
      []
    );
    expect(mapEnginePayloadToNextOrder({ loadStatus: "error", biomarkers: [] }).suggestions).toEqual([]);
    expect(
      mapEnginePayloadToNextOrder(okPayload([row({ biomarker_key: "vitamin_d" })], { labsUnread: true }))
        .engine_status
    ).toBe("engines_unread");
  });
});

describe("demo / is_sample never map", () => {
  it("drops is_sample / demo source rows and demoAccount payloads", () => {
    expect(isBannedDemoLabRow({ is_sample: true })).toBe(true);
    expect(isBannedDemoLabRow({ is_sample: false, source_type: "sample" })).toBe(true);
    expect(isBannedDemoLabRow({ is_sample: false, lab_name: "Demo Client 4634" })).toBe(true);
    expect(isBannedDemoLabRow({ is_sample: false, source_type: "csv", lab_name: "quest" })).toBe(false);

    const sample = mapEnginePayloadToNextOrder(
      okPayload([row({ biomarker_key: "vitamin_d", is_sample: true, lab_name: "demo" })])
    );
    expect(sample.suggestions).toEqual([]);
    expect(sample.hits).toEqual([]);

    const demoAccount = mapEnginePayloadToNextOrder(
      okPayload([row({ biomarker_key: "vitamin_d" })], { demoAccount: true })
    );
    expect(demoAccount.engine_status).toBe("demo_refused");
    expect(demoAccount.suggestions).toEqual([]);

    const src = moduleSources().join("\n");
    expect(src).toMatch(/4634|demo@|is_sample/);
    expect(src).not.toMatch(/demo@genemetrics\.com.*CT|4634.*TT/);
  });
});

describe("Lex enums + edu-viacura allowlist + no new consumer sentences", () => {
  it("reuses #238 status/source enums and does not grow edu-viacura", () => {
    expect(LABS_MAP_STATUSES).toEqual([
      "mapped",
      "empty",
      "unavailable",
      "engines_unread",
      "demo_refused",
    ]);
    expect(LABS_ENGINE_STATUSES).toEqual(["ok", "engines_unread", "demo_refused"]);
    expect(PROTOCOL_ENTRY_STATUSES).toEqual(["current", "suggested_viacura", "on_next_order"]);
    expect(PROTOCOL_ENTRY_SOURCES).toEqual(["caq", "photo", "manual", "hannah_suggest"]);

    expect(citeForMappedSku("NAD+")).toEqual({
      cite_id: "edu-viacura:nad-plus",
      label: "ViaCura Replenish NAD+",
    });
    expect(citeForMappedSku("UnknownSku").cite_id).toBe("labs-map:unknownsku");
    expect(citeForMappedSku("UnknownSku").cite_id).not.toMatch(/edu-viacura/);
    expect([...STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST]).toEqual([
      "edu-viacura:nad-plus",
      "edu-viacura:mthfr-plus",
      "edu-viacura:catalog-index",
      "edu-viacura:rise-plus",
      "edu-viacura:relax-plus",
    ]);
  });

  it("module source has no diagnose / treat-this-lab / new member sentences", () => {
    const src = moduleSources().join("\n");
    expect(src).not.toMatch(/you should take|safe to take|treat this lab|treat-this-lab/i);
    expect(src).not.toMatch(/your vitamin d is low|labs unavailable for next-order/i);
    expect(src).not.toMatch(/formavision|\bglb\b|medisearch/i);
    expect(src).not.toMatch(/\b\d+\s*mg\b/i);
    expect(src).not.toMatch(/LABS_NEXT_ORDER_ENABLED.*=.*true/);
  });
});

describe("get_protocol additive attach", () => {
  afterEach(() => {
    delete process.env[LABS_NEXT_ORDER_FLAG];
    delete process.env[PROTOCOL_NEXT_ORDER_FLAG];
    delete process.env[GENEX360_NEXT_ORDER_FLAG];
    delete process.env[LLM_GROUNDED_CHAT_FLAG];
  });

  it("flag on keeps current rows and attaches no invented lab SKU", () => {
    process.env[LABS_NEXT_ORDER_FLAG] = "true";
    const result = getProtocolFromContext(
      { user_id: "user-1" },
      {
        ...PROTOCOL_CTX,
        labsEnginePayload: okPayload([row({ biomarker_key: "vitamin_d" })]),
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entries = result.data.protocol_entries ?? [];
    expect(entries.some((item) => item.status === "current" && /bisglycinate/i.test(item.product_name))).toBe(
      true
    );
    expect(entries.some((item) => item.status === "suggested_viacura")).toBe(false);
    expect(result.data.items[0]?.productName).toMatch(/Thorne/i);
    assertNoInventedFacts(JSON.stringify(entries));
    expect(JSON.stringify(entries)).not.toMatch(/1 capsule daily/);
    expect(JSON.stringify(entries)).not.toMatch(/32|ng\/mL|vitamin_d/);
  });

  it("is additive with CAQ suggestions and never deletes current", () => {
    process.env[LABS_NEXT_ORDER_FLAG] = "true";
    process.env[PROTOCOL_NEXT_ORDER_FLAG] = "true";
    const result = getProtocolFromContext(
      { user_id: "user-1" },
      {
        ...PROTOCOL_CTX,
        labsEnginePayload: okPayload([row({ biomarker_key: "magnesium" })]),
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entries = result.data.protocol_entries ?? [];
    expect(entries.some((item) => item.status === "current")).toBe(true);
    expect(entries.some((item) => item.via_cura_sku === "Magnesium Synergy Matrix")).toBe(true);
    expect(entries.filter((item) => item.source === "hannah_suggest" && item.cite?.cite_id?.startsWith("labs-map:"))).toEqual(
      []
    );
  });

  it("engines unread attach no lab SKU", () => {
    process.env[LABS_NEXT_ORDER_FLAG] = "true";
    const unread = getProtocolFromContext({ user_id: "user-1" }, PROTOCOL_CTX);
    expect(unread.ok).toBe(true);
    if (!unread.ok) return;
    const entries = unread.data.protocol_entries ?? [];
    expect(entries.some((item) => item.status === "suggested_viacura")).toBe(false);
    expect(entries.every((item) => item.status === "current")).toBe(true);
  });

  it("route assembles via labs SSOT when flag on and payload omitted", async () => {
    process.env[LABS_NEXT_ORDER_FLAG] = "true";
    const result = await routeGroundedTool("get_protocol", {
      ...PROTOCOL_CTX,
      labsAssemble: async () => okPayload([row({ biomarker_key: "vitamin_d" })]),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { protocol_entries?: Array<{ status?: string; via_cura_sku?: string }> };
    expect(data.protocol_entries?.some((item) => item.status === "current")).toBe(true);
    expect(data.protocol_entries?.some((item) => item.via_cura_sku === "NAD+")).toBe(false);
  });

  it("attach never deletes current rows when merging labs suggestions", () => {
    const currents = [
      {
        brand: "Thorne",
        product_name: "NAC",
        status: "current" as const,
        source: "caq" as const,
      },
    ];
    const merged = attachLabsNextOrder(
      currents,
      okPayload([row({ biomarker_key: "vitamin_d" })])
    );
    expect(merged[0]).toEqual(currents[0]);
    expect(merged.some((item) => item.status === "suggested_viacura")).toBe(false);
  });
});

describe("assemble — SSOT read strips raw values", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps confirmed names to keys and never returns values / units", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-1", email: "member@example.com" } },
        }),
      },
    });
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        name: "Vitamin D, 25-OH",
        value: 32,
        unit: "ng/mL",
        panelGroup: "Vitamins and minerals",
        standard: { low: 30, high: 100 },
        geneticOptimal: null,
        gene: null,
        status: "optimal",
        tier: "optimal",
        direction: "in_range",
        confidence: null,
        collectionDate: "2026-09-01",
        trend: null,
      },
    ]);

    const payload = await assembleLabsNextOrder({ userId: "user-1" });
    expect(payload.loadStatus).toBe("ok");
    expect(payload.demoAccount).toBe(false);
    expect(payload.biomarkers).toEqual([{ biomarker_key: "vitamin_d", is_sample: false }]);
    expect(JSON.stringify(payload)).not.toMatch(/32|ng\/mL|25-OH/);
    assertNoInventedFacts(JSON.stringify(payload));
  });

  it("unread / demo / failed reads stay empty", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    expect(await assembleLabsNextOrder({ userId: "user-1" })).toMatchObject({
      loadStatus: "unauthorized",
      biomarkers: [],
    });

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-1", email: "demo@example.com" } },
        }),
      },
    });
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: "Ferritin", value: 12, unit: "ng/mL" },
    ]);
    const demo = await assembleLabsNextOrder({ userId: "user-1" });
    expect(demo.demoAccount).toBe(true);
    expect(JSON.stringify(demo)).not.toMatch(/\b12\b|ng\/mL/);

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-1", email: "member@example.com" } },
        }),
      },
    });
    (loadLabResults as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("labs down"));
    const failed = await assembleLabsNextOrder({ userId: "user-1" });
    expect(failed.loadStatus).toBe("error");
    expect(failed.biomarkers).toEqual([]);
  });
});

describe("diff audit — Soft locks", () => {
  it("docs one-liner and flag stay OFF", () => {
    const flagSrc = readFileSync(join(MODULE_DIR, "flag.ts"), "utf8");
    expect(flagSrc).not.toMatch(/LABS_NEXT_ORDER_ENABLED.*=.*true/);

    const routerSrc = readFileSync(join(GROUNDED_DIR, "tool-router.ts"), "utf8");
    expect(routerSrc).toContain("isLabsNextOrderEnabled");
    expect(routerSrc).toContain("const ALLOW_GENERATE = false");
    expect(routerSrc).not.toMatch(/LABS_NEXT_ORDER_ENABLED.*=.*true/);
    expect(routerSrc).not.toMatch(/LLM_GROUNDED_CHAT_ENABLED.*=.*true/);
    expect(routerSrc).not.toMatch(/PROTOCOL_NEXT_ORDER_ENABLED.*=.*true/);
    expect(routerSrc).not.toMatch(/GENEX360_NEXT_ORDER_ENABLED.*=.*true/);

    const stageA = readFileSync(join(process.cwd(), "../docs/viaconnect-llm/STAGE-A.md"), "utf8");
    const contracts = readFileSync(
      join(process.cwd(), "../docs/viaconnect-llm/TOOL-CONTRACTS.md"),
      "utf8"
    );
    expect(stageA).toMatch(/Labs Soft = engines\/labs SSOT \+ on-file map only/);
    expect(stageA).toMatch(/honesty empty if zero pairs/);
    expect(stageA).toMatch(/not treat-this-lab/);
    expect(stageA).toMatch(/LABS_NEXT_ORDER_ENABLED` default false/);
    expect(contracts).toMatch(/Labs Soft = engines\/labs SSOT \+ on-file map only/);
    expect(contracts).toMatch(/honesty empty if zero pairs/);
    expect(contracts).toMatch(/LABS_NEXT_ORDER_ENABLED` default \*\*false\*\*/);

    const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    const envLocal = readFileSync(join(process.cwd(), ".env.local.example"), "utf8");
    expect(envExample).toMatch(/LABS_NEXT_ORDER_ENABLED=false/);
    expect(envLocal).toMatch(/LABS_NEXT_ORDER_ENABLED=false/);
    expect(envExample).toMatch(/LLM_GROUNDED_CHAT_ENABLED=false/);
    expect(envExample).toMatch(/PROTOCOL_NEXT_ORDER_ENABLED=false/);
    expect(envExample).toMatch(/GENEX360_NEXT_ORDER_ENABLED=false/);
    expect(envExample).not.toMatch(/LABS_NEXT_ORDER_ENABLED=true/);
  });
});
