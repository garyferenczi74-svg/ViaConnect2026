import { describe, expect, it } from "vitest";
import { toSearchResponse } from "../location/search";

describe("toSearchResponse", () => {
  it("fail-opens on timeout with empty items", () => {
    const r = toSearchResponse({ timedOut: true, error: null, items: [] });
    expect(r.failOpen).toBe(true);
    expect(r.items).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it("returns items when the lookup succeeds", () => {
    const r = toSearchResponse({
      timedOut: false,
      error: null,
      items: [{ value: "CA", label: "Canada" }],
    });
    expect(r.failOpen).toBe(false);
    expect(r.items).toHaveLength(1);
  });
  it("fail-opens on RPC error and drops items", () => {
    const r = toSearchResponse({
      timedOut: false,
      error: { message: "rpc failed" },
      items: [{ value: "CA", label: "Canada" }],
    });
    expect(r.failOpen).toBe(true);
    expect(r.items).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
