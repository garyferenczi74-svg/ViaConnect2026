"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageTransition, StaggerChild } from "@/lib/motion";

const supabase = createClient();

function fmt(n: number): string {
  if (n == null) return "$0";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const urgencyVariant: Record<string, "danger" | "warning" | "pending" | "neutral"> = {
  URGENT: "danger",
  SOON: "warning",
  PLANNED: "pending",
  STABLE: "neutral",
};

const urgencyOrder: Record<string, number> = { URGENT: 0, SOON: 1, PLANNED: 2, STABLE: 3 };

const riskVariant: Record<string, "danger" | "warning" | "active" | "neutral"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "active",
};

export default function InventoryPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory-reorder-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_reorder")
        .select(
          "sku, name, category, avg_monthly_demand, safety_stock, reorder_point, eoq, avg_inventory, weeks_of_supply, avg_inventory_value, inventory_turns, stockout_risk, po_urgency, days_until_reorder, next_order_qty, next_order_value"
        )
        .order("days_until_reorder", { ascending: true });
      return (data ?? []) as any[];
    },
    enabled: !!userId,
  });

  const totalValue = inventory?.reduce((sum, r) => sum + (r.avg_inventory_value ?? 0), 0) ?? 0;
  const urgentCount = inventory?.filter((r) => r.po_urgency === "URGENT").length ?? 0;
  const soonCount = inventory?.filter((r) => r.po_urgency === "SOON").length ?? 0;
  const highStockout = inventory?.filter((r) => r.stockout_risk === "HIGH").length ?? 0;

  const grouped = (inventory ?? []).reduce<Record<string, any[]>>((acc, r) => {
    const urg = r.po_urgency ?? "STABLE";
    (acc[urg] ??= []).push(r);
    return acc;
  }, {});
  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => (urgencyOrder[a] ?? 9) - (urgencyOrder[b] ?? 9)
  );

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <StaggerChild>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Inventory &amp; Reorder Planning</h1>
            <p className="text-gray-400 text-sm mt-1">Stock levels, reorder points &amp; PO scheduling</p>
          </div>
          <Badge variant="active" className="bg-copper/20 text-copper">INVENTORY</Badge>
        </div>
      </StaggerChild>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <>
          <StaggerChild className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-2xl font-bold text-white">{fmt(totalValue)}</p>
              <p className="text-xs text-gray-400 mt-1">Total Inventory Value</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-rose">{urgentCount}</p>
              <p className="text-xs text-gray-400 mt-1">Urgent POs</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-copper">{soonCount}</p>
              <p className="text-xs text-gray-400 mt-1">Soon POs</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-rose">{highStockout}</p>
              <p className="text-xs text-gray-400 mt-1">High Stockout Risk</p>
            </Card>
          </StaggerChild>

          {sortedGroups.length > 0 ? (
            sortedGroups.map(([urgency, items]) => (
              <StaggerChild key={urgency}>
                <Card className="p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                    <Badge variant={urgencyVariant[urgency] ?? "neutral"}>{urgency}</Badge>
                    <span className="text-xs text-gray-400">
                      {items.length} SKU{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {[
                            "SKU",
                            "Name",
                            "Category",
                            "Demand/mo",
                            "Safety",
                            "Reorder Pt",
                            "EOQ",
                            "Wks Supply",
                            "Stockout",
                            "Days to Reorder",
                            "Order Value",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((r: any) => (
                          <tr
                            key={r.sku}
                            className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-3 py-2 text-xs text-gray-400 font-mono">{r.sku}</td>
                            <td className="px-3 py-2 text-xs text-white font-medium whitespace-nowrap">
                              {r.name}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-400">{r.category}</td>
                            <td className="px-3 py-2 text-xs text-gray-300">
                              {(r.avg_monthly_demand ?? 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-300">
                              {(r.safety_stock ?? 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-300">
                              {(r.reorder_point ?? 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-300">
                              {(r.eoq ?? 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-300">
                              {r.weeks_of_supply ?? 0}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant={riskVariant[r.stockout_risk] ?? "neutral"}>
                                {r.stockout_risk}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-300">
                              {r.days_until_reorder ?? 0}d
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-300">
                              {fmt(r.next_order_value ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </StaggerChild>
            ))
          ) : (
            <Card className="p-6 text-center">
              <p className="text-gray-400">
                No inventory data found. Run{" "}
                <code className="text-copper">.\farmceutica.ps1 inventory</code> to generate.
              </p>
            </Card>
          )}
        </>
      )}
    </PageTransition>
  );
}
