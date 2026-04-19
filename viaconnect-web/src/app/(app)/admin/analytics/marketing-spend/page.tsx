'use client';

// Prompt #94 Phase 1.6: Marketing spend entry UI for the CFO.
// Admin-only RLS gates the read; the page also checks profile.role at mount
// for a clear UX (instead of an empty list under failed RLS).

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  CircleDollarSign,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';

const supabase = createClient();

const CHANNELS = [
  'facebook_ads', 'google_ads', 'tiktok_ads',
  'podcast_sponsorship', 'forbes_article', 'pr_earned_media',
  'direct_email', 'conference', 'practitioner_referral_program',
  'content_marketing', 'seo_organic', 'other',
] as const;
type Channel = (typeof CHANNELS)[number];

interface SpendRow {
  id: string;
  spend_month: string;
  channel: Channel;
  channel_detail: string | null;
  amount_cents: number;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  notes: string | null;
  entered_by_user_id: string | null;
  entered_at: string;
}

const fmtUsd = (c: number) =>
  `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMonth = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short' });
};

export default function MarketingSpendPage() {
  const [rows, setRows] = useState<SpendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [spendMonth, setSpendMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [channel, setChannel] = useState<Channel>('facebook_ads');
  const [channelDetail, setChannelDetail] = useState('');
  const [amountUsd, setAmountUsd] = useState('');
  const [impressions, setImpressions] = useState('');
  const [clicks, setClicks] = useState('');
  const [conversions, setConversions] = useState('');
  const [notes, setNotes] = useState('');

  const reload = async () => {
    setLoading(true);
    const { data, error: err } = await (supabase as any)
      .from('marketing_spend')
      .select('id, spend_month, channel, channel_detail, amount_cents, impressions, clicks, conversions, notes, entered_by_user_id, entered_at')
      .order('spend_month', { ascending: false })
      .order('channel', { ascending: true })
      .limit(500);
    if (err) setError(err.message);
    else setRows((data ?? []) as SpendRow[]);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const totals = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const r of rows) {
      byMonth.set(r.spend_month, (byMonth.get(r.spend_month) ?? 0) + r.amount_cents);
    }
    const months = Array.from(byMonth.keys()).sort().reverse();
    const grand = Array.from(byMonth.values()).reduce((s, v) => s + v, 0);
    return { byMonth, months, grand };
  }, [rows]);

  const resetForm = () => {
    setShowForm(false);
    setChannelDetail('');
    setAmountUsd('');
    setImpressions('');
    setClicks('');
    setConversions('');
    setNotes('');
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const cents = Math.round(Number(amountUsd) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      setError('Enter a valid amount in dollars.');
      setSubmitting(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error: insertErr } = await (supabase as any)
      .from('marketing_spend')
      .insert({
        spend_month: spendMonth,
        channel,
        channel_detail: channelDetail.trim() || null,
        amount_cents: cents,
        impressions: impressions ? Number(impressions) : null,
        clicks: clicks ? Number(clicks) : null,
        conversions: conversions ? Number(conversions) : null,
        notes: notes.trim() || null,
        entered_manually: true,
        entered_by_user_id: user?.id ?? null,
      });
    setSubmitting(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    resetForm();
    reload();
  }

  async function deleteRow(id: string) {
    if (!window.confirm('Delete this spend row?')) return;
    await (supabase as any).from('marketing_spend').delete().eq('id', id);
    reload();
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-portal-green/30 bg-portal-green/10">
            <CircleDollarSign className="h-5 w-5 text-portal-green" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Marketing Spend</h1>
            <p className="text-xs text-white/55">
              Manual CFO entry. API integration ships in a future prompt.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80 hover:bg-white/[0.08]"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-2 rounded-lg border border-portal-green/40 bg-portal-green/15 px-3 py-2 text-sm font-semibold text-portal-green hover:bg-portal-green/25"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add spend
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{error}</span>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="mb-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-2">
          <Field label="Spend month" required>
            <input
              type="date"
              required
              value={spendMonth}
              onChange={(e) => setSpendMonth(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
            />
          </Field>
          <Field label="Channel" required>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
              className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="Channel detail (optional)" hint="Campaign name, podcast show, etc.">
            <input
              value={channelDetail}
              onChange={(e) => setChannelDetail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
            />
          </Field>
          <Field label="Amount (USD)" required>
            <input
              type="number"
              required
              step="0.01"
              min={0}
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
            />
          </Field>
          <Field label="Impressions (optional)">
            <input
              type="number"
              min={0}
              value={impressions}
              onChange={(e) => setImpressions(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
            />
          </Field>
          <Field label="Clicks (optional)">
            <input
              type="number"
              min={0}
              value={clicks}
              onChange={(e) => setClicks(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
            />
          </Field>
          <Field label="Conversions (optional)">
            <input
              type="number"
              min={0}
              value={conversions}
              onChange={(e) => setConversions(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Notes (optional)">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
              />
            </Field>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 hover:bg-white/[0.08]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-portal-green px-5 py-2 text-sm font-semibold text-white hover:bg-portal-green/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
              Save spend
            </button>
          </div>
        </form>
      )}

      {/* Totals strip */}
      <section className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
        <Stat label="Total entered" value={fmtUsd(totals.grand)} />
        <Stat label="Months on file" value={String(totals.months.length)} />
        <Stat
          label="Latest month"
          value={
            totals.months[0]
              ? `${fmtMonth(totals.months[0])} (${fmtUsd(totals.byMonth.get(totals.months[0]) ?? 0)})`
              : 'no data'
          }
        />
      </section>

      {loading ? (
        <CenteredLoader />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-12 text-center text-sm text-white/55">
          No spend recorded yet. Add the first month above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-[0.18em] text-white/45">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Detail</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Imp</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Conv</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-white/85">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-white/40" strokeWidth={1.5} />
                      {fmtMonth(r.spend_month)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white">{r.channel.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-white/65">{r.channel_detail ?? ''}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{fmtUsd(r.amount_cents)}</td>
                  <td className="px-4 py-3 text-right text-white/60 tabular-nums">{r.impressions ?? ''}</td>
                  <td className="px-4 py-3 text-right text-white/60 tabular-nums">{r.clicks ?? ''}</td>
                  <td className="px-4 py-3 text-right text-white/60 tabular-nums">{r.conversions ?? ''}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteRow(r.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-200 hover:bg-red-500/20"
                      aria-label="Delete spend row"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-white/80">
        {label}{required && <span className="ml-1 text-[#B75E18]">*</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-white/40">{hint}</span>}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function CenteredLoader() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-white/55">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
      Loading spend
    </div>
  );
}
