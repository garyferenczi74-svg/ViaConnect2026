"use client";

// Prompt #111 — Badge shown on product cards when a SKU is NOT available in
// the user's current market. Consumers see a greyed treatment + this badge
// with the default reasoning (§3.5 category-driven defaults).

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useMarket } from "@/lib/international/market-context";
import { createClient } from "@/lib/supabase/client";

export function MarketAvailabilityBadge({ sku }: { sku: string }) {
  const { market } = useMarket();
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = createClient();
      const { data } = await sb
        .from("master_skus_market_pricing")
        .select("is_available_in_market, market_availability_default_reasoning")
        .eq("sku", sku)
        .eq("market_code", market)
        .eq("status", "active")
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setAvailable(false); setReasoning(null); return; }
      const d = data as { is_available_in_market: boolean; market_availability_default_reasoning: string | null };
      setAvailable(d.is_available_in_market);
      setReasoning(d.market_availability_default_reasoning);
    })();
    return () => { cancelled = true; };
  }, [sku, market]);

  if (available === null || available === true) return null;

  return (
    <div className="inline-flex items-center gap-1 rounded-md bg-slate-800/70 px-2 py-1 text-xs text-slate-300" title={reasoning ?? undefined}>
      <Lock className="h-3 w-3" strokeWidth={1.5} aria-hidden />
      <span>Not available in {market}</span>
    </div>
  );
}
