"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { GeneticVariant, Product } from "@/lib/supabase/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Dna,
  Search,
  Upload,
  ShoppingCart,
  ChevronRight,
} from "lucide-react";
import { PageTransition, StaggerChild, MotionCard } from "@/lib/motion";

const supabase = createClient();

const panels = [
  { id: "methylation", name: "Methylation", code: "M", color: "border-teal", bgColor: "bg-teal/10", description: "MTHFR, MTR, MTRR, COMT and folate cycle variants" },
  { id: "neurotransmitter", name: "Neurotransmitter", code: "N", color: "border-plum", bgColor: "bg-plum/10", description: "COMT, MAO-A, GAD1, BDNF and mood/cognition variants" },
  { id: "cardiovascular", name: "Cardiovascular", code: "C", color: "border-rose", bgColor: "bg-rose/10", description: "APOE, LPA, MTHFR C677T and heart-health markers" },
  { id: "detoxification", name: "Detoxification", code: "D", color: "border-copper", bgColor: "bg-copper/10", description: "GST, CYP450, NAT2 and phase I/II detox pathways" },
  { id: "inflammation", name: "Inflammation", code: "I", color: "border-portal-yellow", bgColor: "bg-portal-yellow/10", description: "IL-6, TNF-a, CRP-related SNPs and immune response" },
  { id: "complete", name: "Complete", code: "ALL", color: "border-portal-green", bgColor: "bg-portal-green/10", description: "Full GeneX360 6-panel comprehensive analysis" },
];

const riskBadge: Record<string, "active" | "pending" | "danger"> = {
  low: "active",
  moderate: "pending",
  high: "danger",
};

function GeneCard({
  gene,
  rsid,
  genotype,
  riskLevel,
  category,
  productName,
  clinicalSummary,
}: {
  gene: string;
  rsid: string;
  genotype: string;
  riskLevel: "low" | "moderate" | "high";
  category: string;
  productName: string | null;
  clinicalSummary: string | null;
}) {
  return (
    <MotionCard className="p-4 hover:border-white/[0.15]">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-white">{gene}</h4>
          <p className="text-[11px] text-gray-500 font-mono">{rsid}</p>
        </div>
        <Badge variant={riskBadge[riskLevel]}>
          {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
        </Badge>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-400">Genotype:</span>
        <span className="text-xs font-mono text-white bg-white/[0.06] px-2 py-0.5 rounded">
          {genotype}
        </span>
      </div>
      {clinicalSummary && (
        <p className="text-xs text-gray-400 mb-2 line-clamp-2">
          {clinicalSummary}
        </p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <Badge variant="neutral">{category}</Badge>
        {productName && (
          <span className="text-[10px] text-copper font-medium">{productName}</span>
        )}
      </div>
    </MotionCard>
  );
}

export default function GeneticsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState("methylation");
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  type VariantWithProduct = GeneticVariant & { product: Pick<Product, "name" | "short_name"> | null };

  const { data: variants, isLoading } = useQuery({
    queryKey: ["genetic-variants", userId, activePanel],
    queryFn: async () => {
      let query = supabase
        .from("genetic_variants")
        .select("*, product:products(name, short_name)")
        .eq("user_id", userId!);

      if (activePanel !== "complete") {
        query = query.eq("panel", activePanel);
      }

      const { data } = await query.order("risk_level", { ascending: false });
      return (data ?? []) as VariantWithProduct[];
    },
    enabled: !!userId,
  });

  const { data: panelCounts } = useQuery({
    queryKey: ["panel-risk-counts", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("genetic_variants")
        .select("panel, risk_level")
        .eq("user_id", userId!);

      const rows = (data ?? []) as Pick<GeneticVariant, "panel" | "risk_level">[];
      const counts: Record<string, { total: number; high: number; moderate: number }> = {};
      rows.forEach((v) => {
        if (!counts[v.panel]) counts[v.panel] = { total: 0, high: 0, moderate: 0 };
        counts[v.panel].total++;
        if (v.risk_level === "high") counts[v.panel].high++;
        if (v.risk_level === "moderate") counts[v.panel].moderate++;
      });
      return counts;
    },
    enabled: !!userId,
  });

  const hasData = (variants ?? []).length > 0 || Object.keys(panelCounts ?? {}).length > 0;

  const filtered = (variants ?? []).filter((v) => {
    const matchesSearch =
      !searchQuery ||
      v.gene.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.rsid.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = !riskFilter || v.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <StaggerChild>
        <h1 className="text-2xl font-bold text-white">GeneX360 Results</h1>
        <p className="text-gray-400 text-sm mt-1">
          Comprehensive SNP profiling across core metabolic pathways
        </p>
      </StaggerChild>

      <StaggerChild className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* LEFT: Panel Selector */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Panels
            </h3>
            <div className="space-y-2">
              {panels.map((panel) => {
                const counts = panelCounts?.[panel.id];
                const isActive = activePanel === panel.id;
                return (
                  <button
                    key={panel.id}
                    onClick={() => setActivePanel(panel.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isActive
                        ? `${panel.color} border-opacity-60 bg-white/[0.04]`
                        : "border-white/[0.06] hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${panel.bgColor} flex items-center justify-center`}>
                          <span className="text-xs font-bold text-white">{panel.code}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{panel.name}</p>
                          {counts ? (
                            <p className="text-[10px] text-gray-500">
                              {counts.total} variants · {counts.high} high risk
                            </p>
                          ) : (
                            <p className="text-[10px] text-gray-500">No data</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-600"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* CTA if no data */}
          {!hasData && !isLoading && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-white mb-2">
                Get Started
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Order a GENEX360 test kit or upload existing DNA data to unlock your genetic profile.
              </p>
              <div className="space-y-2">
                <Button size="sm" className="w-full gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Order Test Kit
                </Button>
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors text-sm text-gray-300 cursor-pointer justify-center">
                  <Upload className="w-4 h-4" />
                  Upload DNA Data
                  <input
                    type="file"
                    className="hidden"
                    accept=".txt,.csv,.vcf"
                    onChange={() => toast.success("Upload feature coming soon")}
                  />
                </label>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT: Gene Cards */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search gene or variant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-white placeholder:text-gray-600 bg-white/[0.04] border border-white/[0.08] focus:border-copper/50 focus:ring-1 focus:ring-copper/20 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {["all", "high", "moderate", "low"].map((level) => (
                <button
                  key={level}
                  onClick={() => setRiskFilter(level === "all" ? null : level)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    (level === "all" && !riskFilter) || riskFilter === level
                      ? "bg-copper/20 text-copper border border-copper/30"
                      : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.06]"
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Dna}
              title="No variants found"
              description={
                hasData
                  ? "Try adjusting your search or filter criteria."
                  : "Order a test or upload your data to see genetic results."
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((v) => (
                <Link key={v.id} href={`/genetics/${v.panel}`}>
                  <GeneCard
                    gene={v.gene}
                    rsid={v.rsid}
                    genotype={v.genotype}
                    riskLevel={v.risk_level}
                    category={v.category}
                    productName={v.product?.short_name ?? v.product?.name ?? null}
                    clinicalSummary={v.clinical_summary}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </StaggerChild>
    </PageTransition>
  );
}
