"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GeneticVariant, Product } from "@/lib/supabase/types";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Dna,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Plus,
} from "lucide-react";

const supabase = createClient();

const panelMeta: Record<string, { name: string; description: string }> = {
  methylation: { name: "Methylation", description: "MTHFR, MTR, MTRR, COMT and folate cycle variants affecting methyl-group donation." },
  detoxification: { name: "Detoxification", description: "GST, CYP450, NAT2 and phase I/II pathways governing toxin clearance." },
  neurotransmitter: { name: "Neurotransmitter", description: "COMT, MAO-A, GAD1, BDNF variants influencing mood, focus and cognition." },
  hormone: { name: "Hormone", description: "CYP19A1, SRD5A2, VDR and endocrine SNPs impacting hormone metabolism." },
  cardiovascular: { name: "Cardiovascular", description: "APOE, LPA, MTHFR C677T and lipid/homocysteine markers for heart health." },
  mitochondrial: { name: "Mitochondrial", description: "SOD2, NRF2, PGC-1a variants related to cellular energy and oxidative stress." },
  inflammation: { name: "Inflammation", description: "IL-6, TNF-a, CRP-related SNPs and immune/inflammatory response." },
};

type SortKey = "gene" | "risk_level" | "category";
type SortDir = "asc" | "desc";

const riskOrder = { high: 0, moderate: 1, low: 2 };
const riskBadgeVariant: Record<string, "active" | "pending" | "danger"> = {
  low: "active",
  moderate: "pending",
  high: "danger",
};

export default function PanelDeepDivePage({
  params,
}: {
  params: { panelId: string };
}) {
  const { panelId } = params;
  const panel = panelMeta[panelId] ?? { name: panelId, description: "Genetic panel data" };

  const [userId, setUserId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("risk_level");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  type VariantWithProduct = GeneticVariant & { product: Pick<Product, "id" | "name" | "short_name" | "price"> | null };

  const { data: variants, isLoading } = useQuery({
    queryKey: ["panel-variants", userId, panelId],
    queryFn: async () => {
      const { data } = await supabase
        .from("genetic_variants")
        .select("*, product:products(id, name, short_name, price)")
        .eq("user_id", userId!)
        .eq("panel", panelId);
      return (data ?? []) as VariantWithProduct[];
    },
    enabled: !!userId,
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...(variants ?? [])].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "risk_level") {
      cmp = (riskOrder[a.risk_level as keyof typeof riskOrder] ?? 2) - (riskOrder[b.risk_level as keyof typeof riskOrder] ?? 2);
    } else {
      cmp = (a[sortKey] ?? "").localeCompare(b[sortKey] ?? "");
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/dashboard" className="text-copper hover:underline">Dashboard</Link>
        <span>/</span>
        <Link href="/genetics" className="text-copper hover:underline">GeneX360</Link>
        <span>/</span>
        <span className="text-white">{panel.name}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">{panel.name} Panel</h1>
        <p className="text-gray-400 text-sm mt-1">{panel.description}</p>
      </div>

      {/* Summary Stats */}
      {!isLoading && sorted.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {(["high", "moderate", "low"] as const).map((level) => {
            const count = sorted.filter((v) => v.risk_level === level).length;
            const colors = {
              high: { bg: "bg-rose/10", text: "text-rose", border: "border-rose/20" },
              moderate: { bg: "bg-portal-yellow/10", text: "text-portal-yellow", border: "border-portal-yellow/20" },
              low: { bg: "bg-portal-green/10", text: "text-portal-green", border: "border-portal-green/20" },
            };
            return (
              <Card key={level} className={`p-4 border ${colors[level].border}`}>
                <p className={`text-2xl font-bold ${colors[level].text}`}>{count}</p>
                <p className="text-xs text-gray-400 capitalize">{level} Risk</p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Data Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Dna}
            title="No variants for this panel"
            description="Upload your genetic data or order a GENEX360 test to see results."
            actionLabel="Order Test Kit"
            onAction={() => toast.success("Redirecting to order page...")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="py-3 px-4 font-medium text-xs">
                    <SortHeader label="Gene" field="gene" />
                  </th>
                  <th className="py-3 px-4 font-medium text-xs text-gray-400">Variant</th>
                  <th className="py-3 px-4 font-medium text-xs text-gray-400">Genotype</th>
                  <th className="py-3 px-4 font-medium text-xs">
                    <SortHeader label="Risk" field="risk_level" />
                  </th>
                  <th className="py-3 px-4 font-medium text-xs">
                    <SortHeader label="Category" field="category" />
                  </th>
                  <th className="py-3 px-4 font-medium text-xs text-gray-400">Product</th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((v) => {
                  const isExpanded = expandedId === v.id;
                  return (
                    <React.Fragment key={v.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : v.id)}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-white font-medium">{v.gene}</td>
                        <td className="py-3 px-4 font-mono text-gray-400 text-xs">{v.rsid}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-white bg-white/[0.06] px-2 py-0.5 rounded">
                            {v.genotype}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={riskBadgeVariant[v.risk_level]}>
                            {v.risk_level.charAt(0).toUpperCase() + v.risk_level.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="neutral">{v.category}</Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-copper">
                          {v.product?.short_name ?? v.product?.name ?? "\u2014"}
                        </td>
                        <td className="py-3 px-4">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-white/[0.01]">
                          <td colSpan={7} className="px-4 py-5">
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Clinical Summary</p>
                                  <p className="text-sm text-gray-300">
                                    {v.clinical_summary ?? "Detailed clinical information will be available after full analysis."}
                                  </p>
                                </div>
                                {v.product && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Recommended Supplement</p>
                                    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                                      <div className="w-10 h-10 rounded-lg bg-copper/10 flex items-center justify-center">
                                        <span className="text-copper text-xs font-bold">Rx</span>
                                      </div>
                                      <div>
                                        <p className="text-sm text-white font-medium">
                                          {v.product.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          ${v.product.price?.toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  className="gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.success("Added to protocol");
                                  }}
                                >
                                  <Plus className="w-3 h-3" />
                                  Add to Protocol
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
