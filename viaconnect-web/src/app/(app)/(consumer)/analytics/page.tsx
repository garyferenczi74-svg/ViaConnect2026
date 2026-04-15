"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { SupplementLog, GeneticVariant } from "@/lib/supabase/types";
import type { DashboardSupplement } from "@/hooks/useUserDashboardData";
import { supplementSlug } from "@/lib/protocolSlot";
import { Card } from "@/components/ui/Card";
import { MobileHeroBackground } from "@/components/ui/MobileHeroBackground";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Pill,
  Calendar,
  Target,
  Flame,
  Dna,
  Moon,
  Brain,
  Heart,
  Zap,
  Droplets,
  Shield,
  CheckCircle,
  Clock,
  Award,
  RefreshCw,
} from "lucide-react";
import { PageTransition, StaggerChild, MotionCard, ChartReveal } from "@/lib/motion";
import { BioOptimizationTrend } from "./components/BioOptimizationTrend";
import { getDisplayName } from "@/lib/user/get-display-name";

const supabase = createClient();

// ─── Types ───────────────────────────────────────────────────────────────────

type ScoreEntry = { score: number; created_at: string | null };

type Recommendation = {
  id: string;
  sku: string;
  product_name: string;
  confidence_score: number;
  priority_rank: number;
  dosage: string | null;
  frequency: string | null;
  time_of_day: string | null;
  monthly_price: number | null;
};

type CAQSymptoms = Record<string, number>;

// ─── Sparkline Chart ─────────────────────────────────────────────────────────

function TrendChart({ data, color = "#4ADE80", height = 80 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 400;
  const h = height;
  const pad = 4;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - pad * 2) - pad;
      return `${x},${y}`;
    })
    .join(" ");

  // Area fill
  const areaPath = `M0,${h} L${data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - pad * 2) - pad;
      return `${x},${y}`;
    })
    .join(" L")} L${w},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Current value dot */}
      {data.length > 0 && (
        <circle
          cx={w}
          cy={h - ((data[data.length - 1] - min) / range) * (h - pad * 2) - pad}
          r="4"
          fill={color}
          stroke="#0B1120"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

function HorizontalBarChart({ items }: { items: { label: string; value: number; max: number; color: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{item.label}</span>
            <span className="text-xs font-medium text-white">{item.value}%</span>
          </div>
          <Progress value={item.value} max={item.max} color={item.color} />
        </div>
      ))}
    </div>
  );
}

// ─── Supplement Adherence Graph (21st.dev polish) ───────────────────────────

interface AdherenceItem {
  id: string;
  name: string;
  rate: number;
  completedCount: number;
  expectedCount: number;
  streak: number;
  source: "CAQ" | "Added";
  category: string | null;
}

function adherenceColor(rate: number): string {
  if (rate >= 80) return "#22C55E";
  if (rate >= 60) return "#2DA5A0";
  if (rate >= 40) return "#F59E0B";
  if (rate >= 20) return "#B75E18";
  return "#EF4444";
}

function SupplementAdherenceGraph({ items }: { items: AdherenceItem[] }) {
  const avg = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.rate, 0) / items.length) : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-[rgba(45,165,160,0.22)] bg-[rgba(26,39,68,0.55)] backdrop-blur-sm px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-wider text-white/30">Protocol average</span>
          <span className="text-xs text-white/50">{items.length} {items.length === 1 ? "supplement" : "supplements"}</span>
        </div>
        <span className="text-sm font-bold" style={{ color: adherenceColor(avg) }}>{avg}%</span>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => {
          const color = adherenceColor(item.rate);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="group relative overflow-hidden rounded-lg border border-[rgba(45,165,160,0.15)] bg-[rgba(30,48,84,0.45)] backdrop-blur-sm p-3 transition-colors hover:border-[rgba(45,165,160,0.30)] hover:bg-[rgba(30,48,84,0.65)]"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-xs font-medium text-white/85">{item.name}</span>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                    style={
                      item.source === "CAQ"
                        ? { backgroundColor: "rgba(45,165,160,0.14)", color: "#2DA5A0", border: "1px solid rgba(45,165,160,0.24)" }
                        : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    {item.source}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color }}>
                  {item.rate}%
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.rate}%` }}
                  transition={{ delay: i * 0.04 + 0.18, duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${color}66 0%, ${color} 100%)`,
                    boxShadow: `0 0 12px ${color}40`,
                  }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/35">
                <span>{item.completedCount} of {item.expectedCount} doses last 30 days</span>
                {item.streak > 0 && (
                  <span className="flex items-center gap-1 text-orange-400/80">
                    <Flame className="h-2.5 w-2.5" strokeWidth={2} />
                    {item.streak}d streak
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: { value: number; color: string; label: string }[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = 60;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative w-[160px] h-[160px] mx-auto">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="16" />
        {segments.map((seg) => {
          const pct = seg.value / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={seg.label}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{centerValue}</span>
        <span className="text-[10px] text-gray-500">{centerLabel}</span>
      </div>
    </div>
  );
}

// ─── Symptom Icons ───────────────────────────────────────────────────────────

const symptomIcons: Record<string, React.ElementType> = {
  energy: Zap,
  sleep: Moon,
  mood: Heart,
  digestion: Droplets,
  cognition: Brain,
  pain: Activity,
  immune: Shield,
  stress: Flame,
  anxiety: Brain,
  hormonal: Heart,
  cardiovascular: Heart,
  metabolic: Activity,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
    getDisplayName().then(setDisplayName);
  }, []);

  // Bio Optimization score history
  const { data: scoreHistory, isLoading: scoreLoading } = useQuery({
    queryKey: ["analytics-scores", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("health_scores")
        .select("score, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true })
        .limit(90);
      return (data ?? []) as ScoreEntry[];
    },
    enabled: !!userId,
  });

  // Current vitality score
  const { data: profileData } = useQuery({
    queryKey: ["analytics-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("bio_optimization_score, assessment_completed, created_at")
        .eq("id", userId!)
        .single();
      return data as { bio_optimization_score: number | null; assessment_completed: boolean | null; created_at: string | null } | null;
    },
    enabled: !!userId,
  });

  // Supplement logs (adherence data)
  // Cast to any: supplement_logs / genetic_variants are not in the regenerated
  // typegen, and user_protocols' product_id column has shifted shape.
  const sb = supabase as any;

  const { data: supplementLogs } = useQuery({
    queryKey: ["analytics-logs", userId],
    queryFn: async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const { data } = await sb
        .from("supplement_logs")
        .select("product_id, logged_at, time_of_day")
        .eq("user_id", userId!)
        .gte("logged_at", ninetyDaysAgo.toISOString())
        .order("logged_at", { ascending: true });
      return (data ?? []) as Pick<SupplementLog, "product_id" | "logged_at" | "time_of_day">[];
    },
    enabled: !!userId,
  });

  // Protocol (active supplements)
  const { data: protocol } = useQuery({
    queryKey: ["analytics-protocol", userId],
    queryFn: async () => {
      const { data } = await sb
        .from("user_protocols")
        .select("id, product_id, dose, time_of_day, active, product:products(name, short_name)")
        .eq("user_id", userId!)
        .eq("active", true);
      return (data ?? []) as { id: string; product_id: string; dose: string; time_of_day: string; active: boolean; product: { name: string; short_name: string } | null }[];
    },
    enabled: !!userId,
  });

  // Active supplements from CAQ + Supplement Protocol page (unified source)
  const { data: activeSupplements } = useQuery({
    queryKey: ["analytics-active-supplements", userId],
    queryFn: async () => {
      const { data } = await sb
        .from("user_current_supplements")
        .select("id, supplement_name, product_name, brand, dosage, dosage_form, frequency, category, is_current, is_ai_recommended")
        .eq("user_id", userId!)
        .eq("is_current", true);
      return (data ?? []) as DashboardSupplement[];
    },
    enabled: !!userId,
  });

  // Adherence log from Today's Protocol + Supplement Protocol check-offs
  const { data: adherenceLog } = useQuery({
    queryKey: ["analytics-adherence-log", userId],
    queryFn: async () => {
      const thirty = new Date();
      thirty.setDate(thirty.getDate() - 30);
      const dateStr = thirty.toISOString().slice(0, 10);
      const { data } = await sb
        .from("protocol_adherence_log")
        .select("product_slug, scheduled_date, time_of_day, completed")
        .eq("user_id", userId!)
        .eq("completed", true)
        .gte("scheduled_date", dateStr);
      return (data ?? []) as { product_slug: string; scheduled_date: string; time_of_day: string; completed: boolean }[];
    },
    enabled: !!userId,
  });

  // Recommendations
  const { data: recommendations } = useQuery({
    queryKey: ["analytics-recs", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recommendations")
        .select("id, sku, product_name, confidence_score, priority_rank, dosage, frequency, time_of_day, monthly_price")
        .eq("user_id", userId!)
        .eq("status", "recommended")
        .order("priority_rank");
      return (data ?? []) as Recommendation[];
    },
    enabled: !!userId,
  });

  // Genetic variants
  const { data: variants } = useQuery({
    queryKey: ["analytics-variants", userId],
    queryFn: async () => {
      const { data } = await sb
        .from("genetic_variants")
        .select("*")
        .eq("user_id", userId!)
        .order("risk_level");
      return (data ?? []) as GeneticVariant[];
    },
    enabled: !!userId,
  });

  // CAQ symptom data
  const { data: symptomData } = useQuery({
    queryKey: ["analytics-symptoms", userId],
    queryFn: async () => {
      // Fetch symptoms from phases 7 (physical), 8 (neuro), 9 (emotional)
      const { data: phases } = await supabase
        .from("assessment_results")
        .select("phase, data")
        .eq("user_id", userId!)
        .in("phase", [7, 8, 9]);

      if (!phases?.length) return {} as CAQSymptoms;

      const result: CAQSymptoms = {};
      for (const p of phases) {
        if (p.data && typeof p.data === "object") {
          for (const [key, val] of Object.entries(p.data as Record<string, unknown>)) {
            if (val && typeof val === "object" && "score" in (val as Record<string, unknown>)) {
              const label = key.replace(/_severity$/, "").replace(/_/g, " ");
              result[label] = (val as { score: number }).score;
            }
          }
        }
      }
      return result;
    },
    enabled: !!userId,
  });

  // Token balance
  const { data: tokens } = useQuery({
    queryKey: ["analytics-tokens", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("farma_tokens")
        .select("balance, lifetime_earned")
        .eq("user_id", userId!)
        .single();
      return data as { balance: number; lifetime_earned: number } | null;
    },
    enabled: !!userId,
  });

  // Orders
  const { data: orders } = useQuery({
    queryKey: ["analytics-orders", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, total, status, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as { id: string; total: number; status: string; created_at: string }[];
    },
    enabled: !!userId,
  });

  // ─── Computed values ─────────────────────────────────────────────────────

  const currentScore = profileData?.bio_optimization_score ?? 0;
  const scores = (scoreHistory ?? []).map((s) => s.score);
  const scoreTrend = scores.length >= 2 ? scores[scores.length - 1] - scores[scores.length - 2] : 0;

  // Per-supplement adherence using the canonical data the Supplement
  // Protocol page writes (user_current_supplements + protocol_adherence_log).
  // CAQ-recommended items carry the CAQ badge; manually-added carry Added.
  const supplementAdherence: AdherenceItem[] = useMemo(() => {
    const supps = activeSupplements ?? [];
    const logs = adherenceLog ?? [];
    if (supps.length === 0) return [];

    const logsBySlug: Record<string, { product_slug: string; scheduled_date: string }[]> = {};
    for (const row of logs) {
      (logsBySlug[row.product_slug] = logsBySlug[row.product_slug] || []).push(row);
    }

    const todayKey = new Date().toISOString().slice(0, 10);

    return supps
      .map((s) => {
        const slug = supplementSlug(s);
        const slugLogs = logsBySlug[slug] ?? [];
        const completedCount = slugLogs.length;
        const rate = Math.min(100, Math.round((completedCount / 30) * 100));

        // Streak: consecutive days with a completed log, counted back from today
        const dates = new Set(slugLogs.map((r) => r.scheduled_date));
        let streak = 0;
        const cursor = new Date(todayKey);
        while (streak < 90) {
          const key = cursor.toISOString().slice(0, 10);
          if (dates.has(key)) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
          } else {
            break;
          }
        }

        return {
          id: s.id,
          name: s.product_name || s.supplement_name || "Supplement",
          rate,
          completedCount,
          expectedCount: 30,
          streak,
          source: s.is_ai_recommended ? ("CAQ" as const) : ("Added" as const),
          category: s.category,
        };
      })
      .sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name));
  }, [activeSupplements, adherenceLog]);

  // Adherence calculations
  const adherence = useMemo(() => {
    const logs = supplementLogs ?? [];
    const protocolItems = protocol ?? [];
    if (protocolItems.length === 0) return { overall: 0, last7: 0, last30: 0, byProduct: [] as { name: string; rate: number }[], streak: 0 };

    const now = new Date();
    const days30ago = new Date(now); days30ago.setDate(now.getDate() - 30);
    const days7ago = new Date(now); days7ago.setDate(now.getDate() - 7);

    const logs30 = logs.filter((l) => new Date(l.logged_at) >= days30ago);
    const logs7 = logs.filter((l) => new Date(l.logged_at) >= days7ago);

    const expectedDaily = protocolItems.length;
    const overall30 = expectedDaily > 0 ? Math.min(100, Math.round((logs30.length / (expectedDaily * 30)) * 100)) : 0;
    const overall7 = expectedDaily > 0 ? Math.min(100, Math.round((logs7.length / (expectedDaily * 7)) * 100)) : 0;

    const byProduct = protocolItems.map((p) => {
      const productLogs = logs30.filter((l) => l.product_id === p.product_id);
      return {
        name: p.product?.short_name ?? p.product?.name ?? "Supplement",
        rate: Math.min(100, Math.round((productLogs.length / 30) * 100)),
      };
    });

    // Streak — consecutive days with at least one log
    let streak = 0;
    const d = new Date(now);
    for (let i = 0; i < 90; i++) {
      const dayKey = d.toISOString().slice(0, 10);
      const hasLog = logs.some((l) => l.logged_at.slice(0, 10) === dayKey);
      if (hasLog) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    return { overall: overall30, last7: overall7, last30: overall30, byProduct, streak };
  }, [supplementLogs, protocol]);

  // Weekly adherence trend (last 12 weeks)
  const weeklyAdherence = useMemo(() => {
    const logs = supplementLogs ?? [];
    const protocolItems = protocol ?? [];
    if (protocolItems.length === 0 || logs.length === 0) return [];
    const weeks: number[] = [];
    const now = new Date();
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - w * 7 - 6);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - w * 7);
      const weekLogs = logs.filter((l) => {
        const d = new Date(l.logged_at);
        return d >= weekStart && d <= weekEnd;
      });
      const expected = protocolItems.length * 7;
      weeks.push(Math.min(100, Math.round((weekLogs.length / expected) * 100)));
    }
    return weeks;
  }, [supplementLogs, protocol]);

  // Symptom severity breakdown
  const symptomBreakdown = useMemo(() => {
    const symptoms = symptomData ?? {};
    return Object.entries(symptoms)
      .filter(([, sev]) => typeof sev === "number" && sev > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([key, sev]) => ({
        label: key.charAt(0).toUpperCase() + key.slice(1),
        value: Math.round(((sev as number) / 10) * 100),
        severity: sev as number,
        icon: symptomIcons[key] ?? Activity,
      }));
  }, [symptomData]);

  // Genetic risk breakdown
  const geneticBreakdown = useMemo(() => {
    const v = variants ?? [];
    const high = v.filter((g) => g.risk_level === "high").length;
    const moderate = v.filter((g) => g.risk_level === "moderate").length;
    const low = v.filter((g) => g.risk_level === "low").length;
    return { high, moderate, low, total: v.length };
  }, [variants]);

  // Spending
  const totalSpent = (orders ?? [])
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  const monthlyEstimate = (recommendations ?? []).reduce((s, r) => s + (r.monthly_price ?? 0), 0);

  const protocolCount = (protocol ?? []).length;
  const recCount = (recommendations ?? []).length;

  return (
    <>
    <MobileHeroBackground
      src="https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%2020%20Desktop.png"
      mobileSrc="https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Mobile%20Hero/Athlete%2020%20Mobile.png"
      overlayOpacity={0.55}
      objectPosition="center center"
      priority
    />
    <div className="relative z-10 min-h-screen text-white">
    <PageTransition className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <StaggerChild>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-copper" />
          Wellness Analytics
        </h1>
        <p className="text-[#B75E18] text-sm mt-1">
          Track your vitality, adherence, symptoms, and wellness journey over time.
        </p>
      </StaggerChild>

      {/* ── Row 1: Key Stats ── */}
      <StaggerChild className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MotionCard className="p-5">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-4 h-4 text-portal-green" />
            {scoreTrend !== 0 && (
              <span className={`flex items-center gap-0.5 text-[10px] font-medium ${scoreTrend > 0 ? "text-portal-green" : "text-rose"}`}>
                {scoreTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {scoreTrend > 0 ? "+" : ""}{scoreTrend}
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-white">{currentScore}</p>
          <p className="text-xs text-gray-500 mt-1">Bio Optimization</p>
        </MotionCard>

        <MotionCard className="p-5">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-4 h-4 text-copper" />
            {adherence.last7 > adherence.last30 && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-portal-green">
                <TrendingUp className="w-3 h-3" />
                Improving
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-white">{adherence.overall}%</p>
          <p className="text-xs text-gray-500 mt-1">30-Day Adherence</p>
        </MotionCard>

        <MotionCard className="p-5">
          <Flame className="w-4 h-4 text-portal-yellow mb-2" />
          <p className="text-3xl font-bold text-white">{adherence.streak}</p>
          <p className="text-xs text-gray-500 mt-1">Day Streak</p>
        </MotionCard>

        <MotionCard className="p-5">
          <Pill className="w-4 h-4 text-plum mb-2" />
          <p className="text-3xl font-bold text-white">{protocolCount}</p>
          <p className="text-xs text-gray-500 mt-1">Active Supplements</p>
        </MotionCard>
      </StaggerChild>

      {/* ── Bio Optimization Trend (full width) ── */}
      <StaggerChild>
        <BioOptimizationTrend
          userId={userId}
          displayName={displayName}
          streak={adherence.streak}
          adherencePct={adherence.overall}
        />
      </StaggerChild>

      {/* ── Row 3: Adherence by Supplement (left) + Symptom Profile / Genetic Risk / Protocol Match (right stack) ── */}
      <StaggerChild className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* LEFT: Per-supplement adherence */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Adherence by Supplement</h3>
              <p className="text-[11px] text-white/35 mt-0.5">CAQ recommendations and supplements in your protocol</p>
            </div>
          </div>
          {supplementAdherence.length === 0 ? (
            <EmptyState icon={Pill} title="No protocol data" description="Add supplements to your protocol or complete the Clinical Assessment to track adherence." />
          ) : (
            <SupplementAdherenceGraph items={supplementAdherence} />
          )}
        </Card>

        {/* RIGHT: stacked trio sharing the left column's height */}
        <div className="grid grid-rows-3 gap-4 h-full">
          {/* Symptom Profile */}
          <Card className="p-5 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-sm font-semibold text-white">Symptom Profile</h3>
              <Link href="/onboarding/i-caq-intro" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-400/10 border border-orange-400/25 text-orange-400 text-xs font-medium hover:bg-orange-400/15 hover:border-orange-400/35 transition-all no-underline">
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                Retake
              </Link>
            </div>
            {symptomBreakdown.length === 0 ? (
              <EmptyState icon={Activity} title="No symptom data" description="Complete your Clinical Assessment to see symptom analysis." />
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {symptomBreakdown.slice(0, 5).map((sym) => {
                  const Icon = sym.icon;
                  return (
                    <div key={sym.label} className="flex items-center gap-3">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${sym.severity >= 7 ? "text-rose" : sym.severity >= 4 ? "text-portal-yellow" : "text-portal-green"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-gray-400 truncate">{sym.label}</span>
                          <span className="text-[10px] text-gray-500 ml-2">{sym.severity}/10</span>
                        </div>
                        <Progress
                          value={sym.severity}
                          max={10}
                          color={sym.severity >= 7 ? "bg-rose" : sym.severity >= 4 ? "bg-portal-yellow" : "bg-portal-green"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Genetic Risk */}
          <Card className="p-5 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <Dna className="w-4 h-4 text-teal" />
              <h3 className="text-sm font-semibold text-white">Genetic Risk</h3>
            </div>
            {geneticBreakdown.total === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-gray-500">No genetic data available</p>
                <Link href="/genetics" className="text-xs text-copper hover:underline mt-1 inline-block">
                  Order GeneX360 Test
                </Link>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex items-center gap-4">
                <div className="flex-shrink-0">
                  <DonutChart
                    segments={[
                      { value: geneticBreakdown.high, color: "#F87171", label: "High" },
                      { value: geneticBreakdown.moderate, color: "#FBBF24", label: "Moderate" },
                      { value: geneticBreakdown.low, color: "#4ADE80", label: "Low" },
                    ]}
                    centerLabel="Variants"
                    centerValue={String(geneticBreakdown.total)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F87171]" />
                    <span className="text-[11px] text-gray-400">High ({geneticBreakdown.high})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FBBF24]" />
                    <span className="text-[11px] text-gray-400">Moderate ({geneticBreakdown.moderate})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
                    <span className="text-[11px] text-gray-400">Low ({geneticBreakdown.low})</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Protocol Match */}
          <Card className="p-5 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <Target className="w-4 h-4 text-copper" />
              <h3 className="text-sm font-semibold text-white">Supplement Recommendations</h3>
            </div>
            {recCount === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-gray-500">No recommendations yet</p>
                <Link href="/profile/assessment" className="text-xs text-copper hover:underline mt-1 inline-block">
                  Take Assessment
                </Link>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {(recommendations ?? []).slice(0, 4).map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 truncate flex-1 mr-2">{rec.product_name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-14">
                          <Progress
                            value={rec.confidence_score}
                            color={rec.confidence_score >= 85 ? "bg-portal-green" : rec.confidence_score >= 70 ? "bg-copper" : "bg-portal-yellow"}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-white w-8 text-right">{rec.confidence_score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 mt-2 border-t border-white/[0.06] flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Avg. Match</span>
                    <span className="text-sm font-bold text-copper">
                      {Math.round((recommendations ?? []).reduce((s, r) => s + r.confidence_score, 0) / recCount)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </StaggerChild>

      {/* ── Row 5: Time-of-Day Distribution ── */}
      <StaggerChild>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Supplement Schedule Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(["morning", "noon", "evening", "bedtime"] as const).map((tod) => {
              const items = (protocol ?? []).filter((p) => p.time_of_day === tod);
              const icons: Record<string, { icon: React.ElementType; color: string }> = {
                morning: { icon: Zap, color: "text-portal-yellow" },
                noon: { icon: Activity, color: "text-cyan" },
                evening: { icon: Moon, color: "text-plum" },
                bedtime: { icon: Moon, color: "text-portal-green" },
              };
              const { icon: Icon, color } = icons[tod];
              return (
                <div key={tod} className="text-center p-3 rounded-lg bg-[rgba(30,48,84,0.45)] backdrop-blur-sm border border-[rgba(45,165,160,0.15)]">
                  <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
                  <p className="text-lg font-bold text-white">{items.length}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{tod}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </StaggerChild>
    </PageTransition>
    </div>
    </>
  );
}
