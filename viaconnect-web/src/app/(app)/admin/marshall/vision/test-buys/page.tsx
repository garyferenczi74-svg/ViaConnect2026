import Link from 'next/link';
import { ChevronLeft, Package, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface TestBuyRow {
  id: string;
  target_listing_url: string;
  budget_usd: number;
  ordered_at: string | null;
  arrived_at: string | null;
  outcome: string | null;
  initiated_at: string;
  closed_at: string | null;
}

export default async function TestBuysPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('counterfeit_test_buys')
    .select('id, target_listing_url, budget_usd, ordered_at, arrived_at, outcome, initiated_at, closed_at')
    .order('initiated_at', { ascending: false })
    .limit(200);
  const rows: TestBuyRow[] = (data as TestBuyRow[] | null) ?? [];

  const active = rows.filter((r) => !r.closed_at);
  const closed = rows.filter((r) => r.closed_at);

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/marshall/vision" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Vision overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-bold text-white">Test buys</h1>
            <p className="text-xs text-white/40">High-value counterfeit targets purchased for hands-on comparison. Budget approved by CFO.</p>
          </div>
          <Link
            href="/admin/marshall/vision/test-buys/new"
            className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] text-white text-sm font-medium px-3 py-2 transition"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} aria-hidden />
            Initiate test buy
          </Link>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-8">
        <Section title={`Active (${active.length})`} rows={active} />
        <Section title={`Closed (${closed.length})`} rows={closed} />
      </div>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: TestBuyRow[] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-white mb-2">{title}</h2>
      {rows.length === 0 ? (
        <div className="rounded-md border border-white/[0.08] bg-white/[0.02] p-4 text-xs text-white/40 italic">
          No test buys in this bucket.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
              <div className="flex items-start gap-2 flex-wrap">
                <StageBadge row={r} />
                <span className="text-[11px] text-white/50 tabular-nums">${Number(r.budget_usd).toFixed(2)}</span>
                <span className="ml-auto text-[10px] text-white/40">
                  {new Date(r.initiated_at).toISOString().slice(0, 10)}
                </span>
              </div>
              <div className="text-xs text-white/80 mt-2 truncate" title={r.target_listing_url}>
                {r.target_listing_url}
              </div>
              {r.outcome ? (
                <div className="text-[11px] text-white/60 mt-1">Outcome: <span className="font-mono">{r.outcome}</span></div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StageBadge({ row }: { row: TestBuyRow }) {
  let label: string;
  let cls: string;
  if (row.outcome) {
    label = row.outcome;
    cls = row.outcome === 'counterfeit_confirmed'
      ? 'bg-red-500/15 border-red-400/30 text-red-200'
      : row.outcome === 'authentic_confirmed'
        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
        : 'bg-slate-500/15 border-slate-400/30 text-slate-200';
  } else if (row.arrived_at) {
    label = 'arrived';
    cls = 'bg-blue-500/15 border-blue-400/30 text-blue-200';
  } else if (row.ordered_at) {
    label = 'ordered';
    cls = 'bg-amber-500/15 border-amber-400/30 text-amber-200';
  } else {
    label = 'initiated';
    cls = 'bg-white/[0.05] border-white/[0.12] text-white/70';
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${cls}`}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}
