import Link from 'next/link';
import { ChevronLeft, Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ExemplarRow {
  id: string;
  tier: number;
  source_platform: string | null;
  storage_key: string;
  confirmed_at: string;
  curation_note: string | null;
  takedown_request_id: string | null;
}

export default async function ExemplarsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('counterfeit_exemplars')
    .select('id, tier, source_platform, storage_key, confirmed_at, curation_note, takedown_request_id')
    .order('confirmed_at', { ascending: false })
    .limit(500);
  const rows: ExemplarRow[] = (data as ExemplarRow[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/marshall/vision" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Vision overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Counterfeit exemplars</h1>
            <p className="text-xs text-white/40">Curated reference library of confirmed counterfeits. Reviewer reference only; never used to fine-tune any model.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">
            No exemplars curated yet. Confirmed counterfeits with a Steve-signed curation note will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${tierClasses(r.tier)}`}>
                    Tier {r.tier}
                  </span>
                  {r.source_platform ? (
                    <span className="text-[11px] text-white/60">{r.source_platform}</span>
                  ) : null}
                  <span className="ml-auto text-[10px] text-white/40">
                    {new Date(r.confirmed_at).toISOString().slice(0, 10)}
                  </span>
                </div>
                {r.curation_note ? (
                  <p className="text-xs text-white/80 mb-2">{r.curation_note}</p>
                ) : null}
                <div className="text-[10px] text-white/40 font-mono truncate" title={r.storage_key}>
                  {r.storage_key}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function tierClasses(tier: number): string {
  switch (tier) {
    case 1: return 'bg-slate-500/15 border-slate-400/30 text-slate-200';
    case 2: return 'bg-amber-500/15 border-amber-400/30 text-amber-200';
    case 3: return 'bg-red-500/15 border-red-400/30 text-red-200';
    default: return 'bg-white/[0.05] border-white/[0.12] text-white/70';
  }
}
