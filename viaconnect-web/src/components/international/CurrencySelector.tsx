"use client";

// Prompt #111 — Currency + market selector for the site header/footer.
// Text-only currency codes (no flag emojis per §3.1). Lucide Globe icon at
// strokeWidth={1.5}. Changing market also updates currency; cart availability
// warnings appear downstream via checkCartAvailability().

import { Globe } from "lucide-react";
import { useMarket } from "@/lib/international/market-context";
import type { MarketCode } from "@/lib/international/types";
import { ALL_MARKETS, MARKET_CURRENCY, CURRENCY_SYMBOL } from "@/lib/international/types";

const LABEL: Record<MarketCode, string> = {
  US: "United States",
  EU: "European Union",
  UK: "United Kingdom",
  AU: "Australia",
};

export function CurrencySelector({ compact = false }: { compact?: boolean }) {
  const { market, currency, setMarket } = useMarket();
  return (
    <label className={`inline-flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <Globe className="h-4 w-4 text-slate-300" strokeWidth={1.5} aria-hidden />
      <span className="sr-only">Select market and currency</span>
      <select
        value={market}
        onChange={(e) => setMarket(e.target.value as MarketCode)}
        className="min-h-[44px] rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-base text-slate-100 focus:border-teal-400 focus:outline-none sm:text-sm"
        aria-label="Market and currency selector"
      >
        {ALL_MARKETS.map((m) => (
          <option key={m} value={m}>
            {LABEL[m]} · {MARKET_CURRENCY[m]} ({CURRENCY_SYMBOL[MARKET_CURRENCY[m]]})
          </option>
        ))}
      </select>
      {!compact && (
        <span className="text-slate-500" aria-hidden>
          {currency}
        </span>
      )}
    </label>
  );
}
