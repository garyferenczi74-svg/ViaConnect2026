"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  BarChart3, Package, DollarSign, TrendingUp, AlertTriangle,
  Users, ShoppingCart, Layers, Target, Activity, Shield,
  ArrowUpRight, Minus,
} from "lucide-react";
import { PageTransition, StaggerChild, MotionCard } from "@/lib/motion";

const supabase = createClient();

function fmt(n: number): string {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function KPICard({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; trend?: "up" | "down" | "flat";
}) {
  return (
    <MotionCard className="p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4 text-copper" />
        {trend === "up" && <ArrowUpRight className="w-3.5 h-3.5 text-portal-green" />}
        {trend === "flat" && <Minus className="w-3.5 h-3.5 text-gray-500" />}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-1">{sub}</p>}
    </MotionCard>
  );
}

export default function AdminDashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ["admin-board-metrics"],
    queryFn: async () => {
      const { data } = await supabase.from("board_metrics").select("*").order("created_at", { ascending: false }).limit(1).single();
      return data as any;
    },
    enabled: !!userId,
  });

  const { data: skus } = useQuery({
    queryKey: ["admin-sku-rationalization"],
    queryFn: async () => {
      const { data } = await supabase.from("sku_rationalization").select("sku, name, category, tier, composite_score, dtc_margin").order("composite_score", { ascending: false });
      return (data ?? []) as any[];
    },
    enabled: !!userId,
  });

  const { data: alerts } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("alert_snapshots").select("*").order("created_at", { ascending: false }).limit(1).single();
      return data as any;
    },
    enabled: !!userId,
  });

  const { data: inventory } = useQuery({
    queryKey: ["admin-inventory-urgent"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_reorder").select("sku, name, po_urgency, next_order_value, stockout_risk, days_until_reorder").in("po_urgency", ["URGENT", "SOON"]).order("days_until_reorder");
      return (data ?? []) as any[];
    },
    enabled: !!userId,
  });

  const { data: skuCount } = useQuery({
    queryKey: ["admin-sku-count"],
    queryFn: async () => {
      const { count } = await supabase.from("master_skus").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
    enabled: !!userId,
  });

  const stars = skus?.filter((s: any) => s.tier === "Star") ?? [];
  const watchSunset = skus?.filter((s: any) => s.tier === "Watch" || s.tier === "Sunset") ?? [];
  const tierCounts = {
    Star: skus?.filter((s: any) => s.tier === "Star").length ?? 0,
    Core: skus?.filter((s: any) => s.tier === "Core").length ?? 0,
    Watch: skus?.filter((s: any) => s.tier === "Watch").length ?? 0,
    Sunset: skus?.filter((s: any) => s.tier === "Sunset").length ?? 0,
  };
  const alertList: any[] = alerts?.alerts ?? [];

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <StaggerChild>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">ViaConnect Admin Portal</h1>
            <p className="text-gray-400 text-sm mt-1">Financial Toolchain &middot; {skuCount ?? 62} SKUs &middot; {board?.report_quarter ?? "Q1 2026"}</p>
          </div>
          <Badge variant="active" className="bg-copper/20 text-copper">ADMIN</Badge>
        </div>
      </StaggerChild>

      {boardLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4,5,6,7,8].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : board ? (
        <StaggerChild className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={DollarSign} label="ARR" value={fmt(board.arr)} sub={`MRR: ${fmt(board.mrr)}`} trend="up" />
          <KPICard icon={BarChart3} label="Gross Margin" value={`${board.gross_margin_pct}%`} sub="Target: >75%" trend="up" />
          <KPICard icon={Users} label="LTV:CAC" value={`${board.ltv_to_cac}x`} sub={`Payback: ${board.cac_payback_months}mo`} trend="up" />
          <KPICard icon={TrendingUp} label="Rule of 40" value={`${board.rule_of_40}`} sub="Growth + Margin" trend="up" />
          <KPICard icon={DollarSign} label="Monthly FCF" value={fmt(board.monthly_fcf)} sub={`Runway: ${board.cash_runway_months}mo`} trend="up" />
          <KPICard icon={Users} label="Customers" value={board.active_customers.toLocaleString()} sub={`ARPU: $${board.arpu_monthly}`} />
          <KPICard icon={Target} label="Portfolio Health" value={`${board.portfolio_health}/100`} sub={`Rev/SKU: ${fmt(board.revenue_per_sku)}`} />
          <KPICard icon={Layers} label="Revenue Pipeline" value={fmt(board.total_revenue_pipeline)} sub="ARR + Bundles + Partners" trend="up" />
        </StaggerChild>
      ) : (
        <Card className="p-6 text-center"><p className="text-gray-400">Run <code className="text-copper">.\farmceutica.ps1 board</code> to generate metrics.</p></Card>
      )}

      <StaggerChild className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Star SKUs</h2>
            <Badge variant="active">{tierCounts.Star} Stars</Badge>
          </div>
          <div className="space-y-2">
            {stars.slice(0, 8).map((s: any) => (
              <div key={s.sku} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="min-w-0"><p className="text-xs text-white font-medium truncate">{s.name}</p><p className="text-[10px] text-gray-500">{s.category} &middot; SKU {s.sku}</p></div>
                <span className="text-xs text-portal-green font-medium ml-2">{s.composite_score}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-3 text-[10px] text-gray-500">
            <span>Core: {tierCounts.Core}</span><span>Watch: {tierCounts.Watch}</span>
            <span className={tierCounts.Sunset > 0 ? "text-rose" : ""}>Sunset: {tierCounts.Sunset}</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Active Alerts</h2>
            {alerts && <Badge variant={alerts.overall_status === "RED" ? "danger" : alerts.overall_status === "AMBER" ? "warning" : "active"}>{alerts.overall_status}</Badge>}
          </div>
          {alertList.length > 0 ? (
            <div className="space-y-2">
              {alertList.slice(0, 8).map((a: any, i: number) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
                  <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${a.severity === "CRITICAL" ? "text-rose" : "text-portal-yellow"}`} />
                  <div className="min-w-0"><p className="text-xs text-white truncate">{a.title}</p><p className="text-[10px] text-gray-500 truncate">{a.action}</p></div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-500">No active alerts</p>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Inventory Alerts</h2>
            <Badge variant={inventory && inventory.length > 0 ? "warning" : "active"}>{inventory?.length ?? 0} POs</Badge>
          </div>
          {inventory && inventory.length > 0 ? (
            <div className="space-y-2">
              {inventory.slice(0, 8).map((item: any) => (
                <div key={item.sku} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                  <div className="min-w-0"><p className="text-xs text-white font-medium truncate">{item.name}</p><p className="text-[10px] text-gray-500">{item.days_until_reorder}d until reorder</p></div>
                  <Badge variant={item.po_urgency === "URGENT" ? "danger" : "warning"}>{item.po_urgency}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-500">No urgent reorders</p>}
        </Card>
      </StaggerChild>

      {watchSunset.length > 0 && (
        <StaggerChild>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-portal-yellow" /><h2 className="text-sm font-semibold text-white">Watch &amp; Sunset SKUs</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {watchSunset.map((s: any) => (
                <div key={s.sku} className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="min-w-0"><p className="text-xs text-white font-medium truncate">{s.name}</p><p className="text-[10px] text-gray-500">{s.category} &middot; Score: {s.composite_score} &middot; DTC: {s.dtc_margin}%</p></div>
                  <Badge variant={s.tier === "Sunset" ? "danger" : "warning"}>{s.tier}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </StaggerChild>
      )}

      <StaggerChild>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Toolchain Data</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "62 Master SKUs", icon: Package },
              { label: "15 Bundles", icon: ShoppingCart },
              { label: "3-Tier Pricing", icon: DollarSign },
              { label: "5 Channel Scenarios", icon: Layers },
              { label: "12mo Forecast", icon: TrendingUp },
              { label: "12 What-If Models", icon: Activity },
              { label: "10 Suppliers", icon: Users },
              { label: "12 Promotions", icon: Target },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-sm text-gray-300">
                <item.icon className="w-4 h-4 text-copper" />{item.label}
              </div>
            ))}
          </div>
        </Card>
      </StaggerChild>
    </PageTransition>
  );
}
