"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AssessmentResult, GeneticVariant } from "@/lib/supabase/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import {
  Activity,
  Dna,
  Pill,
  Heart,
  Brain,
  Target,
  RefreshCw,
  TrendingUp,
  BarChart3,
} from "lucide-react";

const supabase = createClient();

const factorConfig = [
  { key: "caq", label: "CAQ Score", weight: 30, icon: BarChart3, color: "bg-copper" },
  { key: "genetic", label: "Genetic Risk", weight: 30, icon: Dna, color: "bg-teal" },
  { key: "adherence", label: "Adherence", weight: 20, icon: Pill, color: "bg-portal-green" },
  { key: "lifestyle", label: "Lifestyle", weight: 20, icon: Heart, color: "bg-plum" },
];

const constitutionalTypes = [
  { name: "Metabolic", key: "metabolic", icon: Activity },
  { name: "Neurological", key: "neurological", icon: Brain },
  { name: "Immune", key: "immune", icon: Heart },
  { name: "Hormonal", key: "hormonal", icon: TrendingUp },
  { name: "Structural", key: "structural", icon: Target },
];

// Radar chart component
function RadarChart({ data }: { data: Record<string, number> }) {
  const categories = constitutionalTypes.map((t) => t.key);
  const labels = constitutionalTypes.map((t) => t.name);
  const size = 240;
  const center = size / 2;
  const maxRadius = 90;
  const levels = 4;

  const angleStep = (2 * Math.PI) / categories.length;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const radius = (value / 100) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  // Grid lines
  const gridLevels = Array.from({ length: levels }, (_, i) => (i + 1) / levels);

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Grid */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={categories
            .map((_, i) => {
              const p = getPoint(i, level * 100);
              return `${p.x},${p.y}`;
            })
            .join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {categories.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={categories
          .map((key, i) => {
            const p = getPoint(i, data[key] ?? 0);
            return `${p.x},${p.y}`;
          })
          .join(" ")}
        fill="rgba(183,95,25,0.15)"
        stroke="#B75F19"
        strokeWidth="2"
      />

      {/* Data points */}
      {categories.map((key, i) => {
        const p = getPoint(i, data[key] ?? 0);
        return (
          <circle
            key={key}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#B75F19"
            stroke="#0B1120"
            strokeWidth="2"
          />
        );
      })}

      {/* Labels */}
      {categories.map((_, i) => {
        const p = getPoint(i, 120);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-400 text-[10px]"
          >
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

// Score gauge
function ScoreGauge({ score, loading }: { score: number; loading: boolean }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 70;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  useEffect(() => {
    if (!loading && score > 0) {
      let current = 0;
      const step = score / 50;
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

  if (loading) return <Skeleton className="w-[180px] h-[180px] rounded-full mx-auto" />;

  return (
    <div className="relative w-[180px] h-[180px] mx-auto">
      <svg width="180" height="180" className="transform -rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx="90"
          cy="90"
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
        <span className="text-4xl font-bold text-white">{animatedScore}</span>
        <span className="text-[10px] text-gray-400 mt-1">Vitality Score</span>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
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

  const { data: assessments } = useQuery({
    queryKey: ["assessment-results", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("assessment_results")
        .select("*")
        .eq("user_id", userId!)
        .order("phase");
      return (data ?? []) as AssessmentResult[];
    },
    enabled: !!userId,
  });

  const { data: adherenceData } = useQuery({
    queryKey: ["adherence-rate", userId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: logs } = await supabase
        .from("supplement_logs")
        .select("id")
        .eq("user_id", userId!)
        .gte("logged_at", thirtyDaysAgo.toISOString());
      const { data: protocol } = await supabase
        .from("user_protocols")
        .select("id")
        .eq("user_id", userId!)
        .eq("active", true);
      const expected = (protocol?.length ?? 0) * 30;
      const actual = logs?.length ?? 0;
      return expected > 0 ? Math.round((actual / expected) * 100) : 0;
    },
    enabled: !!userId,
  });

  const { data: geneticRisk } = useQuery({
    queryKey: ["genetic-risk-score", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("genetic_variants")
        .select("risk_level")
        .eq("user_id", userId!);
      const rows = (data ?? []) as Pick<GeneticVariant, "risk_level">[];
      if (rows.length === 0) return 0;
      const riskScores = { low: 90, moderate: 60, high: 30 };
      const total = rows.reduce(
        (sum, v) => sum + (riskScores[v.risk_level] ?? 50),
        0
      );
      return Math.round(total / rows.length);
    },
    enabled: !!userId,
  });

  const score = healthScore?.score ?? 0;
  const completedPhases = assessments?.length ?? 0;

  // Compute factor scores for display
  const caqScore = completedPhases > 0 ? Math.round((completedPhases / 5) * 100) : 0;
  const geneticScore = geneticRisk ?? 0;
  const adherenceScore = adherenceData ?? 0;
  const lifestyleScore = caqScore > 0 ? Math.min(100, caqScore + 10) : 0;

  const factorScores: Record<string, number> = {
    caq: caqScore,
    genetic: geneticScore,
    adherence: adherenceScore,
    lifestyle: lifestyleScore,
  };

  // Constitutional type data (derived from assessment data or defaults)
  const constitutionalData: Record<string, number> = {
    metabolic: 0,
    neurological: 0,
    immune: 0,
    hormonal: 0,
    structural: 0,
  };

  // Parse assessment data for constitutional type
  if (assessments && assessments.length > 0) {
    assessments.forEach((a) => {
      const d = typeof a.data === "string" ? JSON.parse(a.data as string) : a.data;
      if (d?.constitutionalType) {
        Object.entries(d.constitutionalType).forEach(([key, val]) => {
          if (constitutionalData[key] !== undefined) {
            constitutionalData[key] = val as number;
          }
        });
      }
    });
  }

  const hasAssessment = completedPhases > 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/dashboard" className="text-copper hover:underline">Dashboard</Link>
        <span>/</span>
        <Link href="/profile" className="text-copper hover:underline">Profile</Link>
        <span>/</span>
        <span className="text-white">Assessment</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vitality Score Breakdown</h1>
          <p className="text-gray-400 text-sm mt-1">
            Comprehensive view of your health assessment factors
          </p>
        </div>
        <Link href="/onboarding/1">
          <Button variant="secondary" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retake Assessment
          </Button>
        </Link>
      </div>

      {!hasAssessment && !scoreLoading ? (
        <EmptyState
          icon={Activity}
          title="No assessment completed"
          description="Complete your Clinical Assessment Questionnaire to unlock your Vitality Score breakdown."
          actionLabel="Start Assessment"
          onAction={() => { window.location.href = "/onboarding/1"; }}
        />
      ) : (
        <>
          {/* Score + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Gauge */}
            <Card className="p-8 text-center">
              <ScoreGauge score={score} loading={scoreLoading} />
              <div className="mt-4">
                <Badge
                  variant={score >= 75 ? "active" : score >= 50 ? "pending" : "danger"}
                >
                  {score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Needs Improvement"}
                </Badge>
              </div>
            </Card>

            {/* Radar Chart */}
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Constitutional Type
              </h3>
              <RadarChart data={constitutionalData} />
              <div className="grid grid-cols-5 gap-2 mt-4">
                {constitutionalTypes.map((ct) => (
                  <div key={ct.key} className="text-center">
                    <ct.icon className="w-4 h-4 mx-auto text-copper mb-1" />
                    <p className="text-[10px] text-gray-500">{ct.name}</p>
                    <p className="text-xs font-bold text-white">
                      {constitutionalData[ct.key] ?? 0}%
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Contributing Factors */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Contributing Factors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {factorConfig.map((factor) => {
                const value = factorScores[factor.key] ?? 0;
                return (
                  <div key={factor.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <factor.icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-white font-medium">{factor.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{value}%</span>
                        <Badge variant="neutral">{factor.weight}% weight</Badge>
                      </div>
                    </div>
                    <Progress value={value} color={factor.color} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Phase Completion */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Assessment Phases</h3>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((phase) => {
                const completed = assessments?.some((a) => a.phase === phase);
                const labels = [
                  "Demographics",
                  "Symptoms",
                  "Lifestyle",
                  "Medications",
                  "Goals",
                ];
                return (
                  <div
                    key={phase}
                    className={`p-3 rounded-xl border text-center ${
                      completed
                        ? "border-portal-green/30 bg-portal-green/5"
                        : "border-white/[0.06] bg-white/[0.02]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                        completed ? "bg-portal-green/20 text-portal-green" : "bg-white/[0.06] text-gray-600"
                      }`}
                    >
                      <span className="text-xs font-bold">{phase}</span>
                    </div>
                    <p className={`text-[10px] mt-2 ${completed ? "text-gray-300" : "text-gray-600"}`}>
                      {labels[phase - 1]}
                    </p>
                    {completed && (
                      <Badge variant="active" className="mt-1">Done</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
