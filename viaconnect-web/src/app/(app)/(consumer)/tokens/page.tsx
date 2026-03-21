"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TokenTransaction, Achievement, UserAchievement } from "@/lib/supabase/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import toast from "react-hot-toast";
import {
  Coins,
  Trophy,
  Lock,
  Gift,
  TrendingUp,
  Star,
  Target,
  Flame,
  Dna,
  Pill,
  Users,
  Calendar,
  Award,
  Zap,
  Heart,
} from "lucide-react";
import { PageTransition, StaggerChild, MotionCard } from "@/lib/motion";

const supabase = createClient();

const tiers = [
  { name: "Bronze", min: 0, max: 999, color: "text-copper", bg: "bg-copper/20", border: "border-copper/30" },
  { name: "Silver", min: 1000, max: 4999, color: "text-gray-300", bg: "bg-gray-300/20", border: "border-gray-300/30" },
  { name: "Gold", min: 5000, max: 9999, color: "text-portal-yellow", bg: "bg-portal-yellow/20", border: "border-portal-yellow/30" },
  { name: "Platinum", min: 10000, max: Infinity, color: "text-portal-purple", bg: "bg-portal-purple/20", border: "border-portal-purple/30" },
];

const achievementIcons: Record<string, React.ElementType> = {
  dna: Dna,
  pill: Pill,
  flame: Flame,
  users: Users,
  calendar: Calendar,
  target: Target,
  star: Star,
  award: Award,
  zap: Zap,
  heart: Heart,
};

const rewards = [
  { name: "10% Supplement Discount", cost: 500, icon: Gift },
  { name: "Free Shipping", cost: 250, icon: Gift },
  { name: "1 Month Gold Upgrade", cost: 1000, icon: Star },
  { name: "Practitioner Consultation", cost: 2500, icon: Users },
  { name: "Premium Panel Unlock", cost: 5000, icon: Dna },
  { name: "Custom Formulation", cost: 7500, icon: Zap },
];

function AnimatedCounter({ value, loading }: { value: number; loading: boolean }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (loading) return;
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 1000;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ref.current = value;
      }
    };
    requestAnimationFrame(animate);
  }, [value, loading]);

  if (loading) return <Skeleton className="h-12 w-40 inline-block" />;

  return <span>{display.toLocaleString()}</span>;
}

export default function TokensPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

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

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["token-transactions", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("token_transactions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as TokenTransaction[];
    },
    enabled: !!userId,
  });

  const { data: achievements } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("*").order("token_reward");
      return (data ?? []) as Achievement[];
    },
  });

  const { data: userAchievements } = useQuery({
    queryKey: ["user-achievements", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", userId!);
      return (data ?? []) as UserAchievement[];
    },
    enabled: !!userId,
  });

  const balance = tokens?.balance ?? 0;
  const lifetime = tokens?.lifetime_earned ?? 0;
  const currentTier = tiers.find((t) => balance >= t.min && balance <= t.max) ?? tiers[0];
  const nextTier = tiers.find((t) => t.min > balance);
  const progressToNext = nextTier
    ? ((balance - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  const unlockedIds: Record<string, boolean> = {};
  (userAchievements ?? []).forEach((ua) => { unlockedIds[ua.achievement_id] = true; });

  const actionTypesSet: Record<string, boolean> = {};
  (transactions ?? []).forEach((t) => { actionTypesSet[t.action] = true; });
  const actionTypes = Object.keys(actionTypesSet);

  const filteredTx = actionFilter
    ? (transactions ?? []).filter((t) => t.action === actionFilter)
    : transactions ?? [];

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      {/* Top: Balance + Tier */}
      <StaggerChild>
      <MotionCard className={`p-8 text-center border ${currentTier.border}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Coins className="w-6 h-6 text-portal-yellow" />
          <span className="text-sm text-gray-400 uppercase tracking-wider">ViaTokens Balance</span>
        </div>
        <p className="text-5xl font-bold text-white">
          <AnimatedCounter value={balance} loading={tokensLoading} />{" "}
          <span className="text-xl text-gray-400 font-normal">VT</span>
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Badge variant="pending">
            <span className={currentTier.color}>{currentTier.name}</span>
          </Badge>
          {!tokensLoading && (
            <span className="text-xs text-gray-500">
              Lifetime earned: {lifetime.toLocaleString()} VT
            </span>
          )}
        </div>
        {nextTier && (
          <div className="max-w-xs mx-auto mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{currentTier.name}</span>
              <span>{nextTier.name} ({nextTier.min.toLocaleString()} VT)</span>
            </div>
            <Progress value={progressToNext} color={`${currentTier.bg.replace("/20", "")}`} />
          </div>
        )}
      </MotionCard>
      </StaggerChild>

      <StaggerChild className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Achievements */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-portal-yellow" />
            Achievements
          </h2>
          {(achievements ?? []).length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No achievements yet"
              description="Achievements will appear as they become available."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(achievements ?? []).map((ach) => {
                const unlocked = !!unlockedIds[ach.id];
                const IconComp = achievementIcons[ach.icon ?? "star"] ?? Star;
                return (
                  <TooltipProvider key={ach.id}>
                    <Tooltip content={`${ach.description} — Earn ${ach.token_reward} VT`}>
                      <div
                        className={`p-4 rounded-xl border text-center transition-all ${
                          unlocked
                            ? "border-portal-green/30 bg-portal-green/5"
                            : "border-white/[0.06] bg-white/[0.02] opacity-50"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center ${
                          unlocked ? "bg-portal-green/20" : "bg-white/[0.06]"
                        }`}>
                          {unlocked ? (
                            <IconComp className="w-5 h-5 text-portal-green" />
                          ) : (
                            <Lock className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <p className={`text-xs font-medium mt-2 ${unlocked ? "text-white" : "text-gray-500"}`}>
                          {ach.name}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          +{ach.token_reward} VT
                        </p>
                      </div>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Transaction History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-copper" />
            Token History
          </h2>

          {/* Action type filter */}
          {actionTypes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActionFilter(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !actionFilter
                    ? "bg-copper/20 text-copper border border-copper/30"
                    : "bg-white/[0.04] text-gray-400 border border-white/[0.06]"
                }`}
              >
                All
              </button>
              {actionTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setActionFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    actionFilter === type
                      ? "bg-copper/20 text-copper border border-copper/30"
                      : "bg-white/[0.04] text-gray-400 border border-white/[0.06]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {txLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTx.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="No transactions yet"
              description="Start earning tokens by logging supplements and completing achievements."
            />
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="sticky top-0 bg-dark-card z-10">
                    <tr className="border-b border-white/[0.06]">
                      <th className="py-3 px-4 font-medium text-xs text-gray-400">Date</th>
                      <th className="py-3 px-4 font-medium text-xs text-gray-400">Action</th>
                      <th className="py-3 px-4 font-medium text-xs text-gray-400 text-right">Amount</th>
                      <th className="py-3 px-4 font-medium text-xs text-gray-400 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map((tx) => (
                      <tr key={tx.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 text-xs text-gray-400">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-300">{tx.action}</td>
                        <td className={`py-2.5 px-4 text-xs font-medium text-right ${
                          tx.amount > 0 ? "text-portal-green" : "text-rose"
                        }`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-400 text-right">
                          {tx.balance_after.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </StaggerChild>

      {/* Bottom: Rewards Redemption */}
      <StaggerChild className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Gift className="w-5 h-5 text-plum" />
          Rewards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => {
            const canRedeem = balance >= reward.cost;
            return (
              <MotionCard key={reward.name} className={`p-5 ${canRedeem ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between mb-3">
                  <reward.icon className="w-6 h-6 text-plum" />
                  <span className="text-sm font-bold text-portal-yellow">
                    {reward.cost.toLocaleString()} VT
                  </span>
                </div>
                <p className="text-sm text-white font-medium">{reward.name}</p>
                <Button
                  size="sm"
                  variant={canRedeem ? "primary" : "secondary"}
                  disabled={!canRedeem}
                  className="w-full mt-3"
                  onClick={() => {
                    if (canRedeem) toast.success(`Redeemed: ${reward.name}`);
                  }}
                >
                  {canRedeem ? "Redeem" : "Not enough VT"}
                </Button>
              </MotionCard>
            );
          })}
        </div>
      </StaggerChild>
    </PageTransition>
  );
}
