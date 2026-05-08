'use client';

import Link from 'next/link';
import { Activity, Pill, ClipboardList, Dna, Check, Plus, Info, Watch, Smartphone } from 'lucide-react';
import {
  CROSS_REFERENCE_SOURCE_LABELS,
  type CrossReferenceSourceId,
  type ConfidenceTier,
  type CrossReferenceSnapshot,
} from '@/lib/body-tracker/cross-reference';

interface CrossReferenceCardProps {
  snapshot: CrossReferenceSnapshot;
  tier: ConfidenceTier;
}

const SOURCE_ICONS: Record<CrossReferenceSourceId, typeof Activity> = {
  body_tracker: Activity,
  supplements:  Pill,
  wearable:     Watch,
  app:          Smartphone,
  caq:          ClipboardList,
  genetics:     Dna,
};

const SOURCE_ROUTES: Record<CrossReferenceSourceId, string> = {
  body_tracker: '/body-tracker',
  supplements:  '/account/profile',
  wearable:     '/body-tracker/connections#wearables',
  app:          '/body-tracker/connections#apps',
  caq:          '/profile/assessment',
  genetics:     '/genetics',
};

const SOURCE_CTA_LABEL: Record<CrossReferenceSourceId, string> = {
  body_tracker: 'Log entries',
  supplements:  'Add supplements',
  wearable:     'Connect Wearable',
  app:          'Connect App',
  caq:          'Take assessment',
  genetics:     'Add GeneX360 results',
};

const TIER_COLOR: Record<1 | 2 | 3, string> = {
  1: '#5B8DEF',
  2: '#2DA5A0',
  3: '#22C55E',
};

// Prompt #85l: wearable + app sit between supplements and caq.
const SOURCE_ORDER: CrossReferenceSourceId[] = [
  'body_tracker',
  'supplements',
  'wearable',
  'app',
  'caq',
  'genetics',
];

function isPresent(snapshot: CrossReferenceSnapshot, id: CrossReferenceSourceId): boolean {
  switch (id) {
    case 'body_tracker': return snapshot.availability.bodyTracker;
    case 'supplements':  return snapshot.availability.supplements;
    case 'wearable':     return snapshot.availability.wearable;
    case 'app':          return snapshot.availability.app;
    case 'caq':          return snapshot.availability.caq;
    case 'genetics':     return snapshot.availability.genetics;
  }
}

function sourceDetail(snapshot: CrossReferenceSnapshot, id: CrossReferenceSourceId): string | null {
  switch (id) {
    case 'body_tracker':
      return 'Daily metrics and trend data';
    case 'supplements': {
      const s = snapshot.supplements;
      if (!s || s.count === 0) return null;
      return `${s.count} active item${s.count === 1 ? '' : 's'}`;
    }
    case 'wearable':
      return snapshot.wearable
        ? snapshot.wearable.sourceName
        : 'Sync data from WHOOP, Oura, Garmin, Fitbit';
    case 'app':
      return snapshot.app
        ? snapshot.app.sourceName
        : 'Sync data from Apple Health, Google Fit, Strava';
    case 'caq': {
      const c = snapshot.caq;
      if (!c) return null;
      const flags: string[] = [];
      if (c.hasGoals) flags.push('goals');
      if (c.hasMedications) flags.push('medications');
      if (c.hasConditions) flags.push('conditions');
      return flags.length > 0 ? flags.join(', ') : null;
    }
    case 'genetics': {
      const g = snapshot.genetics;
      if (!g) return null;
      const flags: string[] = [];
      if (g.hasMthfr) flags.push('MTHFR');
      if (g.hasComt) flags.push('COMT');
      if (g.hasCyp2d6) flags.push('CYP2D6');
      return flags.length > 0 ? flags.join(', ') : null;
    }
  }
}

export function CrossReferenceCard({ snapshot, tier }: CrossReferenceCardProps) {
  const tierColor = TIER_COLOR[tier.tier];

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Cross-Reference Sources</h3>
          <p className="mt-0.5 text-xs text-white/55">
            Arnold weights recommendations using whichever sources you have connected.
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap"
          style={{ backgroundColor: `${tierColor}1F`, color: tierColor, border: `1px solid ${tierColor}4D` }}
        >
          {tier.label}, {tier.pct}%
        </span>
      </header>

      <ul className="space-y-2">
        {SOURCE_ORDER.map((id) => {
          const Icon = SOURCE_ICONS[id];
          const present = isPresent(snapshot, id);
          const detail = sourceDetail(snapshot, id);
          const route = SOURCE_ROUTES[id];
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: present ? 'rgba(45,165,160,0.15)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Icon
                    size={14}
                    strokeWidth={1.5}
                    className={present ? 'text-[#2DA5A0]' : 'text-white/30'}
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {CROSS_REFERENCE_SOURCE_LABELS[id]}
                  </p>
                  {detail && (
                    <p className="truncate text-[11px] text-white/45">{detail}</p>
                  )}
                </div>
              </div>
              {present ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2DA5A0]">
                  <Check size={12} strokeWidth={1.5} /> Connected
                </span>
              ) : id === 'body_tracker' ? null : (
                <Link
                  href={route}
                  className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <Plus size={10} strokeWidth={1.5} />
                  {SOURCE_CTA_LABEL[id]}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {tier.tier < 3 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/55">
          <Info size={14} strokeWidth={1.5} className="mt-0.5 flex-none text-white/40" />
          <p>
            Adding more sources improves Arnold&apos;s recommendation confidence.
            Genetic data unlocks Tier 3, 96 percent.
          </p>
        </div>
      )}
    </section>
  );
}
