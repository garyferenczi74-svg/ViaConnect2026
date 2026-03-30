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
import { Coins, Flame, Gift, TrendingUp, Pill, Check, ArrowRight, Sunrise, Sun, Moon, Clock, RefreshCw } from 'lucide-react';
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

/* ─── Mock Data ────────────────────────────────────────────────────────────── */

const DAILY_ACTIONS = [
  {
    icon: 'pill',
    title: 'Take MTHFR+ with breakfast',
    subtitle: 'Methylfolate 1000mcg — optimized for your C677T variant',
    time: '8:00 AM',
    status: 'pending' as const,
    tokens: 5,
  },
  {
    icon: 'heart',
    title: 'Morning HRV check-in',
    subtitle: 'Log your resting heart rate variability',
    time: '7:30 AM',
    status: 'completed' as const,
    tokens: 3,
  },
  {
    icon: 'flask',
    title: 'Schedule bloodwork by Friday',
    subtitle: 'Methylation panel + Vitamin D + Homocysteine',
    time: 'This week',
    status: 'upcoming' as const,
    tokens: 50,
  },
];

const DAILY_SCORES = [
  { value: 78, label: 'Recovery', color: 'teal' as const, trend: 'up' as const, trendValue: '+5' },
  { value: 85, label: 'Sleep', color: 'teal' as const, trend: 'stable' as const },
  { value: 42, label: 'Strain', color: 'amber' as const, trend: 'down' as const, trendValue: '-8' },
  { value: 91, label: 'Compliance', color: 'green' as const, trend: 'up' as const, trendValue: '+2%' },
];

/* ─── Active Protocol Full Component ───────────────────────────────────────── */

function PIcon({ icon: Icon, color, size = "sm" }: { icon: LucideIcon; color: string; size?: "sm" | "md" }) {
  const s = size === "md" ? { box: "w-12 h-12", ico: "w-5 h-5", glow: "blur-xl -inset-1.5" } : { box: "w-9 h-9", ico: "w-4 h-4", glow: "blur-lg -inset-1" };
  return (<div className="relative flex-shrink-0"><div className={`absolute ${s.glow} rounded-2xl opacity-60 pointer-events-none`} style={{ backgroundColor: `${color}33` }} /><div className={`relative ${s.box} rounded-xl flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${color}33, ${color}1A, transparent)`, border: `1px solid ${color}26` }}><Icon className={s.ico} style={{ color }} strokeWidth={1.5} /></div></div>);
}

const PROTOCOL_DATA = {
  morning: [
    { id: "1", name: "BioB Fusion\u2122 Methylated B Complex", dose: "1 capsule", delivery: "Liposomal", priority: "essential", taken: true },
    { id: "2", name: "Liposomal Vitamin D3 + K2 (MK-7)", dose: "5000 IU", delivery: "Liposomal", priority: "essential", taken: false },
    { id: "3", name: "Algal Omega-3 DHA/EPA", dose: "1000mg", delivery: "", priority: "essential", taken: false },
  ],
  afternoon: [
    { id: "4", name: "Liposomal CoQ10 (Ubiquinol)", dose: "200mg", delivery: "Liposomal", priority: "recommended", taken: false },
  ],
  evening: [
    { id: "5", name: "Liposomal Magnesium L-Threonate", dose: "400mg", delivery: "Liposomal", priority: "essential", taken: false },
    { id: "6", name: "Melatonin (Extended Release)", dose: "3mg", delivery: "", priority: "optional", taken: false },
  ],
  asNeeded: [
    { id: "7", name: "L-Theanine", dose: "200mg", delivery: "", priority: "optional", taken: false },
  ],
};

const TIME_SLOTS: { id: string; label: string; icon: LucideIcon; time: string; color: string }[] = [
  { id: "morning", label: "Morning", icon: Sunrise, time: "7:00 AM", color: "#FBBF24" },
  { id: "afternoon", label: "Afternoon", icon: Sun, time: "12:00 PM", color: "#B75E18" },
  { id: "evening", label: "Evening", icon: Moon, time: "7:00 PM", color: "#60A5FA" },
  { id: "asNeeded", label: "As Needed", icon: Clock, time: "Flexible", color: "#9CA3AF" },
];

function ProtocolCheckRow({ item }: { item: typeof PROTOCOL_DATA.morning[0] }) {
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

function ActiveProtocolFull() {
  const all = [...PROTOCOL_DATA.morning, ...PROTOCOL_DATA.afternoon, ...PROTOCOL_DATA.evening, ...PROTOCOL_DATA.asNeeded];
  const takenCount = all.filter(i => i.taken).length;
  const pct = Math.round((takenCount / all.length) * 100);

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#141E33] via-[#1A2744] to-[#1A2744]" />
      <div className="absolute inset-0 rounded-2xl border border-white/[0.08]" />
      <div className="relative z-10">
        {/* Header */}
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

        {/* Time Slot Cards */}
        <div className="p-5 md:p-6 space-y-4">
          {TIME_SLOTS.map((slot) => {
            const items = (PROTOCOL_DATA as Record<string, typeof PROTOCOL_DATA.morning>)[slot.id] || [];
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

        {/* Footer */}
        <div className="px-5 md:px-6 pb-5 md:pb-6">
          <a href="/supplements" className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-400/10 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/15 transition-all">
            View Full Supplement Protocol <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard Page ───────────────────────────────────────────────────────── */

export default function ConsumerDashboard() {
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
            <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Your Bio Optimization Score
            </p>
          </div>
        </div>
      </section>

      {/* ── Hero Score ────────────────────────────────────────────────── */}
      <section className="flex justify-center py-6">
        <ScoreDisplay
          value={87}
          maxValue={100}
          label="Bio Optimization"
          trend="up"
          trendValue="+3 from yesterday"
          color="teal"
          size="xl"
        />
      </section>

      {/* ── Plugin CTAs ─────────────────────────────────────────────── */}
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
        </div>
      </section>

      {/* ── Daily Scores ──────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6 pb-6">
        <p className="text-overline mb-4">Daily Scores</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {DAILY_SCORES.map((score) => (
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
      <section className="px-4 lg:px-6 pb-2">
        <ProactiveInsightCard
          type="plan_adjustment"
          title="AI adjusted your plan for today"
          summary="NAD+ moved to morning based on poor sleep + COMT variant. Recovery score 52/100 — moderate activity recommended."
          urgency="attention"
          actions={[
            { label: 'View Changes', route: '/supplements' },
            { label: 'Ask AI Why', route: '/ai' },
          ]}
          geneticBadge={{ gene: 'COMT', variant: 'Val158Met' }}
        />
      </section>

      {/* ── Today's Precision Actions ─────────────────────────────────── */}
      <section className="px-4 lg:px-6 pb-6">
        <p className="text-overline mb-4">Today&apos;s Precision Actions</p>
        <div className="flex flex-col gap-3">
          {DAILY_ACTIONS.map((action, i) => (
            <ActionCard key={i} {...action} />
          ))}
        </div>
      </section>

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
        <ActiveProtocolFull />
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
                2,847
                <span className="text-body-sm ml-1" style={{ color: 'var(--text-tertiary)' }}>Helix$</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Flame size={16} style={{ color: '#F39C12' }} />
              <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                12-day streak
              </span>
              <span
                className="text-caption font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(45, 165, 160, 0.12)', color: 'var(--teal-400)' }}
              >
                2x multiplier
              </span>
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

      {/* ── Retake Assessment ─────────────────────────────────────────── */}
      <section className="px-4 lg:px-6 pb-8">
        <RetakeAssessmentCard context="dashboard" />
      </section>
    </div>
  );
}

function RetakeAssessmentCard({ context = "dashboard" }: { context?: "dashboard" | "supplements" | "analytics" }) {
  const [confirming, setConfirming] = React.useState(false);
  const subtitles = {
    dashboard: "Retake the Clinical Assessment Questionnaire to update your health profile, supplement protocol, and Bio Optimization score with your current status",
    supplements: "Retake the Clinical Assessment Questionnaire to update your supplement protocol and recommendations with your current health status",
    analytics: "Retake the Clinical Assessment Questionnaire to update your symptom profile with your current health status",
  };
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-5 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0"><div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#B75E1833" }} /><div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #B75E1833, #B75E181A, transparent)", border: "1px solid #B75E1826" }}><RefreshCw className="w-4 h-4 text-orange-400" strokeWidth={1.5} /></div></div>
          <div><h4 className="text-sm font-semibold text-white">Update Your Assessment</h4><p className="text-xs text-white/30 mt-1 leading-relaxed max-w-md">{subtitles[context]}</p></div>
        </div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-400/10 border border-orange-400/30 text-orange-400 text-sm font-medium hover:bg-orange-400/15 transition-all flex items-center gap-2 w-full sm:w-auto justify-center flex-shrink-0"><RefreshCw className="w-4 h-4" strokeWidth={1.5} /> Retake Assessment</button>
        ) : (
          <div className="w-full sm:w-auto space-y-3">
            <div className="rounded-lg bg-orange-400/5 border border-orange-400/10 px-4 py-3"><p className="text-xs text-white/40 leading-relaxed">This will take you through all 7 phases. Your previous answers will be <span className="text-white/60 font-medium">pre-filled</span> so you only need to update what has changed.</p><p className="text-[10px] text-white/25 mt-2">All engines will regenerate after completion.</p></div>
            <div className="flex gap-2"><a href="/onboarding/i-caq-intro" className="min-h-[44px] flex-1 px-5 py-2.5 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/20 transition-all flex items-center gap-2 justify-center"><Check className="w-4 h-4" strokeWidth={2} /> Yes, Start Assessment</a><button onClick={() => setConfirming(false)} className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm hover:bg-white/[0.08] transition-all flex items-center justify-center">Cancel</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
