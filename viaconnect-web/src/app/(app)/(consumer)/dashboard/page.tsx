"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { GeneticVariant } from "@/lib/supabase/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import VitalityScoreGauge from "@/components/VitalityScoreGauge";
import SupplementProtocol from "@/components/SupplementProtocol";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Dna,
  CheckCircle2,
  Circle,
  Coins,
  FlaskConical,
  MessageSquare,
  FileText,
} from "lucide-react";
import { PageTransition, StaggerChild, MotionCard } from "@/lib/motion";

const supabase = createClient();

// --- Vitality Score Gauge ---
function VitalityGauge({ score, loading }: { score: number; loading: boolean }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 90;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  useEffect(() => {
    if (!loading && score > 0) {
      let current = 0;
      const step = score / 60;
      const timer = setInterval(() => {
        current += step;
        if (current >= score) {
          setAnimatedScore(score);
          clearInterval(timer);
        } else {
          setAnimatedScore(Math.round(current));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [score, loading]);

  const getColor = (s: number) => {
    if (s >= 75) return "#4ADE80";
    if (s >= 50) return "#FBBF24";
    if (s >= 25) return "#F472B6";
    return "#EF4444";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="w-[220px] h-[220px] rounded-full" />
        <Skeleton className="w-32 h-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[220px] h-[220px]">
        <svg width="220" height="220" className="transform -rotate-90">
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke={getColor(animatedScore)}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-white">{animatedScore}</span>
          <span className="text-xs text-gray-400 mt-1">Vitality Score</span>
        </div>
      </div>
    </div>
  );
}

// --- Sparkline ---
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 280;
  const h = 60;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="w-full">
      <polyline
        points={points}
        fill="none"
        stroke="#4ADE80"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Supplement Checklist (reads from recommendations table) ---
function SupplementTracker({
  userId,
}: {
  userId: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: recommendations, isLoading: recsLoading, refetch } = useQuery({
    queryKey: ["recommendations", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recommendations")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "recommended")
        .order("priority_rank");
      return (data ?? []) as Array<{
        id: string; sku: string; product_name: string; category: string | null;
        reason: string; confidence_score: number; confidence_level: string;
        priority_rank: number; dosage: string | null; frequency: string | null;
        time_of_day: string | null; monthly_price: number | null; source: string;
      }>;
    },
  });

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      toast.loading("Generating your protocol...", { id: "gen-recs" });
      const res = await fetch("/api/recommendations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.recommendations_count} supplements recommended!`, { id: "gen-recs" });
        refetch();
      } else {
        toast.error("Could not generate recommendations", { id: "gen-recs" });
      }
    } catch {
      toast.error("Failed to generate protocol", { id: "gen-recs" });
    } finally {
      setIsGenerating(false);
    }
  }, [refetch]);

  if (recsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const items = recommendations ?? [];

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <FlaskConical className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No supplements in your protocol yet.</p>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="mt-3 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate My Protocol"}
        </button>
        <Link href="/supplements" className="text-copper text-sm hover:underline mt-3 block">
          Browse supplements
        </Link>
      </div>
    );
  }

  // Group by time_of_day
  const groups: Record<string, typeof items> = {};
  for (const item of items) {
    const tod = item.time_of_day || "morning";
    if (!groups[tod]) groups[tod] = [];
    groups[tod].push(item);
  }

  const timeOrder = ["morning", "afternoon", "evening"];
  const timeLabels: Record<string, string> = {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
  };
  const timeColors: Record<string, string> = {
    morning: "text-amber-400",
    afternoon: "text-cyan-400",
    evening: "text-purple-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Your Protocol
        </h3>
        <span className="text-xs text-gray-500">{items.length} supplements</span>
      </div>
      {timeOrder.map((tod) => {
        const group = groups[tod];
        if (!group || group.length === 0) return null;
        return (
          <div key={tod}>
            <p className={`text-xs font-semibold mb-2 ${timeColors[tod] || "text-gray-400"}`}>
              {timeLabels[tod] || tod}
            </p>
            <div className="space-y-2">
              {group.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02]"
                >
                  <Circle className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.dosage || "As directed"} &middot; {item.frequency || "daily"}
                    </p>
                  </div>
                  {item.monthly_price && (
                    <span className="text-xs text-gray-500">${item.monthly_price}/mo</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <Link
        href="/checkout"
        className="block w-full text-center py-2.5 rounded-lg bg-copper/10 text-copper text-sm font-medium hover:bg-copper/20 transition-colors"
      >
        Order Protocol &rarr;
      </Link>
    </div>
  );
}

// --- Main Dashboard ---
export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("there");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setDisplayName(
          user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "there"
        );
      }
    });
  }, []);

  const { data: healthScore, isLoading: scoreLoading } = useQuery({
    queryKey: ["health-score", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("vitality_score, assessment_completed")
        .eq("id", userId!)
        .single();
      return data as { vitality_score: number | null; assessment_completed: boolean | null } | null;
    },
    enabled: !!userId,
  });

  const { data: scoreHistory } = useQuery({
    queryKey: ["score-history", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("health_scores")
        .select("score, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true })
        .limit(30);
      return (data ?? []) as { score: number; created_at: string | null }[];
    },
    enabled: !!userId,
  });

  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ["farma-tokens", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("farma_tokens")
        .select("*")
        .eq("user_id", userId!)
        .single();
      return data as { balance: number; lifetime_earned: number } | null;
    },
    enabled: !!userId,
  });

  const { data: variants } = useQuery({
    queryKey: ["top-variants", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("genetic_variants")
        .select("*")
        .eq("user_id", userId!)
        .eq("risk_level", "high")
        .limit(3);
      return (data ?? []) as GeneticVariant[];
    },
    enabled: !!userId,
  });

  const score = healthScore?.vitality_score ?? 0;
  const sparkData = (scoreHistory ?? []).map((s) => s.score);
  const balance = tokens?.balance ?? 0;

  const getTier = useCallback((b: number) => {
    if (b >= 10000) return { name: "Platinum", color: "text-portal-purple" };
    if (b >= 5000) return { name: "Gold", color: "text-portal-yellow" };
    if (b >= 1000) return { name: "Silver", color: "text-gray-300" };
    return { name: "Bronze", color: "text-copper" };
  }, []);

  const tier = getTier(balance);

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      {/* Welcome */}
      <StaggerChild>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, <span className="text-copper">{displayName}</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Personal Wellness Dashboard
        </p>
      </StaggerChild>

      {/* 3-column layout */}
      <StaggerChild className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[300px_1fr_300px] gap-4 sm:gap-6">
        {/* LEFT: Vitality Score */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-6">
            <VitalityScoreGauge />
            {sparkData.length > 1 && (
              <div className="mt-4 sm:mt-6">
                <p className="text-xs text-gray-500 mb-2">30-Day Trend</p>
                <Sparkline data={sparkData} />
              </div>
            )}
          </Card>
        </div>

        {/* CENTER: Supplement Tracker + Protocol */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-6">
            {userId ? (
              <SupplementTracker userId={userId} />
            ) : (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            )}
          </Card>
          <Card className="p-4 sm:p-6">
            <SupplementProtocol />
          </Card>
        </div>

        {/* RIGHT: Tokens + Insights + Quick Actions */}
        <div className="space-y-4 md:col-span-2 xl:col-span-1">
          {/* ViaTokens */}
          <MotionCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-portal-yellow" />
                <span className="text-sm font-medium text-white">ViaTokens</span>
              </div>
              <Badge variant={balance >= 5000 ? "active" : "pending"}>
                <span className={tier.color}>{tier.name}</span>
              </Badge>
            </div>
            {tokensLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <p className="text-3xl font-bold text-white">
                {balance.toLocaleString()}{" "}
                <span className="text-sm text-gray-400 font-normal">VT</span>
              </p>
            )}
            <Link
              href="/tokens"
              className="text-xs text-copper hover:underline mt-2 inline-block"
            >
              View wallet &rarr;
            </Link>
          </MotionCard>

          {/* Genetic Insights */}
          <MotionCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Dna className="w-4 h-4 text-teal" />
              <span className="text-sm font-medium text-white">Genetic Insights</span>
            </div>
            {(variants ?? []).length === 0 ? (
              <p className="text-gray-500 text-xs">
                No genetic data yet. Order a test to unlock insights.
              </p>
            ) : (
              <div className="space-y-2">
                {(variants ?? []).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
                  >
                    <div>
                      <p className="text-xs text-white font-medium">{v.gene}</p>
                      <p className="text-[10px] text-gray-500">{v.rsid}</p>
                    </div>
                    <Badge variant="danger">High Risk</Badge>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/genetics"
              className="text-xs text-copper hover:underline mt-2 inline-block"
            >
              View all panels &rarr;
            </Link>
          </MotionCard>

          {/* Quick Actions */}
          <MotionCard className="p-5">
            <p className="text-sm font-medium text-white mb-3">Quick Actions</p>
            <div className="space-y-2">
              <Link
                href="/supplements"
                className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors text-sm text-gray-300"
              >
                <FlaskConical className="w-4 h-4 text-copper" />
                Order Test Kit
              </Link>
              <Link
                href="/messages"
                className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors text-sm text-gray-300"
              >
                <MessageSquare className="w-4 h-4 text-plum" />
                Message Practitioner
              </Link>
              <Link
                href="/supplements"
                className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors text-sm text-gray-300"
              >
                <FileText className="w-4 h-4 text-sage" />
                View Protocol
              </Link>
            </div>
          </MotionCard>
        </div>
      </StaggerChild>
    </PageTransition>
  );
}
