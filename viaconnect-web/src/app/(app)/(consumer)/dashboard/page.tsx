"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { SupplementLog, UserProtocol, Product, GeneticVariant } from "@/lib/supabase/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
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

// --- Supplement Checklist ---
function SupplementTracker({
  userId,
}: {
  userId: string;
}) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: protocol, isLoading: protocolLoading } = useQuery({
    queryKey: ["user-protocol", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_protocols")
        .select("*, product:products(*)")
        .eq("user_id", userId)
        .eq("active", true)
        .order("time_of_day");
      return (data ?? []) as (UserProtocol & { product: Product | null })[];
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["supplement-logs", userId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("supplement_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", `${today}T00:00:00`)
        .lte("logged_at", `${today}T23:59:59`);
      return (data ?? []) as SupplementLog[];
    },
  });

  const logMutation = useMutation({
    mutationFn: async ({
      productId,
      timeOfDay,
      dose,
    }: {
      productId: string;
      timeOfDay: string;
      dose: string;
    }) => {
      const { error } = await supabase.from("supplement_logs").insert({
        user_id: userId,
        product_id: productId,
        time_of_day: timeOfDay as "morning" | "noon" | "evening" | "bedtime",
        dose,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplement-logs"] });
      queryClient.invalidateQueries({ queryKey: ["farma-tokens"] });
      toast.success("+5 ViaTokens earned!");
    },
    onError: () => {
      toast.error("Failed to log supplement");
    },
  });

  const loggedIds = new Set((logs ?? []).map((l: SupplementLog) => l.product_id));

  // Weekly streak
  const streakDays = ["M", "T", "W", "T", "F", "S", "S"];
  const dayOfWeek = new Date().getDay();

  if (protocolLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const items = protocol ?? [];

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <FlaskConical className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No supplements in your protocol yet.</p>
        <Link href="/supplements" className="text-copper text-sm hover:underline mt-2 inline-block">
          Browse supplements
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        Today&apos;s Supplements
      </h3>
      <div className="space-y-2">
        {items.map((item) => {
          const product = item.product;
          const checked = loggedIds.has(item.product_id);
          const timeLabels: Record<string, string> = {
            morning: "AM",
            noon: "Noon",
            evening: "PM",
            bedtime: "Night",
          };
          return (
            <button
              key={item.id}
              onClick={() => {
                if (!checked) {
                  logMutation.mutate({
                    productId: item.product_id,
                    timeOfDay: item.time_of_day,
                    dose: item.dose,
                  });
                }
              }}
              disabled={checked}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                checked
                  ? "border-portal-green/20 bg-portal-green/5"
                  : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              {checked ? (
                <CheckCircle2 className="w-5 h-5 text-portal-green flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-600 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${checked ? "text-gray-500 line-through" : "text-white"}`}>
                  {product?.short_name ?? product?.name ?? "Supplement"}
                </p>
                <p className="text-xs text-gray-500">{item.dose}</p>
              </div>
              <Badge variant={checked ? "active" : "neutral"}>
                {timeLabels[item.time_of_day] ?? item.time_of_day}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Weekly streak */}
      <div className="pt-4 border-t border-white/[0.06]">
        <p className="text-xs text-gray-500 mb-2">Weekly Streak</p>
        <div className="flex gap-2">
          {streakDays.map((d, i) => {
            const adjustedDay = i === 6 ? 0 : i + 1;
            const isPast = adjustedDay < dayOfWeek;
            const isToday = adjustedDay === dayOfWeek;
            return (
              <div
                key={i}
                className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                  isToday
                    ? "bg-copper/20 text-copper border border-copper/30"
                    : isPast
                      ? "bg-portal-green/10 text-portal-green"
                      : "bg-white/[0.03] text-gray-600"
                }`}
              >
                {d}
              </div>
            );
          })}
        </div>
      </div>
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
        .from("health_scores")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data as { id: string; score: number; created_at: string | null } | null;
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

  const score = healthScore?.score ?? 0;
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
    <PageTransition className="p-6 lg:p-8 space-y-6">
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
      <StaggerChild className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-6">
        {/* LEFT: Vitality Score */}
        <div className="space-y-4">
          <Card className="p-6">
            <VitalityGauge score={score} loading={scoreLoading} />
            {sparkData.length > 1 && (
              <div className="mt-6">
                <p className="text-xs text-gray-500 mb-2">30-Day Trend</p>
                <Sparkline data={sparkData} />
              </div>
            )}
            {!scoreLoading && score === 0 && (
              <div className="mt-4 text-center">
                <p className="text-gray-500 text-xs">Complete your assessment to unlock your score</p>
                <Link href="/profile/assessment" className="text-copper text-xs hover:underline mt-1 inline-block">
                  Take Assessment
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* CENTER: Supplement Tracker */}
        <div className="space-y-4">
          <Card className="p-6">
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
        </div>

        {/* RIGHT: Tokens + Insights + Quick Actions */}
        <div className="space-y-4">
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
