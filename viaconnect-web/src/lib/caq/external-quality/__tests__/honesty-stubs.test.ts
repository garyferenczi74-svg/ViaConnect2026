import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  CAQ_MEDISEARCH_CITE_MAX,
  CAQ_MEDISEARCH_FLAG,
  getMediSearchFeed,
  getProveItFeed,
  getSuppieFeed,
  hasMedisearchApiKey,
  isCaqMedisearchEnabled,
  MEDISEARCH_API_KEY_ENV,
} from "../index";
import type { ExternalQualityFeedResult } from "../types";

const MODULE_DIR = join(process.cwd(), "src/lib/caq/external-quality");

function moduleSources(): string[] {
  return readdirSync(MODULE_DIR)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".d.ts"))
    .map((name) => readFileSync(join(MODULE_DIR, name), "utf8"));
}

function assertHonestEmptyStub(
  result: ExternalQualityFeedResult,
  source: ExternalQualityFeedResult["source"],
  reason: ExternalQualityFeedResult["reason"],
): void {
  expect(result.source).toBe(source);
  expect(result.status).toBe("unavailable");
  expect(result.reason).toBe(reason);
  expect(result.items).toEqual([]);
  expect(result).not.toHaveProperty("quality_score");
  expect(result).not.toHaveProperty("consistency");
  expect(result).not.toHaveProperty("bioavailability");
  const json = JSON.stringify(result);
  expect(json).not.toMatch(/quality_score/);
  expect(json).not.toMatch(/consistency/);
  expect(json).not.toMatch(/bioavailability/i);
  expect(json).not.toMatch(/\b\d+\s*(mg|mcg|iu)\b/i);
  expect(json).not.toMatch(/coa/i);
  expect(json).not.toMatch(/10\s*[–-]\s*27x/i);
}

describe("Prove It / Suppie honesty stubs", () => {
  it("Prove It is unavailable with no_public_api and never invents scores", () => {
    assertHonestEmptyStub(getProveItFeed(), "proveit", "no_public_api");
  });

  it("Suppie is unavailable with no_public_api and never invents scores", () => {
    assertHonestEmptyStub(getSuppieFeed(), "suppie", "no_public_api");
  });

  it("Suppie stub does not mention SUPP.AI or supp.ai", () => {
    const result = getSuppieFeed();
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/supp\.ai/i);
    expect(json).not.toMatch(/SUPP\.AI/);
    const suppieSrc = readFileSync(join(MODULE_DIR, "suppie.ts"), "utf8");
    expect(suppieSrc).not.toMatch(/https?:\/\/supp\.ai/i);
    expect(suppieSrc).not.toMatch(/Allen Institute/);
    // Comment may warn they are different; the stub payload must not wire the URL.
    expect(json).not.toContain("https://");
  });

  it("stubs use status enums only — no member-facing compare sentences", () => {
    const payloads = [getProveItFeed(), getSuppieFeed(), getMediSearchFeed()];
    for (const result of payloads) {
      const json = JSON.stringify(result);
      expect(json).not.toMatch(/we (couldn.t|cannot|can't)/i);
      expect(json).not.toMatch(/unavailable right now/i);
      expect(json).not.toMatch(/could not compare/i);
      expect(json).not.toMatch(/no public API found/i);
    }
  });
});

describe("MediSearch refuse shape (PR A — no live network)", () => {
  afterEach(() => {
    delete process.env[CAQ_MEDISEARCH_FLAG];
    delete process.env[MEDISEARCH_API_KEY_ENV];
    vi.unstubAllGlobals();
  });

  it("flag defaults OFF", () => {
    delete process.env[CAQ_MEDISEARCH_FLAG];
    expect(isCaqMedisearchEnabled()).toBe(false);
    process.env[CAQ_MEDISEARCH_FLAG] = "false";
    expect(isCaqMedisearchEnabled()).toBe(false);
    process.env[CAQ_MEDISEARCH_FLAG] = "banana";
    expect(isCaqMedisearchEnabled()).toBe(false);
  });

  it("enables only for explicit truthy tokens", () => {
    process.env[CAQ_MEDISEARCH_FLAG] = "true";
    expect(isCaqMedisearchEnabled()).toBe(true);
    process.env[CAQ_MEDISEARCH_FLAG] = "1";
    expect(isCaqMedisearchEnabled()).toBe(true);
  });

  it("flag off → unavailable / flag_off and does not call network", () => {
    delete process.env[CAQ_MEDISEARCH_FLAG];
    process.env[MEDISEARCH_API_KEY_ENV] = "test-key-not-used";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = getMediSearchFeed();
    assertHonestEmptyStub(result, "medisearch", "flag_off");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(hasMedisearchApiKey()).toBe(true);
  });

  it("flag on + no key → unavailable / missing_key and does not call network", () => {
    process.env[CAQ_MEDISEARCH_FLAG] = "true";
    delete process.env[MEDISEARCH_API_KEY_ENV];
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = getMediSearchFeed();
    assertHonestEmptyStub(result, "medisearch", "missing_key");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(hasMedisearchApiKey()).toBe(false);
  });

  it("flag on + key still refuses live fetch in PR A (live_hold)", () => {
    process.env[CAQ_MEDISEARCH_FLAG] = "true";
    process.env[MEDISEARCH_API_KEY_ENV] = "test-key-not-used";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = getMediSearchFeed();
    assertHonestEmptyStub(result, "medisearch", "live_hold");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not implement MediSearch SSE and keeps cite cap locked", () => {
    expect(CAQ_MEDISEARCH_CITE_MAX).toBe(10);
    const src = readFileSync(join(MODULE_DIR, "medisearch.ts"), "utf8");
    expect(src).not.toMatch(/api\.backend\.medisearch\.io/);
    expect(src).not.toMatch(/EventSource|text\/event-stream|medichat/);
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/https?:\/\//);
  });
});

describe("CAQ-only lane lock (diff audit)", () => {
  it("module does not import Hannah RAG, edu-viacura, grounded retriever, or FormaVision", () => {
    const joined = moduleSources().join("\n");
    expect(joined).not.toMatch(/edu-viacura:/);
    expect(joined).not.toMatch(/formavision/i);
    expect(joined).not.toMatch(/from ["'][^"']*jeffery\/grounded/);
    expect(joined).not.toMatch(/from ["'][^"']*formavision/);
    expect(joined).not.toMatch(/STAGE_A_VIACURA_SUPPLEMENT_EDU/);
    expect(joined).not.toMatch(/retrieveGroundedChunks/);
  });

  it("STAGE-A and TOOL-CONTRACTS one-liners keep MediSearch on CAQ compare", () => {
    const stageA = readFileSync(
      join(process.cwd(), "../docs/viaconnect-llm/STAGE-A.md"),
      "utf8",
    );
    const contracts = readFileSync(
      join(process.cwd(), "../docs/viaconnect-llm/TOOL-CONTRACTS.md"),
      "utf8",
    );
    expect(stageA).toMatch(/MediSearch[\s\S]{0,120}CAQ compare/);
    expect(stageA).toMatch(/CAQ_MEDISEARCH_ENABLED/);
    expect(contracts).toMatch(/MediSearch[\s\S]{0,160}CAQ compare/);
    expect(contracts).toMatch(/CAQ_MEDISEARCH_ENABLED/);
  });
});
