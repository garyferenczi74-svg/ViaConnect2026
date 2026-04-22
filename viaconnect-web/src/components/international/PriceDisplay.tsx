"use client";

// Prompt #111 — Market-aware price rendering.
// Every rendered SKU price on the platform should resolve through this
// component. Handles: unknown (sku, market) => "Not available in your region"
// greyed state; tax-inclusive suffix per market config; currency formatting.

import { useEffect, useState } from "react";
import { useMarket } from "@/lib/international/market-context";
import { getMarketPricing } from "@/lib/international/pricing";
import { formatPrice } from "@/lib/international/tax-display";
import type { MarketPricing, MarketConfig } from "@/lib/international/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  sku: string;
  className?: string;
  showTaxSuffix?: boolean;
};

export function PriceDisplay({ sku, className, showTaxSuffix = true }: Props) {
  const { market } = useMarket();
  const [pricing, setPricing] = useState<MarketPricing | null | undefined>(undefined);
  const [config, setConfig] = useState<Pick<MarketConfig, "inclusive_of_tax" | "display_tax_label"> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getMarketPricing(sku, market);
      if (cancelled) return;
      setPricing(p);
      const sb = createClient();
      const { data } = await sb
        .from("international_market_config")
        .select("inclusive_of_tax, display_tax_label")
        .eq("market_code", market)
        .maybeSingle();
      if (!cancelled && data) {
        setConfig(data as unknown as Pick<MarketConfig, "inclusive_of_tax" | "display_tax_label">);
      }
    })();
    return () => { cancelled = true; };
  }, [sku, market]);

  if (pricing === undefined) {
    return <span className={className ?? "inline-block animate-pulse rounded bg-slate-800 text-transparent"}>$00.00</span>;
  }
  if (pricing === null || !pricing.is_available_in_market) {
    return <span className={className ?? "text-slate-500 text-sm"}>Not available in your region</span>;
  }
  const { text, taxSuffix } = formatPrice(pricing.msrp_cents, pricing.currency_code, showTaxSuffix ? config : null);
  return (
    <span className={className ?? "font-semibold text-slate-100"}>
      {text}
      {taxSuffix && <span className="ml-1 text-xs text-slate-400">{taxSuffix}</span>}
    </span>
  );
}
