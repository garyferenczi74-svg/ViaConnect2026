import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { resolveGroundedChatTurn } from "@/lib/jeffery/grounded/chat-stub";
import { LLM_GROUNDED_CHAT_FLAG } from "@/lib/jeffery/grounded/flag";
import { getProtocolFromContext } from "@/lib/jeffery/grounded/tool-router";
import {
  STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST,
  STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS,
  isEducationShapedViacuraSupplementEduCite,
} from "@/lib/jeffery/grounded/viacura-supplement-edu";
import {
  PROTOCOL_NEXT_ORDER_FLAG,
  attachProtocolNextOrder,
  isProtocolNextOrderEnabled,
  matchCaqReplacement,
  suggestProtocolNextOrder,
} from "../index";
import { WHY_VIACURA_PILLAR_LABELS } from "../why-viacura";
import { WHY_VIACURA_PILLAR_IDS } from "../types";

const MODULE_DIR = join(process.cwd(), "src/lib/caq/protocol-next-order");
const GROUNDED_DIR = join(process.cwd(), "src/lib/jeffery/grounded");

function moduleSources(): string[] {
  return readdirSync(MODULE_DIR)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".d.ts"))
    .map((name) => readFileSync(join(MODULE_DIR, name), "utf8"));
}

function assertNoInventedFacts(serialized: string): void {
  expect(serialized).not.toMatch(/\b\d+\s*(mg|mcg|iu)\b/i);
  expect(serialized).not.toMatch(/\b(milligram|monograph|genotype)\b/i);
  expect(serialized).not.toMatch(/coa/i);
  expect(serialized).not.toMatch(/10\s*[–-]\s*27\s*x/i);
  expect(serialized).not.toMatch(/\b(28x|185-fold|90%\s*vs\s*20%)\b/i);
  expect(serialized).not.toMatch(/\b(diagnose|prescribe|safe to take|dose coach)/i);
}

describe("PROTOCOL_NEXT_ORDER_ENABLED flag", () => {
  afterEach(() => {
    delete process.env[PROTOCOL_NEXT_ORDER_FLAG];
    delete process.env[LLM_GROUNDED_CHAT_FLAG];
  });

  it("defaults OFF so get_protocol stays unchanged", () => {
    delete process.env[PROTOCOL_NEXT_ORDER_FLAG];
    expect(isProtocolNextOrderEnabled()).toBe(false);
    process.env[PROTOCOL_NEXT_ORDER_FLAG] = "false";
    expect(isProtocolNextOrderEnabled()).toBe(false);
    process.env[PROTOCOL_NEXT_ORDER_FLAG] = "banana";
    expect(isProtocolNextOrderEnabled()).toBe(false);
    expect(attachProtocolNextOrder([{ product_name: "Thorne NAC" }], false)).toBeUndefined();
  });

  it("enables only for explicit truthy tokens", () => {
    process.env[PROTOCOL_NEXT_ORDER_FLAG] = "true";
    expect(isProtocolNextOrderEnabled()).toBe(true);
  });
});

describe("CAQ map honesty", () => {
  it("exact Thorne pair suggests ViaCura and keeps competitor current", () => {
    const entries = suggestProtocolNextOrder([
      { brand: "Thorne", product_name: "Mg Bisglycinate", source: "caq" },
    ]);
    const current = entries.filter((row) => row.status === "current");
    const suggested = entries.filter((row) => row.status === "suggested_viacura");
    expect(current).toHaveLength(1);
    expect(current[0]?.brand).toBe("Thorne");
    expect(current[0]?.product_name).toBe("Mg Bisglycinate");
    expect(current[0]?.via_cura_sku).toBeUndefined();
    expect(suggested).toHaveLength(1);
    expect(suggested[0]?.via_cura_sku).toBe("Magnesium Synergy Matrix");
    expect(suggested[0]?.brand).toBe("ViaCura");
    expect(suggested[0]?.source).toBe("hannah_suggest");
    expect(suggested[0]?.why_pillar_ids).toContain("thorne_displacement_pairs");
    expect(JSON.stringify(entries)).not.toMatch(/\bthorne\b.*\b\d+\s*mg/i);
    assertNoInventedFacts(JSON.stringify(suggested));
  });

  it("does not delete current when suggesting ViaCura", () => {
    const currents = [
      { brand: "Thorne", product_name: "NAC", source: "photo" as const },
      { brand: "Thorne", product_name: "Ashwagandha", source: "manual" as const },
    ];
    const entries = suggestProtocolNextOrder(currents);
    expect(entries.filter((row) => row.status === "current")).toHaveLength(2);
    expect(entries.some((row) => row.product_name === "NAC" && row.status === "current")).toBe(true);
    expect(entries.some((row) => row.product_name === "Ashwagandha" && row.status === "current")).toBe(
      true
    );
    expect(entries.some((row) => row.via_cura_sku === "Clean+" && row.status === "suggested_viacura")).toBe(
      true
    );
    expect(entries.some((row) => row.via_cura_sku === "RISE+" && row.status === "suggested_viacura")).toBe(
      true
    );
  });

  it("unmapped greens / all-in-one returns no fake SKU", () => {
    for (const product_name of ["AG1", "IM8 Greens", "Bloom all-in-one"]) {
      const match = matchCaqReplacement(undefined, product_name);
      expect(match.kind).toBe("category");
      expect(match.category).toBe("greens_all_in_one");
      expect(match.via_cura_skus).toEqual([]);
      const entries = suggestProtocolNextOrder([{ product_name, source: "caq" }]);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.status).toBe("current");
      expect(entries[0]?.via_cura_sku).toBeUndefined();
      expect(entries.some((row) => row.status === "suggested_viacura")).toBe(false);
    }
  });

  it("store-brand mass does not invent a SKU", () => {
    const entries = suggestProtocolNextOrder([{ brand: "Kirkland", product_name: "Vitamin D" }]);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe("current");
    expect(entries[0]?.via_cura_sku).toBeUndefined();
    expect(matchCaqReplacement("Equate", "B-12").via_cura_skus).toEqual([]);
  });

  it("category NAD match uses on-file Replenish NAD+ and edu-viacura cite when available", () => {
    const entries = suggestProtocolNextOrder([
      { brand: "Renue By Science", product_name: "NMN", source: "caq" },
    ]);
    const suggested = entries.find((row) => row.status === "suggested_viacura");
    expect(suggested?.via_cura_sku).toBe("Replenish NAD+");
    expect(suggested?.cite).toEqual({
      cite_id: "edu-viacura:nad-plus",
      label: "ViaCura Replenish NAD+",
    });
    expect(isEducationShapedViacuraSupplementEduCite(suggested!.cite!)).toBe(true);
  });

  it("does not self-suggest when the ViaCura SKU is already current", () => {
    const entries = suggestProtocolNextOrder([
      { brand: "ViaCura", product_name: "RELAX+", source: "caq" },
      { brand: "OLLY", product_name: "Sleep melatonin", source: "caq" },
    ]);
    expect(entries.filter((row) => row.status === "current")).toHaveLength(2);
    expect(entries.filter((row) => row.via_cura_sku === "RELAX+" && row.status === "suggested_viacura")).toEqual(
      []
    );
  });

  it("why-pillars are on-file ids/labels only", () => {
    expect(Object.keys(WHY_VIACURA_PILLAR_LABELS).sort()).toEqual([...WHY_VIACURA_PILLAR_IDS].sort());
    for (const id of WHY_VIACURA_PILLAR_IDS) {
      expect(WHY_VIACURA_PILLAR_LABELS[id].trim().length).toBeGreaterThan(0);
    }
    const spoken = JSON.stringify(WHY_VIACURA_PILLAR_LABELS);
    expect(spoken).not.toMatch(/heavy metal|pesticide|filler contamination/i);
    assertNoInventedFacts(spoken);
  });
});

describe("get_protocol advisor hook", () => {
  afterEach(() => {
    delete process.env[PROTOCOL_NEXT_ORDER_FLAG];
    delete process.env[LLM_GROUNDED_CHAT_FLAG];
  });

  const ctx = {
    userId: "user-1",
    role: "consumer" as const,
    requestId: "req-next-order",
    advisorContextVariables: {
      currentSupplements: "Thorne Mg Bisglycinate (1 capsule daily); AG1 (1 scoop daily)",
    },
  };

  it("flag off omits protocol_entries and leaves items intact", () => {
    delete process.env[PROTOCOL_NEXT_ORDER_FLAG];
    const result = getProtocolFromContext({ user_id: "user-1" }, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toHaveProperty("protocol_entries");
    expect(result.data.items.map((item) => item.productName)).toEqual([
      "Thorne Mg Bisglycinate",
      "AG1",
    ]);
    expect(result.data.items[0]?.dosage).toBe("1 capsule daily");
  });

  it("flag on attaches suggestions without deleting current items or inventing mg", () => {
    process.env[PROTOCOL_NEXT_ORDER_FLAG] = "true";
    const result = getProtocolFromContext({ user_id: "user-1" }, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items).toHaveLength(2);
    expect(result.data.items.map((item) => item.productName)).toEqual([
      "Thorne Mg Bisglycinate",
      "AG1",
    ]);
    const entries = result.data.protocol_entries ?? [];
    expect(entries.some((row) => row.status === "current" && row.product_name === "Mg Bisglycinate")).toBe(
      true
    );
    expect(entries.some((row) => row.status === "current" && /ag1/i.test(row.product_name))).toBe(true);
    expect(entries.some((row) => row.status === "suggested_viacura" && row.via_cura_sku === "Magnesium Synergy Matrix")).toBe(
      true
    );
    expect(
      entries.some((row) => /ag1/i.test(row.product_name) && row.status === "suggested_viacura")
    ).toBe(false);
    expect(entries.filter((row) => /ag1/i.test(row.product_name)).every((row) => !row.via_cura_sku)).toBe(
      true
    );
    assertNoInventedFacts(JSON.stringify(entries));
    expect(JSON.stringify(entries)).not.toMatch(/1 capsule daily/);
  });

  it("flag off grounded chat stays legacy; flag on does not dump competitor mg into Sources", async () => {
    delete process.env[PROTOCOL_NEXT_ORDER_FLAG];
    delete process.env[LLM_GROUNDED_CHAT_FLAG];
    const off = await resolveGroundedChatTurn({
      message: "Why is Thorne on my protocol?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-off",
      advisorContextVariables: ctx.advisorContextVariables,
    });
    expect(off.kind).toBe("legacy");

    process.env[LLM_GROUNDED_CHAT_FLAG] = "true";
    process.env[PROTOCOL_NEXT_ORDER_FLAG] = "true";
    const on = await resolveGroundedChatTurn({
      message: "Why is Thorne on my protocol?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on",
      advisorContextVariables: ctx.advisorContextVariables,
    });
    expect(on.kind).toBe("static");
    if (on.kind !== "static") return;
    expect(on.requiredTools).toEqual(["get_protocol"]);
    const sourcesStart = on.text.indexOf("3. Sources");
    const sourcesEnd = on.text.indexOf("4. Next action");
    const sources = on.text.slice(sourcesStart, sourcesEnd);
    expect(sources).not.toMatch(/thorne/i);
    expect(sources).not.toMatch(/\b\d+\s*mg\b/i);
    expect(sources).not.toMatch(/edu-viacura:/);
    expect(on.text.toLowerCase()).not.toMatch(/\b(diagnose|prescribe|safe to take)\b/);
    expect(on.text).not.toMatch(/formavision/i);
  });
});

describe("diff audit — Soft locks", () => {
  it("does not invent GeneX360 Soft, FormaVision, or edu-viacura competitor dump", () => {
    const src = moduleSources().join("\n");
    expect(src).not.toMatch(/formavision/i);
    expect(src).not.toMatch(/\bglb\b/i);
    expect(src).not.toMatch(/competitiveSkuSeeds|competitor_pricing|viacura_comparable/);
    expect(src).not.toMatch(/mthfr\s*gene|can't methylate|cannot methylate/i);
    expect(src).toMatch(/GeneX360/);
    expect(src).not.toMatch(/ViaCura360|ViaCura SNP Soft/i);

    const allowlist = [...STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST];
    expect(allowlist).toEqual([
      "edu-viacura:nad-plus",
      "edu-viacura:mthfr-plus",
      "edu-viacura:catalog-index",
      "edu-viacura:rise-plus",
      "edu-viacura:relax-plus",
    ]);
    for (const seed of Object.values(STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS)) {
      expect(seed.label).not.toMatch(/thorne|ag1|life extension|pure encapsulations/i);
    }

    const routerSrc = readFileSync(join(GROUNDED_DIR, "tool-router.ts"), "utf8");
    expect(routerSrc).toContain("isProtocolNextOrderEnabled");
    expect(routerSrc).toContain("const ALLOW_GENERATE = false");
    expect(routerSrc).not.toMatch(/PROTOCOL_NEXT_ORDER_ENABLED.*=.*true/);

    const flagSrc = readFileSync(join(MODULE_DIR, "flag.ts"), "utf8");
    expect(flagSrc).not.toMatch(/PROTOCOL_NEXT_ORDER_ENABLED.*=.*true/);

    const stageA = readFileSync(join(process.cwd(), "../docs/viaconnect-llm/STAGE-A.md"), "utf8");
    const contracts = readFileSync(
      join(process.cwd(), "../docs/viaconnect-llm/TOOL-CONTRACTS.md"),
      "utf8"
    );
    expect(stageA).toMatch(/Next-order suggestions = daily protocol \+ CAQ replacement map/);
    expect(stageA).toMatch(/not Hannah RAG invent/);
    expect(contracts).toMatch(/protocol SSOT \+ `CAQ_REPLACEMENT_MAP`/);
    expect(contracts).toMatch(/Not Hannah RAG invent/);
  });
});
