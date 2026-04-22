// Prompt #111 — Market detection + override persistence.
// Geo-IP lookup: Cloudflare CF-IPCountry header (primary); MaxMind fallback
// intentionally deferred per §19 open question until Gary provisions service.
// Override: cookie for unauthenticated users, profile preference on login.

import { createClient } from "@/lib/supabase/client";
import type { MarketCode, CurrencyCode } from "./types";
import { ALL_MARKETS, MARKET_CURRENCY } from "./types";

export const MARKET_COOKIE = "viaconnect_market";
export const CURRENCY_COOKIE = "viaconnect_currency";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function isMarketCode(value: string | null | undefined): value is MarketCode {
  return !!value && (ALL_MARKETS as readonly string[]).includes(value);
}

/**
 * Given an ISO 3166-1 alpha-2 country code, return the matching market.
 * Returns null for unmapped countries; callers typically fall back to 'US'
 * with a "shipping not available" banner.
 */
export async function resolveMarketFromCountry(countryCode: string): Promise<MarketCode | null> {
  if (!countryCode || countryCode.length !== 2) return null;
  const sb = createClient();
  const { data, error } = await sb
    .from("international_country_to_market")
    .select("market_code")
    .eq("country_code", countryCode.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return data.market_code as MarketCode;
}

/**
 * Cloudflare edge header. When running on Vercel behind Cloudflare or on
 * Cloudflare directly, this header is populated. Anywhere else, returns null.
 */
export function readCloudflareCountryHeader(headers: Headers): string | null {
  const cf = headers.get("cf-ipcountry") ?? headers.get("CF-IPCountry");
  if (!cf || cf === "XX" || cf === "T1") return null;
  return cf.toUpperCase();
}

export function currencyForMarket(market: MarketCode): CurrencyCode {
  return MARKET_CURRENCY[market];
}

/**
 * Return the market cookie from a `Cookie` header or a NextResponse cookie
 * store. Pass whichever your request context has.
 */
export function readMarketCookie(cookieHeader: string | null | undefined): MarketCode | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").map((s) => s.trim())
    .find((c) => c.startsWith(`${MARKET_COOKIE}=`));
  if (!match) return null;
  const raw = decodeURIComponent(match.slice(MARKET_COOKIE.length + 1));
  return isMarketCode(raw) ? raw : null;
}
