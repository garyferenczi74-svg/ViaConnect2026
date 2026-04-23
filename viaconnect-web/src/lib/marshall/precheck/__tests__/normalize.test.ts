import { describe, it, expect } from "vitest";
import { normalizeDraft } from "../normalize";

describe("normalizeDraft", () => {
  it("produces a deterministic SHA-256 hash", () => {
    const a = normalizeDraft({ text: "Hello world" });
    const b = normalizeDraft({ text: "Hello world" });
    expect(a.hash).toBe(b.hash);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("normalizes whitespace so minor drift doesn't change the hash", () => {
    const a = normalizeDraft({ text: "Hello   world" });
    const b = normalizeDraft({ text: "Hello world" });
    expect(a.hash).toBe(b.hash);
  });
  it("matches a FarmCeutica SKU prefix", () => {
    const r = normalizeDraft({ text: "trying FARM-METH-30 this month" });
    expect(r.productMatches[0].sku).toBe("FARM-METH-30");
  });
  it("falls back to brand match if no SKU present", () => {
    const r = normalizeDraft({ text: "loving FarmCeutica" });
    expect(r.productMatches.length).toBe(1);
    expect(r.productMatches[0].sku).toBe("FARMCEUTICA-BRAND");
  });
  it("returns no product matches on unrelated text", () => {
    const r = normalizeDraft({ text: "random unrelated copy" });
    expect(r.productMatches.length).toBe(0);
  });
});
