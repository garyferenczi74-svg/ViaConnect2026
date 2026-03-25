"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageTransition, StaggerChild } from "@/lib/motion";

const supabase = createClient();

const tierVariant: Record<string, "active" | "info" | "pending" | "danger"> = {
  Star: "active",
  Core: "info",
  Watch: "pending",
  Sunset: "danger",
};

export default function SKUPortfolioPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data: skus, isLoading } = useQuery({
    queryKey: ["sku-rationalization-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sku_rationalization")
        .select("sku, name, category, tier, composite_score, dtc_margin, cogs_ratio, viable_channels, actions")
        .order("composite_score", { ascending: false });
      return (data ?? []) as any[];
    },
    enabled: !!userId,
  });

  const tierCounts = {
    Star: skus?.filter((s) => s.tier === "Star").length ?? 0,
    Core: skus?.filter((s) => s.tier === "Core").length ?? 0,
    Watch: skus?.filter((s) => s.tier === "Watch").length ?? 0,
    Sunset: skus?.filter((s) => s.tier === "Sunset").length ?? 0,
  };

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <StaggerChild>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">SKU Portfolio (62 Products)</h1>
            <p className="text-gray-400 text-sm mt-1">Rationalization &amp; tier analysis</p>
          </div>
          <Badge variant="active" className="bg-copper/20 text-copper">SKUS</Badge>
        </div>
      </StaggerChild>

      <StaggerChild className="flex flex-wrap gap-3">
        {(["Star", "Core", "Watch", "Sunset"] as const).map((tier) => (
          <div
            key={tier}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]"
          >
            <Badge variant={tierVariant[tier]}>{tier}</Badge>
            <span className="text-sm text-white font-medium">{tierCounts[tier]}</span>
          </div>
        ))}
      </StaggerChild>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : skus && skus.length > 0 ? (
        <StaggerChild>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["SKU", "Name", "Category", "Tier", "Score", "DTC Margin", "COGS Ratio", "Channels"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {skus.map((s: any) => (
                    <tr
                      key={s.sku}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{s.sku}</td>
                      <td className="px-4 py-2.5 text-xs text-white font-medium">{s.name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{s.category}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={tierVariant[s.tier] ?? "neutral"}>{s.tier}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-white font-medium">{s.composite_score}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-300">{s.dtc_margin}%</td>
                      <td className="px-4 py-2.5 text-xs text-gray-300">{s.cogs_ratio}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-300">{s.viable_channels}/3</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </StaggerChild>
      ) : (
        <Card className="p-6 text-center">
          <p className="text-gray-400">
            No SKU data found. Run{" "}
            <code className="text-copper">.\farmceutica.ps1 sku-rationalize</code> to generate.
          </p>
        </Card>
      )}
    </PageTransition>
  );
}
