"use client";

// Prompt #111 — Cart availability warning. Hard-blocks checkout if any cart
// SKU is not available in the user's current market (§9.5). Consumer sees
// the list of blocked SKUs and must remove them to proceed.

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useMarket } from "@/lib/international/market-context";
import { checkCartAvailability } from "@/lib/international/availability";

type Props = {
  cartSkus: readonly string[];
  onChange?: (ok: boolean, blocked: readonly string[]) => void;
};

export function CartAvailabilityWarning({ cartSkus, onChange }: Props) {
  const { market } = useMarket();
  const [ok, setOk] = useState<boolean>(true);
  const [blocked, setBlocked] = useState<readonly string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await checkCartAvailability(cartSkus, market);
      if (cancelled) return;
      setOk(res.ok);
      setBlocked(res.blockedSkus);
      if (onChange) onChange(res.ok, res.blockedSkus);
    })();
    return () => { cancelled = true; };
  }, [market, cartSkus, onChange]);

  if (ok) return null;
  return (
    <div className="rounded-lg border border-rose-800 bg-rose-950/60 p-3 text-sm text-rose-100">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-300" strokeWidth={1.5} aria-hidden />
        <div>
          <p className="font-medium">Some items in your cart are not available in your region.</p>
          <p className="mt-1 text-xs text-rose-200">Remove these items to continue to checkout: {blocked.join(", ")}</p>
        </div>
      </div>
    </div>
  );
}
