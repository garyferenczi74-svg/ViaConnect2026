"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageTransition, StaggerChild, MotionCard } from "@/lib/motion";

const supabase = createClient();

function fmt(n: number): string {
  if (n == null) return "$0";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(n: number): string {
  return `${n?.toFixed(1) ?? 0}%`;
}

const metricDefs: {
  key: string;
  label: string;
  format: (v: any) => string;
}[] = [
  { key: "arr", label: "ARR", format: fmt },
  { key: "mrr", label: "MRR", format: fmt },
  { key: "mrr_growth_mom", label: "MRR Growth (MoM)", format: pct },
  { key: "gross_margin_pct", label: "Gross Margin", format: (v) => pct(v) },
  { key: "net_revenue_retention", label: "Net Revenue Retention", format: pct },
  { key: "ltv_to_cac", label: "LTV:CAC", format: (v) => `${v?.toFixed(1) ?? 0}x` },
  { key: "cac_payback_months", label: "CAC Payback", format: (v) => `${v ?? 0} mo` },
  { key: "rule_of_40", label: "Rule of 40", format: (v) => `${v ?? 0}` },
  { key: "monthly_fcf", label: "Monthly FCF", format: fmt },
  { key: "cash_runway_months", label: "Cash Runway", format: (v) => `${v ?? 0} mo` },
  { key: "active_customers", label: "Active Customers", format: (v) => (v ?? 0).toLocaleString() },
  { key: "arpu_monthly", label: "ARPU (Monthly)", format: (v) => `$${v ?? 0}` },
  { key: "total_revenue_pipeline", label: "Revenue Pipeline", format: fmt },
  { key: "portfolio_health", label: "Portfolio Health", format: (v) => `${v ?? 0}/100` },
  { key: "revenue_per_sku", label: "Revenue per SKU", format: fmt },
];

export default function BoardMetricsPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data: board, isLoading } = useQuery({
    queryKey: ["board-metrics-detail"],
    queryFn: async () => {
      const { data } = await supabase
        .from("board_metrics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data as any;
    },
    enabled: !!userId,
  });

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <StaggerChild>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Board Metrics &amp; Investor KPIs</h1>
            <p className="text-gray-400 text-sm mt-1">
              {board?.report_quarter ?? "Q1 2026"} &middot; Latest snapshot
            </p>
          </div>
          <Badge variant="active" className="bg-copper/20 text-copper">BOARD</Badge>
        </div>
      </StaggerChild>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : board ? (
        <>
          <StaggerChild className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {metricDefs.map((m) => (
              <MotionCard key={m.key} className="p-4">
                <p className="text-2xl font-bold text-white">{m.format(board[m.key])}</p>
                <p className="text-xs text-gray-400 mt-1">{m.label}</p>
              </MotionCard>
            ))}
          </StaggerChild>

          {board.investor_highlights && board.investor_highlights.length > 0 && (
            <StaggerChild>
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-white mb-3">Investor Highlights</h2>
                <ul className="space-y-2">
                  {board.investor_highlights.map((h: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-portal-green mt-0.5 text-xs">&#9679;</span>
                      <span className="text-sm text-gray-300">{h}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </StaggerChild>
          )}

          {board.risk_factors && board.risk_factors.length > 0 && (
            <StaggerChild>
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-white mb-3">Risk Factors</h2>
                <ul className="space-y-2">
                  {board.risk_factors.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose mt-0.5 text-xs">&#9650;</span>
                      <span className="text-sm text-gray-300">{r}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </StaggerChild>
          )}
        </>
      ) : (
        <Card className="p-6 text-center">
          <p className="text-gray-400">
            No board metrics found. Run{" "}
            <code className="text-copper">.\farmceutica.ps1 board</code> to generate.
          </p>
        </Card>
      )}
    </PageTransition>
  );
}
