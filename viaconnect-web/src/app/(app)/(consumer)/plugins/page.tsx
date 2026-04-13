'use client';

import { useState } from 'react';
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
  Search,
  Plus,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import { VCButton } from '@/components/ui/VCButton';
import { createClient } from '@/lib/supabase/client';

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
  requested: { bg: 'bg-white/[0.04]',   border: 'border-white/10',     text: 'text-white/50',  label: 'Requested' },
  reviewing: { bg: 'bg-[#FBBF24]/10',   border: 'border-[#FBBF24]/30', text: 'text-[#FBBF24]', label: 'Under Review' },
  added:     { bg: 'bg-[#22C55E]/10',   border: 'border-[#22C55E]/30', text: 'text-[#22C55E]', label: 'Added' },
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

    // Best effort: persist to Supabase (table may not exist yet)
    try {
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
    } catch { /* table may not exist */ }

    setSubmitting(false);
  };

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--gradient-hero)' }}
    >
      <div className="mx-auto max-w-2xl px-4 md:px-5 lg:px-6 pt-8 md:pt-12">
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
        <div className="flex flex-col gap-4 mb-8 md:mb-12">
          {/* Card 1 — Wearable */}
          <div
            className="glass-v2 rounded-2xl p-4 md:p-6"
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
            className="glass-v2 rounded-2xl p-4 md:p-6"
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
            className="glass-v2 rounded-2xl p-4 md:p-6"
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
                className="w-full py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #27AE60, #1e8a4d)',
                }}
              >
                Connect Lab →
              </button>
            </Link>
          </div>
        </div>

        {/* ── Search for Any App or Wearable ── */}
        <section className="mb-12">
          <p className="text-overline mb-4">FIND AN APP OR WEARABLE</p>
          <div className="glass-v2 rounded-2xl p-5 space-y-4">
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
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 min-h-[44px] pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-[#2DA5A0]/40 focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]/20"
              />
            </div>

            {/* Request new plugin CTA (shown when query doesn't match anything) */}
            {query.trim().length >= 2 && !matchesExisting && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#B75E18]/40 bg-[#B75E18]/[0.06] p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    &quot;{query.trim()}&quot; not listed yet
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/45">
                    Request it and Jeffery will review and add the integration
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
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  Request Integration
                </button>
              </div>
            )}

            {/* Community requested plugins */}
            {(query.length === 0 || filtered.length > 0) && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Community Requested · Powered by Jeffery
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
                        <div className="flex items-center gap-2.5 min-w-0">
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
                              <Check className="h-2.5 w-2.5" strokeWidth={2} />
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
          </div>
        </section>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
