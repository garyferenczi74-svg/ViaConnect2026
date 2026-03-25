"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { SupplementLog, GeneticVariant } from "@/lib/supabase/types";
import { Card } from "@/components/ui/Card";
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
} from "lucide-react";
import { PageTransition, StaggerChild, MotionCard, ChartReveal } from "@/lib/motion";

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Vitality score history
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
        .select("vitality_score, assessment_completed, created_at")
        .eq("id", userId!)
        .single();
      return data as { vitality_score: number | null; assessment_completed: boolean | null; created_at: string | null } | null;
    },
    enabled: !!userId,
  });

  // Supplement logs (adherence data)
  const { data: supplementLogs } = useQuery({
    queryKey: ["analytics-logs", userId],
    queryFn: async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const { data } = await supabase
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
      const { data } = await supabase
        .from("user_protocols")
        .select("id, product_id, dose, time_of_day, active, product:products(name, short_name)")
        .eq("user_id", userId!)
        .eq("active", true);
      return (data ?? []) as { id: string; product_id: string; dose: string; time_of_day: string; active: boolean; product: { name: string; short_name: string } | null }[];
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
      const { data } = await supabase
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
      const { data } = await supabase
        .from("assessment_results")
        .select("data")
        .eq("user_id", userId!)
        .eq("phase", 2)
        .single();
      if (data?.data && typeof data.data === "object") {
        return data.data as CAQSymptoms;
      }
      return {} as CAQSymptoms;
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

  const currentScore = profileData?.vitality_score ?? 0;
  const scores = (scoreHistory ?? []).map((s) => s.score);
  const scoreTrend = scores.length >= 2 ? scores[scores.length - 1] - scores[scores.length - 2] : 0;

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
    <PageTransition className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <StaggerChild>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-copper" />
          Wellness Analytics
        </h1>
        <p className="text-gray-400 text-sm mt-1">
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
          <p className="text-xs text-gray-500 mt-1">Vitality Score</p>
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

      {/* ── Row 2: Vitality Trend + Adherence Trend ── */}
      <StaggerChild className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vitality Score Trend */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Vitality Score Trend</h3>
              <p className="text-xs text-gray-500 mt-0.5">Last {scores.length} data points</p>
            </div>
            <Badge variant={currentScore >= 60 ? "active" : currentScore >= 40 ? "pending" : "danger"}>
              {currentScore >= 80 ? "Excellent" : currentScore >= 60 ? "Good" : currentScore >= 40 ? "Moderate" : "Needs Attention"}
            </Badge>
          </div>
          <ChartReveal>
            {scores.length >= 2 ? (
              <TrendChart
                data={scores}
                color={currentScore >= 60 ? "#4ADE80" : currentScore >= 40 ? "#FBBF24" : "#F87171"}
              />
            ) : (
              <div className="h-[80px] flex items-center justify-center">
                <p className="text-xs text-gray-600">
                  {scores.length === 0 ? "Complete your assessment to start tracking" : "More data points needed for trend"}
                </p>
              </div>
            )}
          </ChartReveal>
        </Card>

        {/* Adherence Trend */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Weekly Adherence</h3>
              <p className="text-xs text-gray-500 mt-0.5">Last 12 weeks</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500">7-day</p>
                <p className="text-sm font-bold text-white">{adherence.last7}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">30-day</p>
                <p className="text-sm font-bold text-white">{adherence.last30}%</p>
              </div>
            </div>
          </div>
          <ChartReveal>
            {weeklyAdherence.length >= 2 ? (
              <TrendChart data={weeklyAdherence} color="#B75F19" />
            ) : (
              <div className="h-[80px] flex items-center justify-center">
                <p className="text-xs text-gray-600">Log supplements daily to see adherence trends</p>
              </div>
            )}
          </ChartReveal>
        </Card>
      </StaggerChild>

      {/* ── Row 3: Adherence by Supplement + Symptom Severity ── */}
      <StaggerChild className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Per-supplement adherence */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Adherence by Supplement</h3>
          {adherence.byProduct.length === 0 ? (
            <EmptyState icon={Pill} title="No protocol data" description="Add supplements to your protocol to track adherence." />
          ) : (
            <HorizontalBarChart
              items={adherence.byProduct.map((p) => ({
                label: p.name,
                value: p.rate,
                max: 100,
                color: p.rate >= 80 ? "bg-portal-green" : p.rate >= 50 ? "bg-portal-yellow" : "bg-rose",
              }))}
            />
          )}
        </Card>

        {/* Symptom severity */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Symptom Profile</h3>
            <Link href="/profile/assessment" className="text-xs text-copper hover:underline">
              Retake Assessment
            </Link>
          </div>
          {symptomBreakdown.length === 0 ? (
            <EmptyState icon={Activity} title="No symptom data" description="Complete your Clinical Assessment to see symptom analysis." />
          ) : (
            <div className="space-y-2.5">
              {symptomBreakdown.slice(0, 8).map((sym) => {
                const Icon = sym.icon;
                return (
                  <div key={sym.label} className="flex items-center gap-3">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${sym.severity >= 7 ? "text-rose" : sym.severity >= 4 ? "text-portal-yellow" : "text-portal-green"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-400">{sym.label}</span>
                        <span className="text-[10px] text-gray-500">{sym.severity}/10</span>
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
      </StaggerChild>

      {/* ── Row 4: Genetic Risk + Protocol Overview + Spending ── */}
      <StaggerChild className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Genetic Risk Distribution */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Dna className="w-4 h-4 text-teal" />
            <h3 className="text-sm font-semibold text-white">Genetic Risk</h3>
          </div>
          {geneticBreakdown.total === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500">No genetic data available</p>
              <Link href="/genetics" className="text-xs text-copper hover:underline mt-1 inline-block">
                Order GeneX360 Test
              </Link>
            </div>
          ) : (
            <>
              <DonutChart
                segments={[
                  { value: geneticBreakdown.high, color: "#F87171", label: "High" },
                  { value: geneticBreakdown.moderate, color: "#FBBF24", label: "Moderate" },
                  { value: geneticBreakdown.low, color: "#4ADE80", label: "Low" },
                ]}
                centerLabel="Variants"
                centerValue={String(geneticBreakdown.total)}
              />
              <div className="flex justify-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F87171]" />
                  <span className="text-[10px] text-gray-400">High ({geneticBreakdown.high})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FBBF24]" />
                  <span className="text-[10px] text-gray-400">Mod ({geneticBreakdown.moderate})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
                  <span className="text-[10px] text-gray-400">Low ({geneticBreakdown.low})</span>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Protocol Confidence Overview */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-copper" />
            <h3 className="text-sm font-semibold text-white">Protocol Match</h3>
          </div>
          {recCount === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500">No recommendations yet</p>
              <Link href="/profile/assessment" className="text-xs text-copper hover:underline mt-1 inline-block">
                Take Assessment
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(recommendations ?? []).slice(0, 6).map((rec) => (
                <div key={rec.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 truncate flex-1 mr-2">{rec.product_name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-16">
                      <Progress
                        value={rec.confidence_score}
                        color={rec.confidence_score >= 85 ? "bg-portal-green" : rec.confidence_score >= 70 ? "bg-copper" : "bg-portal-yellow"}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-white w-8 text-right">{rec.confidence_score}%</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-white/[0.06]">
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

        {/* Spending + Tokens */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-portal-yellow" />
            <h3 className="text-sm font-semibold text-white">Wellness Investment</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-white">${totalSpent.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Est. Monthly Protocol</p>
              <p className="text-lg font-semibold text-copper">${monthlyEstimate.toFixed(2)}/mo</p>
            </div>
            <div className="pt-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">ViaTokens Earned</span>
                <span className="text-sm font-bold text-portal-yellow">{(tokens?.lifetime_earned ?? 0).toLocaleString()} VT</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">Current Balance</span>
                <span className="text-sm font-bold text-white">{(tokens?.balance ?? 0).toLocaleString()} VT</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Orders</span>
              <span className="text-sm font-medium text-white">{(orders ?? []).length}</span>
            </div>
          </div>
        </Card>
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
                <div key={tod} className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
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
  );
}
