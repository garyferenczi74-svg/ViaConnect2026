import Link from 'next/link';
import { ChevronLeft, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import DistributionTargetToggle from '@/components/compliance/soc2/DistributionTargetToggle';

export const dynamic = 'force-dynamic';

interface TargetRow {
  platform: string;
  enabled: boolean;
  api_url: string | null;
  api_key_ref: string | null;
  notes: string | null;
  updated_at: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  drata: 'Drata',
  vanta: 'Vanta',
  manual_download: 'Manual download',
};

export default async function DistributionTargetsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('soc2_distribution_targets')
    .select('platform, enabled, api_url, api_key_ref, notes, updated_at')
    .order('platform', { ascending: true });
  const rows: TargetRow[] = (data as TargetRow[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          SOC 2 overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Send className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Distribution targets</h1>
            <p className="text-xs text-white/40">Drata and Vanta push configuration. HTTPS only. Toggle requires admin role.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-2">
        {rows.map((r) => (
          <article key={r.platform} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
            <div className="flex items-start gap-2 flex-wrap">
              <span className="font-mono text-sm text-white">{r.platform}</span>
              <span className="text-[11px] text-white/50">{PLATFORM_LABELS[r.platform] ?? r.platform}</span>
              <span className="ml-auto">
                <DistributionTargetToggle platform={r.platform} enabled={r.enabled} />
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-1 text-[11px] text-white/60">
              <span>API URL: {r.api_url ? <span className="font-mono text-white/80 break-all">{r.api_url}</span> : <span className="text-amber-300">not configured</span>}</span>
              <span>Vault key ref: {r.api_key_ref ? <span className="font-mono text-white/80">{r.api_key_ref}</span> : <span className="text-amber-300">not configured</span>}</span>
            </div>
            {r.notes ? <p className="mt-2 text-xs text-white/70">{r.notes}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
