"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, RefreshCw, Loader2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Brain } from "lucide-react";
import Link from "next/link";
import type { AnalyticsCategory } from "@/lib/analytics/categories";
import { getScoreColor, getScoreBgColor } from "@/lib/analytics/categories";

export default function WellnessAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState("");
  const [categories, setCategories] = useState<AnalyticsCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Try loading cached analytics first
    const { data: cached } = await supabase
      .from("wellness_analytics")
      .select("summary, categories, calculated_at")
      .eq("user_id", user.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single();

    if (cached && !isRefresh) {
      setSummary(cached.summary || "");
      setCategories((cached.categories as unknown as AnalyticsCategory[]) || []);
      setLastUpdated(cached.calculated_at);
      setLoading(false);
      return;
    }

    // Generate fresh analytics
    try {
      const res = await fetch("/api/ai/generate-wellness-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: isRefresh ? "manual" : "page_load" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || "");
        setCategories(data.categories || []);
        setLastUpdated(data.calculatedAt);
      }
    } catch { /* silent */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-sm text-white/40">Loading your wellness analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Wellness Analytics</h1>
        </div>
        <button
          onClick={() => loadAnalytics(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-sm hover:border-white/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* AI Summary Card */}
      {summary && (
        <div className="rounded-2xl p-6 bg-teal-400/5 border border-teal-400/15">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-400/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-teal-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-teal-400 mb-2">Your Health Intelligence</h2>
              <p className="text-sm text-white/70 leading-relaxed">{summary}</p>
              {lastUpdated && (
                <p className="text-xs text-white/25 mt-3">
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Grid */}
      <div>
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Analytics Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
              className={`relative rounded-2xl p-4 text-left transition-all duration-200 ${
                expandedCategory === cat.id
                  ? "bg-white/[0.08] border border-teal-400/30"
                  : "bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/15"
              }`}
            >
              {cat.isNew && (
                <span className="absolute -top-2 -right-2 text-[10px] px-2 py-0.5 rounded-full bg-teal-400 text-[#1A2744] font-bold uppercase">New</span>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{cat.icon}</span>
                <span className={`text-xl font-bold ${getScoreColor(cat.score)}`}>{cat.score}</span>
              </div>
              <h4 className="text-xs font-medium text-white/70 mb-1.5">{cat.name}</h4>
              <div className="flex items-center gap-1.5">
                {cat.trend === "improving" ? <TrendingUp className="w-3 h-3 text-teal-400" /> : cat.trend === "declining" ? <TrendingDown className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-white/25" />}
                <span className={`text-[10px] font-medium ${cat.trend === "improving" ? "text-teal-400" : cat.trend === "declining" ? "text-red-400" : "text-white/25"}`}>
                  {cat.trendDelta > 0 ? "+" : ""}{cat.trendDelta}
                </span>
                <span className="text-[10px] text-white/20 ml-auto">{cat.insightCount} insight{cat.insightCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full rounded-full ${getScoreBgColor(cat.score)} opacity-40 transition-all`} style={{ width: `${cat.dataCompleteness}%` }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Category Detail */}
      {expandedCategory && (() => {
        const cat = categories.find((c) => c.id === expandedCategory);
        if (!cat) return null;
        return (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{cat.name}</h3>
                    <p className="text-xs text-white/30">Data completeness: {cat.dataCompleteness}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-3xl font-bold ${getScoreColor(cat.score)}`}>{cat.score}</span>
                  <span className="text-sm text-white/30">/100</span>
                </div>
              </div>
            </div>

            {/* Insights */}
            {cat.insights.length > 0 && (
              <div className="p-6 border-b border-white/5">
                <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">AI Insights</h4>
                <div className="space-y-2">
                  {cat.insights.map((insight) => (
                    <div key={insight.id} className={`rounded-lg p-3 ${
                      insight.severity === "positive" ? "bg-teal-400/5 border border-teal-400/10" :
                      insight.severity === "warning" ? "bg-yellow-400/5 border border-yellow-400/10" :
                      insight.severity === "critical" ? "bg-red-400/5 border border-red-400/10" :
                      "bg-white/[0.02] border border-white/5"
                    }`}>
                      <p className="text-sm text-white/70">{insight.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {cat.recommendations.length > 0 && (
              <div className="p-6">
                <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {cat.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg p-3 bg-white/[0.02] border border-white/5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        rec.priority === "high" ? "bg-red-400/15 text-red-400" :
                        rec.priority === "medium" ? "bg-yellow-400/15 text-yellow-400" :
                        "bg-white/10 text-white/40"
                      }`}>{rec.priority}</span>
                      <p className="text-sm text-white/60">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapse button */}
            <button onClick={() => setExpandedCategory(null)} className="w-full py-3 text-xs text-white/30 hover:text-white/50 flex items-center justify-center gap-1 border-t border-white/5">
              <ChevronUp className="w-3.5 h-3.5" /> Collapse
            </button>
          </div>
        );
      })()}

      {/* Empty state */}
      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40 text-sm mb-4">Complete the Clinical Assessment Questionnaire to unlock your wellness analytics.</p>
          <Link href="/onboarding/i-caq-intro" className="px-5 py-2.5 rounded-xl bg-teal-400/10 border border-teal-400/30 text-teal-400 text-sm font-medium">Start Assessment</Link>
        </div>
      )}
    </div>
  );
}
