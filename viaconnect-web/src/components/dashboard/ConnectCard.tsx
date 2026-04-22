'use client';

// ConnectCard — full-width card matching the dashboard's tab design language
// (HelixRewardsSummary / WellnessSnapshot styling). Used for the
// "Connect Your Device" and "Connect Your App" CTAs below Helix Rewards.

import Link from 'next/link';
import { ArrowRight, Plug, Smartphone, Watch, type LucideIcon } from 'lucide-react';

type ConnectType = 'wearable' | 'app';

interface ConnectCardProps {
  type: ConnectType;
  href: string;
  connectedCount?: number;
}

interface CardConfig {
  title: string;
  eyebrow: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  accent: string;
}

const CONFIGS: Record<ConnectType, CardConfig> = {
  wearable: {
    title: 'Connect Your Device',
    eyebrow: 'Wearables & Sensors',
    description:
      'Sync Oura, Apple Watch, Whoop, Garmin, Fitbit and more to power real-time recovery, sleep, and strain tracking.',
    cta: 'Connect a wearable',
    icon: Watch,
    accent: '#2DA5A0',
  },
  app: {
    title: 'Connect Your App',
    eyebrow: 'Apps & Integrations',
    description:
      'Link MyFitnessPal, Cronometer, Strava, Apple Health and more so your protocol learns from your daily routine.',
    cta: 'Connect an app',
    icon: Smartphone,
    accent: '#B75E18',
  },
};

export function ConnectCard({ type, href, connectedCount = 0 }: ConnectCardProps) {
  const cfg = CONFIGS[type];
  const Icon = cfg.icon;
  const isConnected = connectedCount > 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Plug className="h-4 w-4" strokeWidth={1.5} style={{ color: cfg.accent }} />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          {cfg.eyebrow}
        </h2>
      </div>

      {/* Body */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
          style={{
            background: `${cfg.accent}1A`,
            border: `1px solid ${cfg.accent}40`,
          }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: cfg.accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">{cfg.title}</h3>
            {isConnected && (
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: `${cfg.accent}1A`,
                  borderColor: `${cfg.accent}40`,
                  color: cfg.accent,
                }}
              >
                {connectedCount} connected
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45 sm:text-xs">
            {cfg.description}
          </p>
        </div>
      </div>

      {/* CTA */}
      <Link
        href={href}
        className="group relative mt-4 flex min-h-[40px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_16px_var(--cta-shadow)] active:scale-[0.97]"
        style={{
          background: `linear-gradient(135deg, ${cfg.accent} 0%, #1E3054 100%)`,
          ['--cta-shadow' as string]: `${cfg.accent}59`,
        } as React.CSSProperties}
      >
        <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <span className="relative">{cfg.cta}</span>
        <ArrowRight className="relative h-4 w-4" strokeWidth={2} />
      </Link>
    </section>
  );
}
