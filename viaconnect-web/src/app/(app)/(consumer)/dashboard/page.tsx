'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScoreDisplay } from '@/components/ui/ScoreDisplay';
import { ActionCard } from '@/components/ui/ActionCard';
import { ProtocolCard } from '@/components/ui/ProtocolCard';
import { SupplementProtocolSection } from '@/components/protocol/SupplementProtocolSection';
import { GeneticInsightCard } from '@/components/ui/GeneticInsightCard';
import { VCButton } from '@/components/ui/VCButton';
import { PluginCTA } from '@/components/ui/PluginCTA';
import { ProactiveInsightCard } from '@/components/ui/ProactiveInsightCard';
import { Coins, Flame, Gift, TrendingUp } from 'lucide-react';

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

      {/* ── Supplement Protocol (3-Tab Premium Section) ──────────────── */}
      <section className="px-4 lg:px-6 pb-6">
        <SupplementProtocolSection
          supplements={[
            { id: '1', productName: 'BioB Fusion\u2122 Methylated B Complex', dosage: '1 capsule', deliveryMethod: 'Liposomal', priority: 'essential', takenToday: true },
            { id: '2', productName: 'Liposomal Vitamin D3 + K2 (MK-7)', dosage: '5000 IU', deliveryMethod: 'Liposomal', priority: 'essential', takenToday: false },
            { id: '3', productName: 'Algal Omega-3 DHA/EPA', dosage: '1000mg', priority: 'essential', takenToday: false },
          ]}
          protocol={{
            morning: [
              { id: '1', productName: 'BioB Fusion\u2122 Methylated B Complex', dosage: '1 capsule', deliveryMethod: 'Liposomal', priority: 'essential', dataSourceTag: 'caq', takenToday: true },
              { id: '2', productName: 'Liposomal Vitamin D3 + K2 (MK-7)', dosage: '5000 IU', deliveryMethod: 'Liposomal', priority: 'essential', dataSourceTag: 'caq', takenToday: false },
              { id: '3', productName: 'Algal Omega-3 DHA/EPA', dosage: '1000mg', priority: 'essential', dataSourceTag: 'caq', takenToday: false },
            ],
            afternoon: [
              { id: '4', productName: 'Liposomal CoQ10 (Ubiquinol)', dosage: '200mg', deliveryMethod: 'Liposomal', priority: 'recommended', dataSourceTag: 'caq', takenToday: false },
            ],
            evening: [
              { id: '5', productName: 'Liposomal Magnesium L-Threonate', dosage: '400mg', deliveryMethod: 'Liposomal', priority: 'essential', dataSourceTag: 'caq', takenToday: false },
              { id: '6', productName: 'Melatonin (Extended Release)', dosage: '3mg', priority: 'optional', dataSourceTag: 'caq', takenToday: false },
            ],
            asNeeded: [
              { id: '7', productName: 'L-Theanine', dosage: '200mg', priority: 'optional', dataSourceTag: 'caq', takenToday: false },
            ],
            gapAnalysis: { gaps: [{ nutrient: 'Vitamin D', deficit: '38% below target' }, { nutrient: 'Omega-3', deficit: '55% gap' }] },
            recommendations: [
              { id: 'r1', productName: 'Liposomal NAC (N-Acetyl Cysteine)', dosage: '600mg', timing: 'Morning', deliveryMethod: 'Liposomal', priority: 'recommended', reason: 'Glutathione precursor for detoxification and antioxidant defense', evidenceLevel: 'strong', dataSourceTag: 'caq' },
              { id: 'r2', productName: 'Micellar Ashwagandha (KSM-66\u00ae)', dosage: '600mg', timing: 'Afternoon', deliveryMethod: 'Micellar', priority: 'recommended', reason: 'Adaptogenic stress support based on elevated stress scores', evidenceLevel: 'strong', dataSourceTag: 'caq' },
            ],
          }}
          medications={[
            { id: 'm1', name: 'None' },
          ]}
          allergies={['None']}
          adverseReactions=""
          interactions={[]}
          tier={1}
        />
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
