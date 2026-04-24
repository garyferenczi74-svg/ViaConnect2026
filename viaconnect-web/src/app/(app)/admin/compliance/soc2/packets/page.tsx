import Link from 'next/link';
import { ChevronLeft, Package, Plus, ShieldCheck, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface PacketRow {
  id: string;
  packet_uuid: string;
  period_start: string;
  period_end: string;
  attestation_type: string;
  status: string;
  generated_at: string;
  root_hash: string;
  size_bytes: number;
  tsc_in_scope: string[];
  signing_key_id: string;
  legal_hold: boolean;
  retention_until: string;
}

export default async function PacketsListPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data, error } = await supabase
    .from('soc2_packets')
    .select('id, packet_uuid, period_start, period_end, attestation_type, status, generated_at, root_hash, size_bytes, tsc_in_scope, signing_key_id, legal_hold, retention_until')
    .order('generated_at', { ascending: false })
    .limit(200);
  const rows: PacketRow[] = (data as PacketRow[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          SOC 2 overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-bold text-white">Generated packets</h1>
            <p className="text-xs text-white/40">{rows.length} signed ZIPs on file. Click a row to inspect files, attestations, and distribution history.</p>
          </div>
          <Link
            href="/admin/compliance/soc2/packets/new"
            className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] text-white text-sm font-medium px-3 py-2 transition"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} aria-hidden />
            Generate packet
          </Link>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {error ? (
          <div className="rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-sm px-3 py-2">
            Query failed: {error.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">
            No packets generated yet. Use the button above to trigger a manual generation or wait for the monthly cron.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Link
                key={r.id}
                href={`/admin/compliance/soc2/packets/${r.id}`}
                className="block rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-3"
              >
                <div className="flex items-start gap-2 flex-wrap">
                  <StatusBadge status={r.status} />
                  <span className="text-[11px] rounded-md border border-white/[0.12] bg-white/[0.04] text-white/80 px-1.5 py-0.5">
                    {r.attestation_type}
                  </span>
                  {r.legal_hold ? (
                    <span className="inline-flex items-center gap-1 text-[11px] rounded-md border border-amber-400/40 bg-amber-500/15 text-amber-200 px-1.5 py-0.5">
                      <AlertTriangle className="w-3 h-3" strokeWidth={1.5} aria-hidden />
                      legal hold
                    </span>
                  ) : null}
                  <span className="font-mono text-xs text-white truncate">{r.packet_uuid}</span>
                  <span className="ml-auto text-[10px] text-white/40 tabular-nums">{formatBytes(r.size_bytes)}</span>
                </div>
                <div className="mt-2 text-xs text-white/70">
                  Period: <span className="text-white font-mono">{r.period_start.slice(0, 10)} → {r.period_end.slice(0, 10)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-white/50">
                  <span>Generated: {r.generated_at.slice(0, 10)}</span>
                  <span>Retention: {r.retention_until}</span>
                  <span>Root: <code className="font-mono text-white/70">{r.root_hash.slice(0, 16)}…</code></span>
                  <span>TSCs: {r.tsc_in_scope.length}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    generating:  'bg-blue-500/15 border-blue-400/30 text-blue-200',
    generated:   'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
    published:   'bg-emerald-500/20 border-emerald-400/40 text-emerald-200',
    superseded:  'bg-slate-500/15 border-slate-400/30 text-slate-200',
    retired:     'bg-white/[0.05] border-white/[0.12] text-white/60',
  };
  const cls = map[status] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${cls}`}>
      <ShieldCheck className="w-3 h-3" strokeWidth={1.5} aria-hidden />
      {status}
    </span>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
