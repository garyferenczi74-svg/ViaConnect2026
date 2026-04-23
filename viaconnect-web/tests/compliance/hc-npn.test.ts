// Prompt #113 hotfix P0 #4 — HC NPN / DIN-HM validator tests.

import { describe, expect, it } from "vitest";
import {
  validateNpn,
  validateDinHm,
  validateNpnOrDinHm,
} from "@/lib/compliance/validators/hc-npn";

describe("validateNpn", () => {
  it("accepts an 8-digit NPN", () => {
    const r = validateNpn("80012345");
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe("80012345");
  });

  it("strips surrounding whitespace", () => {
    expect(validateNpn("  80012345  ").normalized).toBe("80012345");
  });

  it("strips internal whitespace and hyphens used for readability", () => {
    expect(validateNpn("80012 345").normalized).toBe("80012345");
    expect(validateNpn("8001-2345").normalized).toBe("80012345");
    expect(validateNpn("80 01 23 45").normalized).toBe("80012345");
  });

  it("rejects anything other than 8 digits", () => {
    expect(validateNpn("7001234").ok).toBe(false);       // 7 digits
    expect(validateNpn("700123456").ok).toBe(false);     // 9 digits
    expect(validateNpn("ABCD1234").ok).toBe(false);      // mixed
    expect(validateNpn("80012345X").ok).toBe(false);     // trailing char
    expect(validateNpn("80.012.345").ok).toBe(false);    // dots not stripped
  });

  it("rejects null, undefined, empty", () => {
    expect(validateNpn(null).ok).toBe(false);
    expect(validateNpn(undefined).ok).toBe(false);
    expect(validateNpn("").ok).toBe(false);
    expect(validateNpn("   ").ok).toBe(false);
  });

  it("allows future HC number blocks (not hardcoded to leading 8)", () => {
    // Health Canada reserves other digit prefixes for specialty product
    // classes. Validator must not lock to "starts with 8".
    expect(validateNpn("90012345").ok).toBe(true);
    expect(validateNpn("10012345").ok).toBe(true);
  });

  it("attaches a useful error message on failure", () => {
    const r = validateNpn("bad");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/8 digits/);
    expect(r.error).toMatch(/bad/);
  });
});

describe("validateDinHm", () => {
  it("accepts the canonical form", () => {
    expect(validateDinHm("DIN-HM 80012345").normalized).toBe("DIN-HM 80012345");
  });

  it("accepts any prefix casing + spacing variant", () => {
    expect(validateDinHm("DIN-HM80012345").normalized).toBe("DIN-HM 80012345");
    expect(validateDinHm("DINHM 80012345").normalized).toBe("DIN-HM 80012345");
    expect(validateDinHm("DINHM-80012345").normalized).toBe("DIN-HM 80012345");
    expect(validateDinHm("dinhm 80012345").normalized).toBe("DIN-HM 80012345");
    expect(validateDinHm("Din-Hm 80012345").normalized).toBe("DIN-HM 80012345");
  });

  it("accepts bare 8 digits and promotes to canonical form", () => {
    expect(validateDinHm("80012345").normalized).toBe("DIN-HM 80012345");
  });

  it("rejects non-8-digit content", () => {
    expect(validateDinHm("DIN-HM 700123").ok).toBe(false);
    expect(validateDinHm("DIN-HM ABCD1234").ok).toBe(false);
    expect(validateDinHm("DIN-HM").ok).toBe(false);
  });

  it("rejects null / empty", () => {
    expect(validateDinHm(null).ok).toBe(false);
    expect(validateDinHm("").ok).toBe(false);
  });
});

describe("validateNpnOrDinHm", () => {
  it("routes to DIN-HM when prefix present", () => {
    const r = validateNpnOrDinHm("DIN-HM 80012345");
    expect(r.kind).toBe("DIN-HM");
    expect(r.normalized).toBe("DIN-HM 80012345");
  });

  it("routes to NPN when prefix absent", () => {
    const r = validateNpnOrDinHm("80012345");
    expect(r.kind).toBe("NPN");
    expect(r.normalized).toBe("80012345");
  });

  it("returns failure for empty input", () => {
    const r = validateNpnOrDinHm("");
    expect(r.ok).toBe(false);
    expect(r.kind).toBeNull();
  });

  it("carries the underlying validator's error up", () => {
    const r = validateNpnOrDinHm("bogus");
    expect(r.ok).toBe(false);
    expect(r.kind).toBe("NPN");
    expect(r.error).toBeTruthy();
  });
});
