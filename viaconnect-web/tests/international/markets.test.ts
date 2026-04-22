// Prompt #111 — market helpers (pure functions only).

import { describe, it, expect } from "vitest";
import { isMarketCode, readCloudflareCountryHeader, readMarketCookie, currencyForMarket, MARKET_COOKIE } from "@/lib/international/markets";

describe("isMarketCode", () => {
  it("accepts valid 4 markets", () => {
    for (const m of ["US", "EU", "UK", "AU"]) expect(isMarketCode(m)).toBe(true);
  });
  it("rejects unknowns + case variants + nulls", () => {
    expect(isMarketCode("us")).toBe(false);
    expect(isMarketCode("CA")).toBe(false);
    expect(isMarketCode(null)).toBe(false);
    expect(isMarketCode(undefined)).toBe(false);
    expect(isMarketCode("")).toBe(false);
  });
});

describe("readCloudflareCountryHeader", () => {
  it("reads CF-IPCountry header", () => {
    const h = new Headers({ "cf-ipcountry": "GB" });
    expect(readCloudflareCountryHeader(h)).toBe("GB");
  });
  it("returns null for Cloudflare sentinel values XX and T1", () => {
    for (const v of ["XX", "T1"]) {
      const h = new Headers({ "cf-ipcountry": v });
      expect(readCloudflareCountryHeader(h)).toBeNull();
    }
  });
  it("returns null when header absent", () => {
    expect(readCloudflareCountryHeader(new Headers())).toBeNull();
  });
});

describe("readMarketCookie", () => {
  it("extracts a valid market cookie", () => {
    expect(readMarketCookie(`${MARKET_COOKIE}=EU; other=foo`)).toBe("EU");
  });
  it("returns null for unknown market value", () => {
    expect(readMarketCookie(`${MARKET_COOKIE}=ZZ`)).toBeNull();
  });
  it("returns null when cookie missing", () => {
    expect(readMarketCookie("other=foo")).toBeNull();
    expect(readMarketCookie(null)).toBeNull();
    expect(readMarketCookie(undefined)).toBeNull();
  });
});

describe("currencyForMarket", () => {
  it("maps each market to its ISO 4217 currency", () => {
    expect(currencyForMarket("US")).toBe("USD");
    expect(currencyForMarket("EU")).toBe("EUR");
    expect(currencyForMarket("UK")).toBe("GBP");
    expect(currencyForMarket("AU")).toBe("AUD");
  });
});
