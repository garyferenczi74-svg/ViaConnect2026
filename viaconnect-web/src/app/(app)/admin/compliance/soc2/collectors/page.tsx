import Link from 'next/link';
import { ChevronLeft, Radio } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import CollectorToggle from '@/components/compliance/soc2/CollectorToggle';

export const dynamic = 'force-dynamic';

interface CollectorRow {
  collector_id: string;
  enabled: boolean;
  api_key_ref: string | null;
  last_run_at: string | null;
  last_heartbeat_at: string | null;
  notes: string | null;
  updated_at: string;
}

export default async function CollectorsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('soc2_collector_config')
    .select('collector_id, enabled, api_key_ref, last_run_at, last_heartbeat_at, notes, updated_at')
    .order('collector_id', { ascending: true });
  const rows: CollectorRow[] = (data as CollectorRow[] | null) ?? [];

  const enabled = rows.filter((r) => r.enabled).length;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          SOC 2 overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Radio className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Collectors</h1>
            <p className="text-xs text-white/40">{enabled} of {rows.length} enabled. External-API collectors stay disabled until their Vault api_key_ref is populated.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">
            No collector config rows. The P4 migration seeds 10 rows; run it if missing.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <article key={r.collector_id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="font-mono text-sm text-white">{r.collector_id}</span>
                  <span className="ml-auto">
                    <CollectorToggle collectorId={r.collector_id} enabled={r.enabled} />
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/60">
                  <span>Vault ref: {r.api_key_ref ? <span className="font-mono text-white/80">{r.api_key_ref}</span> : <span className="text-amber-300">not set</span>}</span>
                  {r.last_run_at ? <span>Last run: {r.last_run_at.slice(0, 16).replace('T', ' ')}</span> : null}
                  {r.last_heartbeat_at ? <span>Heartbeat: {r.last_heartbeat_at.slice(0, 16).replace('T', ' ')}</span> : null}
                </div>
                {r.notes ? <p className="mt-2 text-xs text-white/70">{r.notes}</p> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
