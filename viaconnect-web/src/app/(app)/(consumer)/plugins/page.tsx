'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Watch,
  Smartphone,
  FlaskConical,
  Activity,
  Brain,
  BarChart3,
  Shield,
  ShieldCheck,
  Lock,
  Unlink,
  ChevronRight,
  ArrowRight,
  Search,
  Plus,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import { BentoTile } from '@/components/ui/BentoTile';
import { getDisplayName } from '@/lib/getDisplayName';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/client';

const activeConnections = [
  { name: 'Apple Watch', connected: true },
  { name: 'Oura Ring', connected: true },
  { name: 'MyFitnessPal', connected: true },
];

const whyConnectCards = [
  {
    icon: Activity,
    title: 'Genetic Context',
    text: 'Your phenotypic data is interpreted through the lens of your unique genetic profile, so you get no generic advice.',
  },
  {
    icon: Brain,
    title: 'AI Gets Smarter',
    text: `Every data source makes ${getDisplayName('aria')} more accurate, surfacing insights that matter to your genome.`,
  },
  {
    icon: BarChart3,
    title: 'Deeper Insights',
    text: 'Cross-referencing wearables, labs, and nutrition reveals patterns a single source never could.',
  },
];

const privacyItems = [
  { icon: ShieldCheck, text: 'HIPAA-aware' },
  { icon: Lock, text: 'End-to-end Encryption' },
  { icon: Shield, text: 'We Never Sell Your Data' },
  { icon: Unlink, text: 'Disconnect Anytime' },
];

// Community-requested integrations that Jeffery has processed and added.
// These start empty; Jeffery populates them from user requests stored in
// the plugin_requests table. For now, seeded client-side so the feature
// is immediately interactive without a migration.
interface RequestedPlugin {
  id: string;
  name: string;
  type: 'app' | 'wearable' | 'lab';
  status: 'requested' | 'reviewing' | 'added';
  requestCount: number;
}

const SEED_COMMUNITY: RequestedPlugin[] = [
  { id: 'samsung-health', name: 'Samsung Health', type: 'wearable', status: 'reviewing', requestCount: 34 },
  { id: 'eight-sleep',    name: 'Eight Sleep',    type: 'wearable', status: 'reviewing', requestCount: 28 },
  { id: 'levels-cgm',     name: 'Levels (CGM)',   type: 'wearable', status: 'added',     requestCount: 52 },
  { id: 'noom',           name: 'Noom',           type: 'app',      status: 'reviewing', requestCount: 19 },
  { id: 'lose-it',        name: 'Lose It!',       type: 'app',      status: 'reviewing', requestCount: 15 },
  { id: 'headspace',      name: 'Headspace',      type: 'app',      status: 'requested', requestCount: 22 },
];

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  requested: { bg: 'bg-[#2DA5A0]/10',   border: 'border-[#2DA5A0]/30', text: 'text-[#2DA5A0]', label: 'Requested' },
  reviewing: { bg: 'bg-[#FBBF24]/10',   border: 'border-[#FBBF24]/30', text: 'text-[#FBBF24]', label: 'Under Review' },
  added:     { bg: 'bg-[#27AE60]/10',   border: 'border-[#27AE60]/30', text: 'text-[#27AE60]', label: 'Added' },
};

export default function PluginsPage() {
  const [query, setQuery] = useState('');
  const [communityPlugins, setCommunityPlugins] = useState<RequestedPlugin[]>(SEED_COMMUNITY);
  const [submitting, setSubmitting] = useState(false);
  const [justRequested, setJustRequested] = useState<string[]>([]);

  // Filter community plugins by search
  const filtered = communityPlugins.filter((p) =>
    query.length === 0 ? true : p.name.toLowerCase().includes(query.toLowerCase()),
  );

  // Check if query matches any existing plugin (listed or community)
  const queryLower = query.trim().toLowerCase();
  const matchesExisting =
    queryLower.length > 0 &&
    (
      ['apple watch','garmin','oura','whoop','fitbit','polar','myfitnesspal','strava','peloton','cronometer','quest','labcorp','everlyhealth']
        .some((n) => n.includes(queryLower)) ||
      communityPlugins.some((p) => p.name.toLowerCase().includes(queryLower))
    );

  const handleRequest = async () => {
    const name = query.trim();
    if (!name || name.length < 2) return;
    setSubmitting(true);

    // Optimistic: add to community list immediately
    const newPlugin: RequestedPlugin = {
      id: `req-${Date.now()}`,
      name,
      type: 'app',
      status: 'requested',
      requestCount: 1,
    };
    setCommunityPlugins((prev) => [newPlugin, ...prev]);
    setJustRequested((prev) => [...prev, newPlugin.id]);
    setQuery('');

    // Best effort: persist to Supabase (table may not exist yet). Timeout
    // guarded and logged so a slow or failing network call never blocks the
    // optimistic UI above. Fail-open: any error is swallowed after a warn.
    try {
      await withTimeout(
        (async () => {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await (supabase as any).from('plugin_requests').insert({
              user_id: user.id,
              plugin_name: name,
              plugin_type: 'app',
              status: 'requested',
            }).then(() => {}, () => {});
          }
        })(),
        5000,
        'plugins.requestInsert',
      );
    } catch (error) {
      safeLog.warn('plugins', 'plugin request persist failed, continuing', { error });
    }

    setSubmitting(false);
  };

  return (
    <div
      className="font-[Instrument_Sans] min-h-screen pb-24"
      style={{ background: 'var(--gradient-hero)' }}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 pt-8 md:pt-12">
        <div className="grid grid-cols-1 gap-3 md:gap-3.5 lg:grid-cols-12 lg:gap-[14px]">

          {/* ── BAND 1: Hero ── */}
          <BentoTile className="lg:col-span-8" scrim={false}>
            <h1 className="text-heading-1 mb-2 text-white">
              Supercharge Your Precision Health
            </h1>
            <p className="text-body-lg text-secondary">
              Connect wearables, apps, and labs to unlock AI-powered insights
              tailored to your DNA.
            </p>
          </BentoTile>

          {/* ── BAND 1: Active Connections ── */}
          <BentoTile className="lg:col-span-4" scrim={false}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-overline text-[#2DA5A0]">ACTIVE CONNECTIONS</p>
              <span className="flex-shrink-0 rounded-full border border-[#27AE60]/30 bg-[#27AE60]/10 px-2 py-0.5 text-[10px] font-semibold text-[#27AE60]">
                {activeConnections.length} active
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeConnections.map((device) => (
                <div
                  key={device.name}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5"
                >
                  <span className="h-2 w-2 rounded-full bg-[#27AE60]" />
                  <span className="text-xs font-medium text-white/80">
                    {device.name}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/plugins/manage"
              className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium hover:underline"
              style={{ color: 'var(--teal-500)' }}
            >
              Manage All Connections
              <ChevronRight size={14} strokeWidth={1.5} />
            </Link>
          </BentoTile>

          {/* ── BAND 2: Connect Wearable (tall) ── */}
          <BentoTile className="lg:col-span-6 lg:row-span-2" scrim={false}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#2DA5A0]/15">
              <Watch className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            </span>
            <p className="mt-3 text-overline text-[#2DA5A0]">CONNECT YOUR WEARABLE</p>
            <p className="mt-1 text-xs text-white/50">
              Apple Watch, Garmin, Oura, WHOOP, Fitbit, Polar, 500+
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Sync sleep, heart rate, HRV, recovery, and activity data directly
              into your genetic health engine.
            </p>
            <Link href="/plugins/wearables" className="mt-auto pt-4">
              <button
                type="button"
                className="flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[#2DA5A0] backdrop-blur-sm transition-all hover:border-[#2DA5A0]/60 hover:bg-white/[0.07] active:scale-[0.98]"
              >
                Connect Wearable
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </Link>
          </BentoTile>

          {/* ── BAND 2: Connect App ── */}
          <BentoTile className="lg:col-span-6" scrim={false}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#B75E18]/15">
              <Smartphone className="h-5 w-5 text-[#B75E18]" strokeWidth={1.5} />
            </span>
            <p className="mt-3 text-overline text-[#B75E18]">CONNECT YOUR APP</p>
            <p className="mt-1 text-xs text-white/50">
              MyFitnessPal, Strava, Peloton, Cronometer, 100+
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Import nutrition logs, workout history, and lifestyle data to
              complete your health picture.
            </p>
            <Link href="/plugins/apps" className="mt-auto pt-4">
              <button
                type="button"
                className="flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#B75E18]/40 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[#B75E18] backdrop-blur-sm transition-all hover:border-[#B75E18]/60 hover:bg-white/[0.07] active:scale-[0.98]"
              >
                Connect App
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </Link>
          </BentoTile>

          {/* ── BAND 2: Connect Lab ── */}
          <BentoTile className="lg:col-span-6" scrim={false}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#27AE60]/15">
              <FlaskConical className="h-5 w-5 text-[#27AE60]" strokeWidth={1.5} />
            </span>
            <p className="mt-3 text-overline text-[#27AE60]">CONNECT YOUR LAB</p>
            <p className="mt-1 text-xs text-white/50">
              Quest, Labcorp, EverlyHealth, PDF Upload
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Pull in biomarker data and GeneX360 panel results so {getDisplayName('aria')} can
              correlate labs with your genetic variants.
            </p>
            <Link href="/plugins/labs" className="mt-auto pt-4">
              <button
                type="button"
                className="flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#27AE60]/40 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[#27AE60] backdrop-blur-sm transition-all hover:border-[#27AE60]/60 hover:bg-white/[0.07] active:scale-[0.98]"
              >
                Connect Lab
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </Link>
          </BentoTile>

          {/* ── BAND 3: Search + Community Requested ── */}
          <BentoTile className="lg:col-span-8 lg:row-span-2" scrim={false}>
            <p className="mb-4 text-overline text-[#2DA5A0]">FIND AN APP OR WEARABLE</p>

            {/* Search input */}
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !matchesExisting && query.trim().length >= 2) handleRequest();
                }}
                placeholder="Search apps, wearables, or devices..."
                aria-label="Search apps, wearables, or devices"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 min-h-[44px] pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-[#2DA5A0]/40 focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]/20"
              />
            </div>

            {/* Request new plugin CTA (shown when query doesn't match anything) */}
            {query.trim().length >= 2 && !matchesExisting && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#B75E18]/40 bg-[#B75E18]/[0.06] p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    &quot;{query.trim()}&quot; not listed yet
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/45">
                    Request it and {getDisplayName('jeffery')} will review and add the integration
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRequest}
                  disabled={submitting}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-[#B75E18]/30 bg-[#B75E18]/15 px-3.5 py-2 text-xs font-semibold text-[#B75E18] transition-all hover:bg-[#B75E18]/25 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  Request Integration
                </button>
              </div>
            )}

            {/* Community requested plugins */}
            {(query.length === 0 || filtered.length > 0) && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2DA5A0]">
                    Community Requested · Powered by {getDisplayName('jeffery')}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {(query.length > 0 ? filtered : communityPlugins).map((plugin) => {
                    const st = STATUS_STYLE[plugin.status] || STATUS_STYLE.requested;
                    const wasJustRequested = justRequested.includes(plugin.id);
                    return (
                      <div
                        key={plugin.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 transition-all hover:bg-white/[0.04]"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {plugin.type === 'wearable' ? (
                            <Watch className="h-4 w-4 flex-shrink-0 text-white/40" strokeWidth={1.5} />
                          ) : plugin.type === 'lab' ? (
                            <FlaskConical className="h-4 w-4 flex-shrink-0 text-white/40" strokeWidth={1.5} />
                          ) : (
                            <Smartphone className="h-4 w-4 flex-shrink-0 text-white/40" strokeWidth={1.5} />
                          )}
                          <span className="truncate text-sm font-medium text-white">{plugin.name}</span>
                          <span className="text-[10px] text-white/30">{plugin.requestCount} requests</span>
                        </div>
                        <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.bg} ${st.border} ${st.text}`}>
                          {wasJustRequested ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-2.5 w-2.5" strokeWidth={1.5} />
                              Submitted
                            </span>
                          ) : (
                            st.label
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </BentoTile>

          {/* ── BAND 3: Why Connect? ── */}
          <BentoTile className="lg:col-span-4 lg:row-span-2" scrim={false}>
            <p className="mb-4 text-overline text-[#2DA5A0]">WHY CONNECT?</p>
            <div className="flex flex-col gap-4">
              {whyConnectCards.map((card) => {
                const CardIcon = card.icon;
                return (
                  <div key={card.title} className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#2DA5A0]/15">
                      <CardIcon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white">{card.title}</h4>
                      <p className="mt-0.5 text-xs leading-relaxed text-white/50">{card.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </BentoTile>

          {/* ── BAND 4: Privacy and Security ── */}
          <BentoTile className="lg:col-span-12" scrim={false}>
            <p className="mb-4 text-overline text-[#2DA5A0]">PRIVACY &amp; SECURITY</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {privacyItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={item.text}
                    className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3"
                  >
                    <ItemIcon
                      className="h-4 w-4 flex-shrink-0 text-[#2DA5A0]"
                      strokeWidth={1.5}
                    />
                    <span className="text-xs font-medium text-white/70">
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </BentoTile>

        </div>
      </div>
    </div>
  );
}
