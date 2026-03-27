'use client';

import Link from 'next/link';
import {
  Watch,
  Smartphone,
  FlaskConical,
  Dna,
  Brain,
  BarChart3,
  Shield,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { VCButton } from '@/components/ui/VCButton';

const activeConnections = [
  { name: 'Apple Watch', connected: true },
  { name: 'Oura Ring', connected: true },
  { name: 'MyFitnessPal', connected: true },
];

const whyConnectCards = [
  {
    icon: Dna,
    title: 'Genetic Context',
    text: 'Your phenotypic data is interpreted through the lens of your unique genetic profile — no generic advice.',
  },
  {
    icon: Brain,
    title: 'AI Gets Smarter',
    text: 'Every data source makes ARIA more accurate, surfacing insights that matter to your genome.',
  },
  {
    icon: BarChart3,
    title: 'Deeper Insights',
    text: 'Cross-referencing wearables, labs, and nutrition reveals patterns a single source never could.',
  },
];

const privacyItems = [
  { icon: Shield, text: 'HIPAA Compliant' },
  { icon: Lock, text: 'End-to-end Encryption' },
  { icon: Shield, text: 'We Never Sell Your Data' },
  { icon: Lock, text: 'Disconnect Anytime' },
];

export default function PluginsPage() {
  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--gradient-hero)' }}
    >
      <div className="mx-auto max-w-2xl px-5 pt-12">
        {/* ── Header ── */}
        <header className="mb-10">
          <h1
            className="text-heading-1 mb-2"
            style={{ color: 'var(--text-heading-orange)' }}
          >
            Supercharge Your Precision Health
          </h1>
          <p className="text-body-lg text-secondary">
            Connect wearables, apps, and labs to unlock AI-powered insights
            tailored to your DNA.
          </p>
        </header>

        {/* ── Hero CTA Cards ── */}
        <div className="flex flex-col gap-4 mb-12">
          {/* Card 1 — Wearable */}
          <div
            className="glass-v2 rounded-2xl p-6"
            style={{ borderLeft: '4px solid var(--teal-500)' }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
                style={{ backgroundColor: 'rgba(45,165,160,0.12)' }}
              >
                <Watch size={26} style={{ color: 'var(--teal-500)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-overline mb-1">CONNECT YOUR WEARABLE</p>
                <p className="text-xs text-white/50 mb-2">
                  Apple Watch · Garmin · Oura · WHOOP · Fitbit · Polar · 500+
                </p>
                <p className="text-sm text-white/70 leading-relaxed">
                  Sync sleep, heart rate, HRV, recovery, and activity data
                  directly into your genetic health engine.
                </p>
              </div>
            </div>
            <Link href="/plugins/wearables">
              <VCButton variant="primary">Connect Wearable →</VCButton>
            </Link>
          </div>

          {/* Card 2 — App */}
          <div
            className="glass-v2 rounded-2xl p-6"
            style={{ borderLeft: '4px solid var(--orange-500)' }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
                style={{ backgroundColor: 'rgba(183,94,24,0.12)' }}
              >
                <Smartphone size={26} style={{ color: 'var(--orange-500)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-overline mb-1">CONNECT YOUR APP</p>
                <p className="text-xs text-white/50 mb-2">
                  MyFitnessPal · Strava · Peloton · Cronometer · 100+
                </p>
                <p className="text-sm text-white/70 leading-relaxed">
                  Import nutrition logs, workout history, and lifestyle data to
                  complete your health picture.
                </p>
              </div>
            </div>
            <Link href="/plugins/apps">
              <VCButton variant="orange">Connect App →</VCButton>
            </Link>
          </div>

          {/* Card 3 — Lab */}
          <div
            className="glass-v2 rounded-2xl p-6"
            style={{ borderLeft: '4px solid #27AE60' }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
                style={{ backgroundColor: 'rgba(39,174,96,0.12)' }}
              >
                <FlaskConical size={26} style={{ color: '#27AE60' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-overline mb-1">CONNECT YOUR LAB</p>
                <p className="text-xs text-white/50 mb-2">
                  Quest · Labcorp · EverlyHealth · PDF Upload
                </p>
                <p className="text-sm text-white/70 leading-relaxed">
                  Pull in biomarker data and GeneX360 panel results so ARIA can
                  correlate labs with your genetic variants.
                </p>
              </div>
            </div>
            <Link href="/plugins/labs">
              <button
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #27AE60, #1e8a4d)',
                }}
              >
                Connect Lab →
              </button>
            </Link>
          </div>
        </div>

        {/* ── Active Connections ── */}
        <section className="mb-12">
          <p className="text-overline mb-4">ACTIVE CONNECTIONS</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {activeConnections.map((device) => (
              <div
                key={device.name}
                className="glass-v2 flex items-center gap-2 px-3.5 py-1.5 rounded-full"
              >
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs font-medium text-white/80">
                  {device.name}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/plugins/manage"
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
            style={{ color: 'var(--teal-500)' }}
          >
            Manage All Connections
            <ChevronRight size={14} />
          </Link>
        </section>

        {/* ── Why Connect? ── */}
        <section className="mb-12">
          <p className="text-overline mb-4">WHY CONNECT?</p>
          <div className="grid grid-cols-3 gap-3">
            {whyConnectCards.map((card) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={card.title}
                  className="glass-v2 rounded-xl p-4 flex flex-col items-center text-center gap-2"
                >
                  <CardIcon
                    size={24}
                    style={{ color: 'var(--teal-500)' }}
                  />
                  <h4 className="text-sm font-semibold text-white">
                    {card.title}
                  </h4>
                  <p className="text-xs text-white/50 leading-relaxed">
                    {card.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Privacy & Security ── */}
        <section className="mb-12">
          <p className="text-overline mb-4">PRIVACY &amp; SECURITY</p>
          <div className="grid grid-cols-2 gap-3">
            {privacyItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.text}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <ItemIcon
                    size={16}
                    style={{ color: 'var(--teal-500)' }}
                    className="shrink-0"
                  />
                  <span className="text-xs font-medium text-white/70">
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
