'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScoreDisplay } from '@/components/ui/ScoreDisplay';
import { ActionCard } from '@/components/ui/ActionCard';
import { ProtocolCard } from '@/components/ui/ProtocolCard';
import { GeneticInsightCard } from '@/components/ui/GeneticInsightCard';
import { VCButton } from '@/components/ui/VCButton';
import { PluginCTA } from '@/components/ui/PluginCTA';
import { ProactiveInsightCard } from '@/components/ui/ProactiveInsightCard';
import { Coins, Flame, Gift, TrendingUp, Pill, Check, ArrowRight, Sunrise, Sun, Moon, Clock, RefreshCw, Lightbulb, Loader2 } from 'lucide-react';
import { QuickReassessmentCard } from '@/components/dashboard/QuickReassessmentCard';
import { DailyUltrathinkTip } from '@/components/dashboard/DailyUltrathinkTip';
import { PatternCirclePreview } from '@/components/community/PatternCirclePreview';
import { useUserDashboardData } from '@/hooks/useUserDashboardData';
import type { DashboardSupplement } from '@/hooks/useUserDashboardData';
import type { LucideIcon } from 'lucide-react';

/* ─── Typewriter Hook ──────────────────────────────────────────────────────── */

function useTypewriter(text: string, speed = 40) {
  const [display, setDisplay] = useState('');
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplay('');
    setDone(false);
    const timer = setInterval(() => {
      idx.current++;
      if (idx.current >= text.length) {
        setDisplay(text);
        setDone(true);
        clearInterval(timer);
      } else {
        setDisplay(text.slice(0, idx.current));
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { display, done };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ─── Active Protocol Full Component ───────────────────────────────────────── */

function PIcon({ icon: Icon, color, size = "sm" }: { icon: LucideIcon; color: string; size?: "sm" | "md" }) {
  const s = size === "md" ? { box: "w-12 h-12", ico: "w-5 h-5", glow: "blur-xl -inset-1.5" } : { box: "w-9 h-9", ico: "w-4 h-4", glow: "blur-lg -inset-1" };
  return (<div className="relative flex-shrink-0"><div className={`absolute ${s.glow} rounded-2xl opacity-60 pointer-events-none`} style={{ backgroundColor: `${color}33` }} /><div className={`relative ${s.box} rounded-xl flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${color}33, ${color}1A, transparent)`, border: `1px solid ${color}26` }}><Icon className={s.ico} style={{ color }} strokeWidth={1.5} /></div></div>);
}

const TIME_SLOTS: { id: string; label: string; icon: LucideIcon; time: string; color: string }[] = [
  { id: "morning", label: "Morning", icon: Sunrise, time: "7:00 AM", color: "#FBBF24" },
  { id: "afternoon", label: "Afternoon", icon: Sun, time: "12:00 PM", color: "#B75E18" },
  { id: "evening", label: "Evening", icon: Moon, time: "7:00 PM", color: "#60A5FA" },
  { id: "asNeeded", label: "As Needed", icon: Clock, time: "Flexible", color: "#9CA3AF" },
];

interface ProtocolItem {
  id: string;
  name: string;
  dose: string;
  delivery: string;
  priority: string;
  taken: boolean;
}

function buildProtocolFromSupplements(supplements: DashboardSupplement[]): Record<string, ProtocolItem[]> {
  const protocol: Record<string, ProtocolItem[]> = { morning: [], afternoon: [], evening: [], asNeeded: [] };

  supplements.forEach((s) => {
    const freq = (s.frequency || '').toLowerCase();
    const category = (s.category || '').toLowerCase();
    let slot = 'morning';

    if (freq.includes('evening') || freq.includes('night') || freq.includes('bedtime') || category.includes('sleep')) {
      slot = 'evening';
    } else if (freq.includes('afternoon') || freq.includes('midday')) {
      slot = 'afternoon';
    } else if (freq.includes('needed') || freq.includes('prn')) {
      slot = 'asNeeded';
    }

    protocol[slot].push({
      id: s.id,
      name: s.product_name || s.supplement_name || 'Supplement',
      dose: s.dosage || '',
      delivery: s.dosage_form || '',
      priority: s.is_ai_recommended ? 'recommended' : 'essential',
      taken: false,
    });
  });

  return protocol;
}

function ProtocolCheckRow({ item }: { item: ProtocolItem }) {
  const [taken, setTaken] = React.useState(item.taken);
  return (
    <div className="flex items-center gap-4 px-4 md:px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
      <button onClick={() => setTaken(!taken)} className="min-w-[44px] min-h-[44px] flex items-center justify-center">
        {taken ? <div className="w-6 h-6 rounded-full bg-teal-400/20 border border-teal-400/40 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-teal-400" strokeWidth={2.5} /></div> : <div className="w-6 h-6 rounded-full border-2 border-white/15 hover:border-teal-400/30 transition-colors" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${taken ? "text-white/40 line-through" : "text-white/80"}`}>{item.name}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="text-[10px] text-white/25">{item.dose}</span>
          {item.delivery && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/20">{item.delivery}</span>}
        </div>
      </div>
      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider flex-shrink-0 ${item.priority === "essential" ? "bg-teal-400/10 text-teal-400/60 border border-teal-400/15" : item.priority === "recommended" ? "bg-orange-400/10 text-orange-400/60 border border-orange-400/15" : "bg-white/5 text-white/25 border border-white/[0.08]"}`}>{item.priority}</span>
    </div>
  );
}

function ActiveProtocolFull({ supplements }: { supplements: DashboardSupplement[] }) {
  const protocolData = buildProtocolFromSupplements(supplements);
  const all = Object.values(protocolData).flat();

  if (all.length === 0) {
    return (
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#141E33] via-[#1A2744] to-[#1A2744]" />
        <div className="absolute inset-0 rounded-2xl border border-white/[0.08]" />
        <div className="relative z-10 p-8 text-center">
          <PIcon icon={Pill} color="#2DA5A0" size="md" />
          <h2 className="text-base font-bold text-white mt-4">No Active Protocol Yet</h2>
          <p className="text-xs text-white/40 mt-2 max-w-sm mx-auto">Complete your assessment to receive a personalized supplement protocol, or add supplements manually.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <a href="/onboarding/i-caq-intro" className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/20 transition-all">Take Assessment</a>
            <a href="/supplements" className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/[0.08] transition-all">Browse Supplements</a>
          </div>
        </div>
      </div>
    );
  }

  const takenCount = all.filter(i => i.taken).length;
  const pct = Math.round((takenCount / all.length) * 100);

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#141E33] via-[#1A2744] to-[#1A2744]" />
      <div className="absolute inset-0 rounded-2xl border border-white/[0.08]" />
      <div className="relative z-10">
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <PIcon icon={Pill} color="#2DA5A0" size="md" />
            <div>
              <h2 className="text-base md:text-lg font-bold text-white">Active Protocol</h2>
              <p className="text-xs text-white/30">Your daily supplement schedule</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${pct}%` }} /></div>
            <span className="text-xs font-medium text-teal-400">{takenCount}/{all.length} · {pct}%</span>
          </div>
        </div>
        <div className="p-5 md:p-6 space-y-4">
          {TIME_SLOTS.map((slot) => {
            const items = protocolData[slot.id] || [];
            if (!items.length) return null;
            return (
              <div key={slot.id} className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
                <div className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-white/5">
                  <PIcon icon={slot.icon} color={slot.color} size="sm" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white">{slot.label}</h4>
                    <p className="text-[10px] text-white/25">{slot.time}</p>
                  </div>
                  <span className="text-xs text-white/20">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {items.map((item) => <ProtocolCheckRow key={item.id} item={item} />)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 md:px-6 pb-5 md:pb-6">
          <a href="/supplements" className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-400/10 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/15 transition-all">
            View Full Supplement Protocol <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Loading Skeleton ─────────────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="min-h-screen w-full text-white overflow-x-hidden" style={{ background: 'var(--gradient-hero)' }}>
      <section className="px-4 lg:px-6 pt-6 pb-2">
        <div className="h-8 w-64 bg-white/5 rounded-lg animate-pulse" />
      </section>
      <section className="flex justify-center py-6">
        <div className="w-[180px] h-[180px] rounded-full bg-white/5 animate-pulse" />
      </section>
      <section className="px-4 lg:px-6 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      </section>
      <section className="px-4 lg:px-6 pb-6">
        <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
      </section>
    </div>
  );
}

/* ─── Dashboard Page ───────────────────────────────────────────────────────── */

export default function ConsumerDashboard() {
  const { loading, profile, supplements, adherence, bioHistory, helixBalance, streak, assessmentCompleted } = useUserDashboardData();

  const [userName, setUserName] = useState("there");
  useEffect(() => {
    async function loadName() {
      const { getDisplayName } = await import("@/lib/user/get-display-name");
      const name = await getDisplayName();
      setUserName(name);
    }
    loadName();
  }, []);

  const greeting = `${getGreeting()}, ${userName}`;
  const { display, done } = useTypewriter(greeting, 40);

  if (loading) return <DashboardSkeleton />;

  // Compute real scores from data
  const bioScore = profile?.bio_optimization_score ?? 0;
  const bioTier = profile?.bio_optimization_tier || 'Not Assessed';
  const bioTrend = bioHistory.length >= 2
    ? bioHistory[bioHistory.length - 1].score - bioHistory[bioHistory.length - 2].score
    : 0;

  // Compute adherence-based compliance score
  const avgAdherence = adherence.length > 0
    ? Math.round(adherence.reduce((sum, a) => sum + (a.adherence_percent || 0), 0) / adherence.length)
    : 0;
  const avgStreak = adherence.length > 0
    ? Math.round(adherence.reduce((sum, a) => sum + (a.streak_days || 0), 0) / adherence.length)
    : 0;

  // Build daily scores from real data (bio score components if available, otherwise from adherence)
  const latestBreakdown = bioHistory.length > 0 ? bioHistory[bioHistory.length - 1].breakdown as Record<string, number> | null : null;
  const dailyScores = [
    { value: latestBreakdown?.recovery ?? Math.round(bioScore * 0.9), label: 'Recovery', color: 'teal' as const, trend: 'stable' as const, trendValue: '' },
    { value: latestBreakdown?.sleep ?? Math.round(bioScore * 0.95), label: 'Sleep', color: 'teal' as const, trend: 'stable' as const, trendValue: '' },
    { value: latestBreakdown?.strain ?? Math.round(bioScore * 0.5), label: 'Strain', color: (latestBreakdown?.strain ?? bioScore * 0.5) < 50 ? 'amber' as const : 'teal' as const, trend: 'stable' as const, trendValue: '' },
    { value: avgAdherence || Math.round(supplements.length > 0 ? 50 : 0), label: 'Compliance', color: 'green' as const, trend: avgAdherence >= 80 ? 'up' as const : 'stable' as const, trendValue: avgAdherence > 0 ? `${avgAdherence}%` : '' },
  ];

  // Helix rewards — real data
  const helixBal = helixBalance?.balance ?? 0;
  const streakDays = streak?.current_count ?? 0;
  const multiplier = streakDays >= 30 ? '4x' : streakDays >= 14 ? '2x' : streakDays >= 7 ? '1.5x' : '1x';

  // Days since assessment for reassessment card
  const daysSinceCAQ = profile?.caq_completed_at
    ? Math.floor((Date.now() - new Date(profile.caq_completed_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div
      className="min-h-screen w-full text-white overflow-x-hidden"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* ── Greeting Section ──────────────────────────────────────────── */}
      <section className="px-4 lg:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-2" style={{ color: '#FFFFFF' }}>
              {display}
              {!done && (
                <span
                  className="inline-block w-[2px] h-[0.85em] ml-1 align-text-bottom animate-pulse"
                  style={{ background: 'var(--teal-500)' }}
                />
              )}
            </h1>
          </div>
        </div>
      </section>

      {/* ── Hero Score ────────────────────────────────────────────────── */}
      <section className="flex justify-center py-6">
        {assessmentCompleted ? (
          <ScoreDisplay
            value={bioScore}
            maxValue={100}
            label="Bio Optimization"
            trend={bioTrend > 0 ? "up" : bioTrend < 0 ? "down" : "stable"}
            trendValue={bioTrend !== 0 ? `${bioTrend > 0 ? '+' : ''}${bioTrend} from last` : bioTier}
            color="teal"
            size="xl"
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] rounded-full bg-white/5 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl font-bold text-white/20">0</p>
                <p className="text-xs text-white/30 mt-1">Bio Optimization</p>
              </div>
            </div>
            <p className="text-white/50 text-xs text-center">Complete your assessment to unlock your score</p>
            <a href="/onboarding/i-caq-intro" className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity">
              Take Assessment
            </a>
          </div>
        )}
      </section>

      {/* ── Plugin CTAs + Update Assessment ─────────────────────────── */}
      <section className="px-4 lg:px-6 pb-2">
        <div className="flex flex-col sm:flex-row gap-3">
          <PluginCTA
            type="wearable"
            navigateTo="/plugins/wearables"
            connectedCount={2}
            connectedDevices={[
              { name: 'Oura Ring', icon: '💍' },
              { name: 'Apple Watch', icon: '⌚' },
            ]}
            variant="hero"
          />
          <PluginCTA
            type="app"
            navigateTo="/plugins/apps"
            connectedCount={0}
            variant="hero"
          />
          <RetakeAssessmentCard context="dashboard" />
        </div>
      </section>

      {/* ── Daily Scores ──────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6 pb-6">
        <p className="text-overline mb-4">Daily Scores</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dailyScores.map((score) => (
            <GlassCard key={score.label} variant="score" hover={false} className="flex items-center justify-center py-5">
              <ScoreDisplay
                value={score.value}
                label={score.label}
                color={score.color}
                trend={score.trend}
                trendValue={score.trendValue}
                size="sm"
              />
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ── AI Proactive Insight ─────────────────────────────────────── */}
      {assessmentCompleted && (
        <section className="px-4 lg:px-6 pb-2">
          <ProactiveInsightCard
            type="plan_adjustment"
            title={profile?.bio_optimization_opportunities?.[0] ? `Focus area: ${profile.bio_optimization_opportunities[0]}` : "AI adjusted your plan for today"}
            summary={profile?.bio_optimization_opportunities?.length ? `Your assessment identified opportunities in: ${profile.bio_optimization_opportunities.join(', ')}. Follow your protocol to improve these areas.` : "Follow your supplement protocol consistently to improve your Bio Optimization score."}
            urgency="attention"
            actions={[
              { label: 'View Changes', route: '/supplements' },
              { label: 'Ask AI Why', route: '/ai' },
            ]}
          />
        </section>
      )}

      {/* ── Today's Precision Actions ─────────────────────────────────── */}
      {supplements.length > 0 && (
        <section className="px-4 lg:px-6 pb-6">
          <p className="text-overline mb-4">Today&apos;s Precision Actions</p>
          <div className="flex flex-col gap-3">
            {supplements.slice(0, 3).map((s, i) => (
              <ActionCard
                key={s.id || i}
                icon="pill"
                title={`Take ${s.product_name || s.supplement_name}`}
                subtitle={[s.dosage, s.dosage_form].filter(Boolean).join(' — ')}
                time={s.frequency || 'Daily'}
                status="pending"
                tokens={5}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Insights of the Day ────────────────────────────────── */}
      <section className="px-4 lg:px-6 pb-6">
        <p className="text-overline mb-4">Insights of the Day</p>
        <GeneticInsightCard
          gene="MTHFR"
          variant="C677T"
          rsId="rs1801133"
          genotype="CT"
          impact="Moderate"
          insight="Your heterozygous MTHFR variant reduces methylfolate conversion by ~35%. Your MTHFR+ supplement provides the active L-methylfolate form, bypassing this enzymatic bottleneck."
          relatedProduct="MTHFR+"
          productAction={() => {}}
        />
      </section>

      {/* ── Active Protocol (Full Daily Schedule) ──────────────────────── */}
      <section className="px-4 lg:px-6 pb-6">
        <ActiveProtocolFull supplements={supplements} />
      </section>

      {/* ── Helix Rewards ─────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6 pb-8">
        <p className="text-overline mb-4">Helix Rewards</p>
        <GlassCard variant="default" hover={false} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(45, 165, 160, 0.12)' }}
            >
              <Coins size={20} style={{ color: 'var(--teal-400)' }} />
            </div>
            <div>
              <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>Balance</p>
              <p className="text-display-md text-white" style={{ fontSize: '32px', fontWeight: 700 }}>
                {helixBal.toLocaleString()}
                <span className="text-body-sm ml-1" style={{ color: 'var(--text-tertiary)' }}>Helix$</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Flame size={16} style={{ color: '#F39C12' }} />
              <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                {streakDays > 0 ? `${streakDays}-day streak` : 'Start a streak today'}
              </span>
              {streakDays >= 7 && (
                <span
                  className="text-caption font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(45, 165, 160, 0.12)', color: 'var(--teal-400)' }}
                >
                  {multiplier} multiplier
                </span>
              )}
            </div>
          </div>

          <VCButton variant="secondary" size="sm">
            <div className="flex items-center gap-2">
              <Gift size={14} />
              Helix Rewards Hub
            </div>
          </VCButton>
        </GlassCard>
      </section>

      {/* ── Daily Ultrathink Tip ────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <DailyUltrathinkTip tip={{
          content: profile?.bio_optimization_opportunities?.[0]
            ? `Based on your assessment, focus on: ${profile.bio_optimization_opportunities[0]}. Small daily improvements compound over time.`
            : "Your symptom pattern suggests morning cortisol may be a factor. Try 10 minutes of sunlight exposure within 30 minutes of waking to support your circadian rhythm.",
          sourcePattern: profile?.bio_optimization_tier ? `${profile.bio_optimization_tier} tier protocol` : "HPA axis + circadian"
        }} />
      </section>

      {/* ── 30-Day Check-In ────────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <QuickReassessmentCard daysElapsed={daysSinceCAQ || 0} />
      </section>

      {/* ── Pattern Circles (Coming Soon) ──────────────────────────── */}
      <section className="px-4 lg:px-6 pb-8">
        <PatternCirclePreview userPatterns={["HPA Axis Dysregulation", "Methylation Pathway"]} />
      </section>
    </div>
  );
}

function RetakeAssessmentCard({ context = "dashboard" }: { context?: "dashboard" | "supplements" | "analytics" }) {
  const [confirming, setConfirming] = React.useState(false);

  return (
    <div className="flex-1 rounded-xl bg-white/[0.02] border border-orange-400/15 p-4 flex flex-col justify-between gap-3 min-w-0">
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#B75E1833" }} />
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #B75E1833, #B75E181A, transparent)", border: "1px solid #B75E1826" }}>
            <RefreshCw className="w-4 h-4 text-orange-400" strokeWidth={1.5} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">Update Assessment</h4>
          <p className="text-[11px] text-white/30 mt-0.5 leading-relaxed">
            {confirming ? "Pre-filled with your previous answers" : "Retake CAQ to refresh your protocol"}
          </p>
        </div>
        {!confirming ? (
          <a href="/onboarding/i-caq-intro" className="min-h-[36px] px-3 py-1.5 rounded-lg bg-orange-400/10 border border-orange-400/30 text-orange-400 text-[11px] font-medium hover:bg-orange-400/15 transition-all flex items-center gap-1.5 flex-shrink-0">
            <RefreshCw className="w-3 h-3" strokeWidth={1.5} /> Retake
          </a>
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href="/onboarding/i-caq-intro" className="min-h-[36px] px-3 py-1.5 rounded-lg bg-teal-400/15 border border-teal-400/30 text-teal-400 text-[11px] font-medium hover:bg-teal-400/20 transition-all flex items-center gap-1.5">
              <Check className="w-3 h-3" strokeWidth={2} /> Start
            </a>
            <button onClick={() => setConfirming(false)} className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-[11px] hover:bg-white/[0.08] transition-all">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
