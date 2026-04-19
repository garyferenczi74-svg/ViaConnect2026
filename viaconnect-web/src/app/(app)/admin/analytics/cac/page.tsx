'use client';

// Prompt #94 Phase 6.2: CAC analytics page.
// Calls /api/admin/analytics/cac for blended + per-channel CAC. Toggles:
//   month picker      (defaults to current month, normalized to YYYY-MM-01)
//   mode              (same_month | trailing_3_month)
// Per-channel table renders side by side beneath the blended summary.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const CHANNELS = [
  'facebook_ads', 'google_ads', 'tiktok_ads',
  'podcast_sponsorship', 'forbes_article', 'pr_earned_media',
  'direct_email', 'conference', 'practitioner_referral',
  'consumer_referral', 'content_marketing', 'seo_organic',
  'direct_traffic', 'unknown', 'other',
] as const;

interface CACResult {
  month: string;
  segment_type: 'overall' | 'channel';
  segment_value: string;
  mode: 'same_month' | 'trailing_3_month';
  new_customers_count: number;
  marketing_spend_cents: number;
  cac_cents: number | null;
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
}

const NA = 'n/a';
const fmtUsd = (c: number | null) =>
  c == null ? NA : `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'long' });

const confColor = (c: 'high' | 'medium' | 'low') =>
  c === 'high'   ? 'bg-portal-green/20 text-portal-green border-portal-green/30' :
  c === 'medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                   'bg-rose-500/20 text-rose-300 border-rose-500/30';

function defaultMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function CACPage() {
  const [month, setMonth] = useState<string>(defaultMonth);
  const [mode, setMode] = useState<'same_month' | 'trailing_3_month'>('same_month');
  const [blended, setBlended] = useState<CACResult | null>(null);
  const [channels, setChannels] = useState<CACResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthInputValue = useMemo(() => month.slice(0, 7), [month]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const blendedRes = await fetch(`/api/admin/analytics/cac?month=${month}&mode=${mode}`);
      if (!blendedRes.ok) throw new Error(`Blended CAC: ${blendedRes.status}`);
      const blendedJson = (await blendedRes.json()) as CACResult;
      setBlended(blendedJson);

      const channelResults = await Promise.all(
        CHANNELS.map(async (ch) => {
          const r = await fetch(
            `/api/admin/analytics/cac?month=${month}&mode=${mode}&segment_type=channel&channel=${ch}`,
          );
          if (!r.ok) return null;
          return (await r.json()) as CACResult;
        }),
      );
      setChannels(channelResults.filter((x): x is CACResult => x !== null));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [month, mode]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/analytics" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Analytics
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Customer Acquisition Cost</h1>
            <p className="text-sm text-gray-400 mt-1">{fmtMonth(month)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-gray-400 inline-flex items-center gap-2">
              Month
              <input
                type="month"
                value={monthInputValue}
                onChange={(e) => setMonth(`${e.target.value}-01`)}
                className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm text-white"
              />
            </label>
            <label className="text-xs text-gray-400 inline-flex items-center gap-2">
              Mode
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
                className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm text-white"
              >
                <option value="same_month">Same month</option>
                <option value="trailing_3_month">Trailing 3 month</option>
              </select>
            </label>
            <button
              onClick={reload}
              className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3">Blended</h2>
        {loading && !blended && (
          <div className="text-sm text-gray-400 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
          </div>
        )}
        {blended && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="CAC"           value={fmtUsd(blended.cac_cents)} />
              <Stat label="Marketing spend" value={fmtUsd(blended.marketing_spend_cents)} />
              <Stat label="New customers" value={blended.new_customers_count.toLocaleString()} />
              <div>
                <p className="text-xs text-gray-400 mb-1">Confidence</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${confColor(blended.confidence)}`}>
                  {blended.confidence}
                </span>
              </div>
            </div>
            {blended.notes.length > 0 && (
              <ul className="mt-4 text-xs text-amber-300 space-y-1">
                {blended.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3">Per channel</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400">
              <tr>
                <th className="text-left px-3 py-2">Channel</th>
                <th className="text-right px-3 py-2">Spend</th>
                <th className="text-right px-3 py-2">Conversions</th>
                <th className="text-right px-3 py-2">CAC</th>
                <th className="text-left px-3 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {channels.length === 0 && !loading && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No channel data yet for this month.</td></tr>
              )}
              {channels.map((c) => (
                <tr key={c.segment_value} className="border-t border-white/5">
                  <td className="px-3 py-2 capitalize">{c.segment_value.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2 text-right">{fmtUsd(c.marketing_spend_cents)}</td>
                  <td className="px-3 py-2 text-right">{c.new_customers_count.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-medium">{fmtUsd(c.cac_cents)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${confColor(c.confidence)}`}>
                      {c.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-semibold">{value}</p>
    </div>
  );
}
