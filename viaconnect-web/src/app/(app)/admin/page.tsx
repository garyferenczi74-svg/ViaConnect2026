"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3, Package, TrendingUp, Users, AlertTriangle,
  Star, Eye, Sunset, Layers, DollarSign, Percent, ArrowUpRight,
  ArrowDownRight, ShieldAlert, CheckCircle2, Info, Truck,
} from "lucide-react";

const supabase = createClient();

// ─── Types ───────────────────────────────────────────────────────────────────

interface SKU {
  sku: string; name: string; category: string; msrp: number; cogs: number;
  dtc_margin: number; composite_score: number; tier: string; actions: string[];
  cogs_ratio: number; viable_channels: number;
  score_dtc_margin: number; score_channel_breadth: number; score_cogs_efficiency: number;
  score_waterfall_health: number; score_revenue_contribution: number; score_price_point: number;
}

interface Supplier {
  supplier: string; region: string; risk_tier: string; composite_score: number;
  annual_spend: number; sku_count: number; lead_time_days: number;
  recommendations: string[];
}

interface Bundle {
  bundle_name: string; strategy: string; description: string; target_audience: string;
  sku_count: number; star_count: number; avg_composite_score: number; quality_flag: string;
  individual_total: number; discount_rate: number; bundle_price: number; customer_savings: number;
  bundle_dtc_margin: number; total_cogs: number; monthly_revenue: number;
  monthly_gross_profit: number; annual_bundle_revenue: number; annual_gross_profit: number;
}

interface Forecast {
  forecast_month: string; label: string; total_revenue: number; cogs: number;
  gross_profit: number; net_profit: number; net_margin_pct: number;
  dtc_revenue: number; ws_revenue: number; dist_revenue: number;
  cumulative_revenue: number; cumulative_net_profit: number;
}

interface Promo {
  promotion: string; code: string; type: string; baseline_revenue: number;
  promo_revenue: number; revenue_delta: number; promo_gross_profit: number;
  marketing_cost: number; volume_lift: number; roi: number; rating: string;
  net_new_customers: number; effective_cac: number;
}

interface ExecRec {
  priority: number; area: string; recommendation: string; impact: string;
}

type Tab = "overview" | "skus" | "bundles" | "suppliers" | "forecast" | "promos";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtD = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtP = (n: number) => n.toFixed(1) + "%";

const TIER_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  Star: { bg: "bg-amber-500/15", text: "text-amber-400", icon: Star },
  Core: { bg: "bg-blue-500/15", text: "text-blue-400", icon: Layers },
  Watch: { bg: "bg-orange-500/15", text: "text-orange-400", icon: Eye },
  Sunset: { bg: "bg-red-500/15", text: "text-red-400", icon: Sunset },
};

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  LOW: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  MODERATE: { bg: "bg-amber-500/15", text: "text-amber-400" },
  ELEVATED: { bg: "bg-red-500/15", text: "text-red-400" },
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [skus, setSkus] = useState<SKU[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [execRecs, setExecRecs] = useState<ExecRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    async function load() {
      const [skuRes, suppRes, bundleRes, forecastRes, promoRes, execRes] = await Promise.all([
        supabase.from("sku_rationalization").select("*").order("composite_score", { ascending: false }),
        supabase.from("supplier_scorecard").select("*").order("composite_score", { ascending: false }),
        supabase.from("bundles").select("*").order("annual_gross_profit", { ascending: false }),
        supabase.from("forecast_monthly").select("*").order("forecast_month", { ascending: true }),
        supabase.from("promotion_roi").select("*").order("roi", { ascending: false }),
        supabase.from("executive_recommendations").select("*").order("priority", { ascending: true }),
      ]);
      if (skuRes.data) setSkus(skuRes.data);
      if (suppRes.data) setSuppliers(suppRes.data);
      if (bundleRes.data) setBundles(bundleRes.data);
      if (forecastRes.data) setForecasts(forecastRes.data);
      if (promoRes.data) setPromos(promoRes.data);
      if (execRes.data) setExecRecs(execRes.data);
      setLoading(false);
    }
    load();
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-copper/20 flex items-center justify-center mx-auto">
            <BarChart3 className="w-8 h-8 text-copper" />
          </div>
          <h1 className="text-xl font-bold text-white">Desktop Only</h1>
          <p className="text-gray-400 text-sm">
            The FarmCeutica Admin Dashboard requires a desktop display (1024px+) for full analytics visibility.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-copper border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading financial data...</span>
        </div>
      </div>
    );
  }

  // ─── Computed Metrics ────────────────────────────────────────────────────

  const tierCounts = skus.reduce<Record<string, number>>((acc, s) => { acc[s.tier] = (acc[s.tier] || 0) + 1; return acc; }, {});
  const avgMargin = skus.length ? skus.reduce((s, sk) => s + Number(sk.dtc_margin), 0) / skus.length : 0;
  const avgComposite = skus.length ? skus.reduce((s, sk) => s + Number(sk.composite_score), 0) / skus.length : 0;
  const totalAnnualRevenue = forecasts.reduce((s, f) => s + Number(f.total_revenue), 0);
  const totalNetProfit = forecasts.reduce((s, f) => s + Number(f.net_profit), 0);
  const totalSupplierSpend = suppliers.reduce((s, sp) => s + Number(sp.annual_spend), 0);
  const bundleRevenue = bundles.reduce((s, b) => s + Number(b.annual_bundle_revenue), 0);

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Executive Overview", icon: BarChart3 },
    { key: "skus", label: "SKU Rationalization", icon: Package },
    { key: "bundles", label: "Bundles", icon: Layers },
    { key: "suppliers", label: "Supply Chain", icon: Truck },
    { key: "forecast", label: "Forecast", icon: TrendingUp },
    { key: "promos", label: "Promotions", icon: Percent },
  ];

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">FarmCeutica Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Build FarmCeutica SKU — Financial Analytics & Portfolio Intelligence</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{skus.length} SKUs</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-copper/20 text-copper">ADMIN ONLY</span>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-white/[0.06] px-8">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-copper text-copper"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6 space-y-6">

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === "overview" && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-6 gap-4">
              {[
                { label: "Total SKUs", value: String(skus.length), icon: Package, color: "text-white" },
                { label: "Avg Composite", value: fmtP(avgComposite), icon: BarChart3, color: "text-cyan-400" },
                { label: "Avg DTC Margin", value: fmtP(avgMargin), icon: DollarSign, color: "text-emerald-400" },
                { label: "Annual Revenue", value: fmtD(totalAnnualRevenue), icon: TrendingUp, color: "text-amber-400" },
                { label: "Net Profit", value: fmtD(totalNetProfit), icon: ArrowUpRight, color: "text-emerald-400" },
                { label: "Bundle Revenue", value: fmtD(bundleRevenue), icon: Layers, color: "text-purple-400" },
              ].map((kpi) => (
                <div key={kpi.label} className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    <span className="text-xs text-gray-500">{kpi.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Tier Distribution + Exec Recommendations */}
            <div className="grid grid-cols-3 gap-6">
              {/* Tier Breakdown */}
              <div className="glass rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Portfolio Tier Distribution</h3>
                {["Star", "Core", "Watch", "Sunset"].map((tier) => {
                  const cfg = TIER_COLORS[tier];
                  const Icon = cfg.icon;
                  const count = tierCounts[tier] || 0;
                  const pct = skus.length ? (count / skus.length) * 100 : 0;
                  return (
                    <div key={tier} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${cfg.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${cfg.text}`}>{tier}</span>
                          <span className="text-xs text-gray-500">{count} SKUs ({fmtP(pct)})</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06]">
                          <div className={`h-full rounded-full ${cfg.bg.replace("/15", "/50")}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Executive Recommendations */}
              <div className="col-span-2 glass rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Executive Recommendations</h3>
                <div className="space-y-2">
                  {execRecs.map((rec) => (
                    <div key={rec.priority} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <div className="w-7 h-7 rounded-full bg-copper/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-copper">{rec.priority}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-copper uppercase">{rec.area}</span>
                        </div>
                        <p className="text-sm text-white">{rec.recommendation}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{rec.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Star SKUs + Supplier Risk */}
            <div className="grid grid-cols-2 gap-6">
              <div className="glass rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Star Tier SKUs</h3>
                <div className="space-y-2">
                  {skus.filter(s => s.tier === "Star").map((s) => (
                    <div key={s.sku} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{s.name}</p>
                        <p className="text-xs text-gray-500">SKU {s.sku} &middot; {s.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-bold text-amber-400">{Number(s.composite_score).toFixed(1)}</p>
                        <p className="text-[10px] text-gray-500">{fmtP(Number(s.dtc_margin))} margin</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Supplier Risk Overview</h3>
                <div className="space-y-2">
                  {suppliers.map((s) => {
                    const cfg = RISK_COLORS[s.risk_tier] || RISK_COLORS.MODERATE;
                    return (
                      <div key={s.supplier} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{s.supplier}</p>
                          <p className="text-xs text-gray-500">{s.region} &middot; {s.sku_count} SKUs</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {s.risk_tier}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══ SKU RATIONALIZATION TAB ═══ */}
        {tab === "skus" && (
          <div className="glass rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">SKU Portfolio — {skus.length} Products</h3>
              <div className="flex gap-2">
                {["Star", "Core", "Watch", "Sunset"].map((tier) => {
                  const cfg = TIER_COLORS[tier];
                  return (
                    <span key={tier} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                      {tier}: {tierCounts[tier] || 0}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["SKU", "Product", "Category", "MSRP", "COGS", "DTC Margin", "Composite", "Tier", "Channels", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {skus.map((s) => {
                    const cfg = TIER_COLORS[s.tier] || TIER_COLORS.Core;
                    const Icon = cfg.icon;
                    return (
                      <tr key={s.sku} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{s.sku}</td>
                        <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">{s.name}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{s.category}</td>
                        <td className="px-4 py-3 text-white font-mono">${Number(s.msrp).toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono">${Number(s.cogs).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={Number(s.dtc_margin) >= 80 ? "text-emerald-400" : Number(s.dtc_margin) >= 60 ? "text-amber-400" : "text-red-400"}>
                            {fmtP(Number(s.dtc_margin))}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 rounded-full bg-white/[0.06]">
                              <div className={`h-full rounded-full ${Number(s.composite_score) >= 75 ? "bg-emerald-500" : Number(s.composite_score) >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Number(s.composite_score)}%` }} />
                            </div>
                            <span className="text-xs font-mono text-white">{Number(s.composite_score).toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                            <Icon className="w-3 h-3" />
                            {s.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-400">{s.viable_channels}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[250px] truncate">{(s.actions || []).join("; ")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ BUNDLES TAB ═══ */}
        {tab === "bundles" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Total Bundles</p>
                <p className="text-2xl font-bold text-white mt-1">{bundles.length}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Annual Bundle Revenue</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{fmtD(bundleRevenue)}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Annual Gross Profit</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{fmtD(bundles.reduce((s, b) => s + Number(b.annual_gross_profit), 0))}</p>
              </div>
            </div>
            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Bundle", "Strategy", "SKUs", "Stars", "Price", "Margin", "Monthly Rev", "Annual Rev", "Annual GP", "Quality"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bundles.map((b) => (
                      <tr key={b.bundle_name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{b.bundle_name}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{b.strategy}</td>
                        <td className="px-4 py-3 text-center text-xs">{b.sku_count}</td>
                        <td className="px-4 py-3 text-center text-xs text-amber-400">{b.star_count}</td>
                        <td className="px-4 py-3 font-mono text-white">${Number(b.bundle_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-emerald-400">{fmtP(Number(b.bundle_dtc_margin))}</td>
                        <td className="px-4 py-3 font-mono text-gray-300">{fmtD(Number(b.monthly_revenue))}</td>
                        <td className="px-4 py-3 font-mono text-white">{fmtD(Number(b.annual_bundle_revenue))}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400">{fmtD(Number(b.annual_gross_profit))}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.quality_flag === "PREMIUM" ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"}`}>
                            {b.quality_flag}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SUPPLIERS TAB ═══ */}
        {tab === "suppliers" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Total Suppliers</p>
                <p className="text-2xl font-bold text-white mt-1">{suppliers.length}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Annual Spend</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{fmtD(totalSupplierSpend)}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Low Risk</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{suppliers.filter(s => s.risk_tier === "LOW").length}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Elevated Risk</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{suppliers.filter(s => s.risk_tier === "ELEVATED").length}</p>
              </div>
            </div>
            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Supplier", "Region", "Lead Time", "SKUs", "Annual Spend", "Score", "Risk", "Recommendations"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => {
                      const cfg = RISK_COLORS[s.risk_tier] || RISK_COLORS.MODERATE;
                      return (
                        <tr key={s.supplier} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-white font-medium">{s.supplier}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{s.region}</td>
                          <td className="px-4 py-3 text-xs">{s.lead_time_days} days</td>
                          <td className="px-4 py-3 text-center text-xs">{s.sku_count}</td>
                          <td className="px-4 py-3 font-mono text-white">{fmtD(Number(s.annual_spend))}</td>
                          <td className="px-4 py-3 font-mono text-xs">{Number(s.composite_score).toFixed(1)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{s.risk_tier}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[300px] truncate">{(s.recommendations || []).join("; ")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ FORECAST TAB ═══ */}
        {tab === "forecast" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">12-Month Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">{fmtD(totalAnnualRevenue)}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">12-Month Net Profit</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{fmtD(totalNetProfit)}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Avg Net Margin</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{fmtP(forecasts.length ? forecasts.reduce((s, f) => s + Number(f.net_margin_pct), 0) / forecasts.length : 0)}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Cumulative Profit</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{fmtD(Number(forecasts[forecasts.length - 1]?.cumulative_net_profit || 0))}</p>
              </div>
            </div>
            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Month", "Total Revenue", "DTC", "Wholesale", "Distributor", "COGS", "Gross Profit", "Net Profit", "Net Margin", "Cumulative Rev"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {forecasts.map((f) => (
                      <tr key={f.forecast_month} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-white font-medium">{f.label}</td>
                        <td className="px-4 py-3 font-mono text-white">{fmtD(Number(f.total_revenue))}</td>
                        <td className="px-4 py-3 font-mono text-cyan-400 text-xs">{fmtD(Number(f.dtc_revenue))}</td>
                        <td className="px-4 py-3 font-mono text-blue-400 text-xs">{fmtD(Number(f.ws_revenue))}</td>
                        <td className="px-4 py-3 font-mono text-purple-400 text-xs">{fmtD(Number(f.dist_revenue))}</td>
                        <td className="px-4 py-3 font-mono text-red-400 text-xs">{fmtD(Number(f.cogs))}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400">{fmtD(Number(f.gross_profit))}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">{fmtD(Number(f.net_profit))}</td>
                        <td className="px-4 py-3">
                          <span className={Number(f.net_margin_pct) >= 20 ? "text-emerald-400" : Number(f.net_margin_pct) >= 10 ? "text-amber-400" : "text-red-400"}>
                            {fmtP(Number(f.net_margin_pct))}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-400">{fmtD(Number(f.cumulative_revenue))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PROMOTIONS TAB ═══ */}
        {tab === "promos" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Active Promotions</p>
                <p className="text-2xl font-bold text-white mt-1">{promos.length}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Total Promo Revenue</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{fmtD(promos.reduce((s, p) => s + Number(p.promo_revenue), 0))}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Excellent ROI</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{promos.filter(p => p.rating === "EXCELLENT").length}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-gray-500">Negative ROI</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{promos.filter(p => p.rating === "NEGATIVE").length}</p>
              </div>
            </div>
            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Promotion", "Code", "Type", "Baseline Rev", "Promo Rev", "Delta", "Volume Lift", "ROI", "New Customers", "CAC", "Rating"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {promos.map((p) => (
                      <tr key={p.code} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{p.promotion}</td>
                        <td className="px-4 py-3 font-mono text-xs text-copper">{p.code}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{p.type}</td>
                        <td className="px-4 py-3 font-mono text-gray-400">{fmtD(Number(p.baseline_revenue))}</td>
                        <td className="px-4 py-3 font-mono text-white">{fmtD(Number(p.promo_revenue))}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 ${Number(p.revenue_delta) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {Number(p.revenue_delta) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {fmtD(Math.abs(Number(p.revenue_delta)))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{fmtP(Number(p.volume_lift))}</td>
                        <td className="px-4 py-3 font-mono font-semibold">
                          <span className={Number(p.roi) >= 1 ? "text-emerald-400" : "text-red-400"}>{Number(p.roi).toFixed(2)}x</span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs">{fmt(Number(p.net_new_customers))}</td>
                        <td className="px-4 py-3 font-mono text-xs">{fmtD(Number(p.effective_cac))}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            p.rating === "EXCELLENT" ? "bg-emerald-500/15 text-emerald-400" :
                            p.rating === "GOOD" ? "bg-blue-500/15 text-blue-400" :
                            p.rating === "NEGATIVE" ? "bg-red-500/15 text-red-400" :
                            "bg-amber-500/15 text-amber-400"
                          }`}>
                            {p.rating}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
