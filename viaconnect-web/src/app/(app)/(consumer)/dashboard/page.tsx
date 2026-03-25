"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Share2,
  UserCheck,
  Leaf,
  Shield,
  Eye,
  EyeOff,
  Send,
  Check,
  Loader2,
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
                  <Badge variant="neutral">
                    {item.confidence_score}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <a
        href="https://farmceuticawellness.com"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center py-2.5 rounded-lg bg-copper/10 text-copper text-sm font-medium hover:bg-copper/20 transition-colors"
      >
        Shop FarmCeutica &rarr;
      </a>
    </div>
  );
}

// --- Share Data with Providers ---
type ShareCategory = "vitality_score" | "supplement_protocol" | "genetic_data" | "symptom_profile" | "adherence_data";

type SharePermission = {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_role: "practitioner" | "naturopath";
  category: ShareCategory;
  granted: boolean;
  granted_at: string | null;
};

const SHARE_CATEGORIES: { id: ShareCategory; label: string; description: string; icon: React.ElementType; color: string }[] = [
  { id: "vitality_score", label: "Vitality Score", description: "Current score and 30-day trend", icon: CheckCircle2, color: "text-portal-green" },
  { id: "supplement_protocol", label: "Supplement Protocol", description: "Active supplements, dosage, and schedule", icon: FlaskConical, color: "text-copper" },
  { id: "genetic_data", label: "Genetic Data", description: "GeneX360 results, SNP variants, and risk levels", icon: Dna, color: "text-teal" },
  { id: "symptom_profile", label: "Symptom Profile", description: "CAQ symptom severity and health concerns", icon: FileText, color: "text-plum" },
  { id: "adherence_data", label: "Adherence Data", description: "Daily logging history and streak data", icon: UserCheck, color: "text-portal-yellow" },
];

function ShareWithProviders({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  // Fetch connected providers (practitioners + naturopaths linked to this patient)
  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ["connected-providers", userId],
    queryFn: async () => {
      // Get practitioners from conversations
      const { data: convos } = await supabase
        .from("conversations")
        .select("practitioner_id")
        .eq("patient_id", userId);

      const practitionerIds = Array.from(new Set((convos ?? []).map((c) => c.practitioner_id)));

      if (practitionerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("id", practitionerIds);

      return (profiles ?? []).map((p) => ({
        id: p.id,
        name: p.full_name ?? "Provider",
        role: (p.role === "naturopath" ? "naturopath" : "practitioner") as "practitioner" | "naturopath",
      }));
    },
  });

  // Fetch existing share permissions
  const { data: permissions } = useQuery({
    queryKey: ["share-permissions", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, user_id, action, metadata, created_at")
        .eq("user_id", userId)
        .eq("action", "data_share_permission")
        .order("created_at", { ascending: false });

      // Parse permissions from audit logs
      type AuditRow = { id: string; user_id: string | null; action: string; metadata: Record<string, unknown> | null; created_at: string };
      const permMap = new Map<string, SharePermission>();
      ((data ?? []) as AuditRow[]).forEach((log) => {
        const meta = log.metadata;
        if (meta?.provider_id && meta?.category) {
          const key = `${meta.provider_id}-${meta.category}`;
          if (!permMap.has(key)) {
            permMap.set(key, {
              id: log.id,
              provider_id: meta.provider_id as string,
              provider_name: (meta.provider_name as string) ?? "Provider",
              provider_role: (meta.provider_role as "practitioner" | "naturopath") ?? "practitioner",
              category: meta.category as ShareCategory,
              granted: (meta.granted as boolean) ?? false,
              granted_at: log.created_at,
            });
          }
        }
      });
      return Array.from(permMap.values());
    },
  });

  // Toggle share permission
  const togglePermission = useMutation({
    mutationFn: async ({
      providerId,
      providerName,
      providerRole,
      category,
      granted,
    }: {
      providerId: string;
      providerName: string;
      providerRole: "practitioner" | "naturopath";
      category: ShareCategory;
      granted: boolean;
    }) => {
      const { error } = await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "data_share_permission",
        resource_type: "data_sharing",
        metadata: {
          provider_id: providerId,
          provider_name: providerName,
          provider_role: providerRole,
          category,
          granted,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-permissions", userId] });
      toast.success("Sharing permission updated");
    },
    onError: () => toast.error("Failed to update sharing permission"),
  });

  // Share all with a provider
  const shareAll = useMutation({
    mutationFn: async ({
      providerId,
      providerName,
      providerRole,
    }: {
      providerId: string;
      providerName: string;
      providerRole: "practitioner" | "naturopath";
    }) => {
      const inserts = SHARE_CATEGORIES.map((cat) => ({
        user_id: userId,
        action: "data_share_permission",
        resource_type: "data_sharing",
        metadata: {
          provider_id: providerId,
          provider_name: providerName,
          provider_role: providerRole,
          category: cat.id,
          granted: true,
        },
      }));
      const { error } = await supabase.from("audit_logs").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-permissions", userId] });
      toast.success("All data shared with provider");
    },
    onError: () => toast.error("Failed to share data"),
  });

  function isGranted(providerId: string, category: ShareCategory): boolean {
    return (permissions ?? []).some(
      (p) => p.provider_id === providerId && p.category === category && p.granted
    );
  }

  function grantedCount(providerId: string): number {
    return SHARE_CATEGORIES.filter((cat) => isGranted(providerId, cat.id)).length;
  }

  if (providersLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const providerList = providers ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-teal" />
          <h3 className="text-sm font-semibold text-white">Share Data with Providers</h3>
        </div>
        <Badge variant="neutral">{providerList.length} connected</Badge>
      </div>

      <p className="text-xs text-gray-500">
        Control which wellness data your practitioners and naturopaths can access.
        Toggle categories per provider for granular privacy control.
      </p>

      {providerList.length === 0 ? (
        <div className="text-center py-6 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <UserCheck className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No connected providers yet</p>
          <p className="text-xs text-gray-600 mt-1">
            Message a practitioner or naturopath to get started
          </p>
          <Link
            href="/messages"
            className="inline-flex items-center gap-1 mt-3 text-xs text-copper hover:underline"
          >
            <MessageSquare className="w-3 h-3" />
            Go to Messages
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {providerList.map((provider) => {
            const shared = grantedCount(provider.id);
            const isExpanded = expandedProvider === provider.id;
            const isPending = togglePermission.isPending || shareAll.isPending;

            return (
              <div
                key={provider.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
              >
                {/* Provider Header */}
                <button
                  onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                  className="w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                      provider.role === "naturopath"
                        ? "bg-sage/15 text-sage"
                        : "bg-portal-green/15 text-portal-green"
                    }`}
                  >
                    {provider.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-white truncate">{provider.name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{provider.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={shared === SHARE_CATEGORIES.length ? "active" : shared > 0 ? "pending" : "neutral"}
                    >
                      {shared}/{SHARE_CATEGORIES.length} shared
                    </Badge>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Category Toggles */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] px-3.5 py-3 space-y-2">
                    {/* Share All Button */}
                    {shared < SHARE_CATEGORIES.length && (
                      <button
                        onClick={() =>
                          shareAll.mutate({
                            providerId: provider.id,
                            providerName: provider.name,
                            providerRole: provider.role,
                          })
                        }
                        disabled={isPending}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-teal/10 text-teal text-xs font-medium hover:bg-teal/20 transition-colors disabled:opacity-50"
                      >
                        {isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        Share All Data
                      </button>
                    )}

                    {/* Individual Category Toggles */}
                    {SHARE_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const granted = isGranted(provider.id, cat.id);
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center gap-3 py-2 px-1"
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 ${cat.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white">{cat.label}</p>
                            <p className="text-[10px] text-gray-600">{cat.description}</p>
                          </div>
                          <button
                            onClick={() =>
                              togglePermission.mutate({
                                providerId: provider.id,
                                providerName: provider.name,
                                providerRole: provider.role,
                                category: cat.id,
                                granted: !granted,
                              })
                            }
                            disabled={isPending}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                              granted ? "bg-portal-green" : "bg-white/[0.1]"
                            } ${isPending ? "opacity-50" : ""}`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                                granted ? "translate-x-5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}

                    {/* Privacy note */}
                    <div className="flex items-start gap-2 pt-2 border-t border-white/[0.04]">
                      <Shield className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-gray-600">
                        Your data is encrypted and shared securely. You can revoke access at any time.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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

      {/* Share Data with Providers */}
      {userId && (
        <StaggerChild>
          <MotionCard className="p-5">
            <ShareWithProviders userId={userId} />
          </MotionCard>
        </StaggerChild>
      )}
    </PageTransition>
  );
}
