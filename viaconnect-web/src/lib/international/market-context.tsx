"use client";

// Prompt #111 — React market context.
// Every surface that renders prices reads the current market + currency from
// this context. Hydrated on mount from geo-IP header (via a route handler)
// and overrides from cookie/profile, per §6.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { MarketCode, CurrencyCode } from "./types";
import { MARKET_CURRENCY, ALL_MARKETS } from "./types";
import {
  MARKET_COOKIE,
  CURRENCY_COOKIE,
  COOKIE_MAX_AGE_SECONDS,
  isMarketCode,
} from "./markets";

export interface MarketContextValue {
  market: MarketCode;
  currency: CurrencyCode;
  setMarket: (next: MarketCode) => void;
  isOverridden: boolean;
}

const MarketContext = createContext<MarketContextValue | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const pairs = document.cookie.split(";").map((c) => c.trim());
  const match = pairs.find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie =
    `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function MarketProvider({
  initialMarket,
  children,
}: {
  initialMarket: MarketCode;
  children: React.ReactNode;
}) {
  const [market, setMarketState] = useState<MarketCode>(initialMarket);
  const [isOverridden, setIsOverridden] = useState<boolean>(false);

  useEffect(() => {
    const cookieMarket = readCookie(MARKET_COOKIE);
    if (isMarketCode(cookieMarket) && cookieMarket !== market) {
      setMarketState(cookieMarket);
      setIsOverridden(true);
    }
  }, [market]);

  const setMarket = useCallback((next: MarketCode) => {
    if (!ALL_MARKETS.includes(next)) return;
    writeCookie(MARKET_COOKIE, next);
    writeCookie(CURRENCY_COOKIE, MARKET_CURRENCY[next]);
    setMarketState(next);
    setIsOverridden(true);
  }, []);

  const value = useMemo<MarketContextValue>(
    () => ({ market, currency: MARKET_CURRENCY[market], setMarket, isOverridden }),
    [market, setMarket, isOverridden],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error("useMarket must be used within a <MarketProvider>. Prompt #111.");
  }
  return ctx;
}
