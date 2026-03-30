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
import { Coins, Flame, Gift, TrendingUp, Pill, Check, ArrowRight } from 'lucide-react';

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

      {/* ── Active Protocol (Condensed — links to /supplements for full view) ── */}
      <section className="px-4 lg:px-6 pb-6">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
          <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0"><div className="absolute blur-xl -inset-1.5 rounded-2xl opacity-60" style={{ backgroundColor: "#2DA5A033" }} /><div className="relative w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2DA5A033, #2DA5A01A, transparent)", border: "1px solid #2DA5A026" }}><Pill className="w-5 h-5 text-teal-400" strokeWidth={1.5} /></div></div>
              <div>
                <h2 className="text-base md:text-lg font-semibold text-white">Active Protocol</h2>
                <p className="text-xs text-white/30">Your daily supplement schedule</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: "14%" }} /></div>
              <span className="text-xs font-medium text-teal-400">14%</span>
            </div>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {[
              { name: "BioB Fusion\u2122 Methylated B Complex", dose: "1 capsule", time: "Morning", taken: true },
              { name: "Liposomal Vitamin D3 + K2", dose: "5000 IU", time: "Morning", taken: false },
              { name: "Algal Omega-3 DHA/EPA", dose: "1000mg", time: "Morning", taken: false },
              { name: "Liposomal CoQ10 (Ubiquinol)", dose: "200mg", time: "Afternoon", taken: false },
              { name: "Liposomal Magnesium L-Threonate", dose: "400mg", time: "Evening", taken: false },
              { name: "Melatonin (Extended Release)", dose: "3mg", time: "Evening", taken: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                  {item.taken ? (
                    <div className="w-5 h-5 rounded-full bg-teal-400/20 border border-teal-400/40 flex items-center justify-center"><Check className="w-3 h-3 text-teal-400" strokeWidth={2.5} /></div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-white/15" />
                  )}
                </div>
                <p className={`flex-1 text-sm ${item.taken ? "text-white/30 line-through" : "text-white/70"}`}>{item.name}</p>
                <span className="text-[10px] text-white/20">{item.dose}</span>
                <span className="text-[10px] text-white/15">{item.time}</span>
              </div>
            ))}
          </div>
          <div className="p-4 md:p-5 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-white/25">+1 more item</span>
            <a href="/supplements" className="min-h-[44px] px-4 py-2 rounded-lg bg-teal-400/10 border border-teal-400/30 text-teal-400 text-xs font-medium hover:bg-teal-400/15 transition-all flex items-center gap-1.5">
              View Full Protocol <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </a>
          </div>
        </div>
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
    </div>
  );
}
