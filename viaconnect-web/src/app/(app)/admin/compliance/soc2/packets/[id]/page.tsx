import Link from 'next/link';
import { ChevronLeft, FileArchive, Send, Radio, Gauge } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface PacketRow {
  id: string;
  packet_uuid: string;
  period_start: string;
  period_end: string;
  attestation_type: string;
  tsc_in_scope: string[];
  generated_at: string;
  generated_by: string;
  rule_registry_version: string;
  root_hash: string;
  category_hashes: Record<string, string>;
  signing_key_id: string;
  signature_jwt: string;
  storage_key: string;
  storage_sha256: string;
  size_bytes: number;
  legal_hold: boolean;
  retention_until: string;
  status: string;
}

interface FileRow {
  id: string;
  relative_path: string;
  content_type: string;
  sha256: string;
  size_bytes: number;
  collector_id: string | null;
  controls: string[];
}

interface RunRow {
  collector_id: string;
  collector_version: string;
  data_source: string;
  row_count: number;
  duration_ms: number;
  executed_at: string;
  query_hash: string;
}

interface DistRow {
  platform: string;
  attempted_at: string;
  status: string;
  http_status: number | null;
  error_message: string | null;
}

export default async function PacketDetailPage({ params }: { params: { id: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const { data: packet } = await supabase
    .from('soc2_packets')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!packet) {
    return (
      <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
        <Link href="/admin/compliance/soc2/packets" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Packets
        </Link>
        <div className="mt-6 rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-sm px-3 py-2">
          Packet not found.
        </div>
      </div>
    );
  }

  const p = packet as PacketRow;

  const [filesRes, runsRes, distRes] = await Promise.all([
    supabase.from('soc2_packet_files').select('id, relative_path, content_type, sha256, size_bytes, collector_id, controls').eq('packet_id', p.id).order('relative_path', { ascending: true }).limit(1000),
    supabase.from('soc2_collector_runs').select('collector_id, collector_version, data_source, row_count, duration_ms, executed_at, query_hash').eq('packet_id', p.id).order('collector_id', { ascending: true }),
    supabase.from('soc2_distribution_attempts').select('platform, attempted_at, status, http_status, error_message').eq('packet_id', p.id).order('attempted_at', { ascending: false }),
  ]);
  const files: FileRow[] = (filesRes.data as FileRow[] | null) ?? [];
  const runs: RunRow[] = (runsRes.data as RunRow[] | null) ?? [];
  const dists: DistRow[] = (distRes.data as DistRow[] | null) ?? [];

  const filesByCategory = groupBy(files, (f) => f.relative_path.split('/')[0] ?? '(root)');
  const totalRows = runs.reduce((acc, r) => acc + r.row_count, 0);

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2/packets" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Packets
        </Link>
        <div className="flex items-start gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <FileArchive className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-lg font-semibold text-white font-mono">{p.packet_uuid}</h1>
            <p className="text-xs text-white/50">
              {p.period_start.slice(0, 10)} → {p.period_end.slice(0, 10)} · {p.attestation_type} · {p.status}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Files" value={files.length} />
          <Stat label="Collector runs" value={runs.length} />
          <Stat label="Total rows" value={totalRows} />
          <Stat label="Distribution attempts" value={dists.length} />
        </div>

        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-2 text-xs text-white/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Gauge className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
            Packet metadata
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>Generated: <span className="text-white">{p.generated_at.slice(0, 16).replace('T', ' ')}</span></div>
            <div>Generated by: <span className="text-white font-mono">{p.generated_by}</span></div>
            <div>Rule registry: <span className="text-white font-mono">{p.rule_registry_version}</span></div>
            <div>Signing key: <span className="text-white font-mono">{p.signing_key_id}</span></div>
            <div>Root hash: <span className="text-white font-mono text-[10px] break-all">{p.root_hash}</span></div>
            <div>Storage sha256: <span className="text-white font-mono text-[10px] break-all">{p.storage_sha256}</span></div>
            <div>Storage key: <span className="text-white font-mono text-[10px] break-all">{p.storage_key}</span></div>
            <div>Size: <span className="text-white tabular-nums">{formatBytes(p.size_bytes)}</span></div>
            <div>TSCs in scope: <span className="text-white font-mono">{p.tsc_in_scope.join(', ')}</span></div>
            <div>Retention until: <span className="text-white">{p.retention_until}</span></div>
            <div>Legal hold: <span className="text-white">{p.legal_hold ? 'yes' : 'no'}</span></div>
          </div>
        </section>

        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white">
            <Radio className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
            Collector runs ({runs.length})
          </div>
          <div className="space-y-1.5">
            {runs.map((r) => (
              <div key={r.collector_id + r.executed_at} className="rounded-md border border-white/[0.08] bg-black/20 p-2 flex flex-wrap gap-2 text-[11px] text-white/70 items-center">
                <span className="font-mono text-white">{r.collector_id}</span>
                <span className="text-white/50">v{r.collector_version}</span>
                <span className="tabular-nums">{r.row_count} rows</span>
                <span className="tabular-nums">{r.duration_ms}ms</span>
                <span className="ml-auto text-[10px] font-mono text-white/40 break-all">{r.query_hash.slice(0, 16)}…</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white">
            <Send className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
            Distribution attempts ({dists.length})
          </div>
          {dists.length === 0 ? (
            <p className="text-xs text-white/40 italic">No distribution attempts yet. Drata and Vanta pushes happen when those targets are enabled in distribution-targets.</p>
          ) : (
            <div className="space-y-1.5">
              {dists.map((d, i) => (
                <div key={i} className="rounded-md border border-white/[0.08] bg-black/20 p-2 flex flex-wrap gap-2 text-[11px] text-white/70 items-center">
                  <span className="font-mono text-white">{d.platform}</span>
                  <span className={d.status === 'succeeded' ? 'text-emerald-300' : d.status === 'failed' ? 'text-red-300' : 'text-amber-300'}>{d.status}</span>
                  {d.http_status !== null ? <span className="text-white/50">HTTP {d.http_status}</span> : null}
                  <span className="ml-auto text-[10px] text-white/40">{d.attempted_at.slice(0, 16).replace('T', ' ')}</span>
                  {d.error_message ? <div className="w-full text-[10px] text-red-200">{d.error_message}</div> : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white">
            <FileArchive className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
            Files ({files.length})
          </div>
          {Array.from(filesByCategory.entries()).map(([category, list]) => (
            <div key={category} className="mb-3">
              <div className="text-[11px] font-mono text-white/50 mb-1">{category} · {list.length} files</div>
              <div className="space-y-1">
                {list.map((f) => (
                  <div key={f.id} className="rounded-md border border-white/[0.08] bg-black/20 p-1.5 flex flex-wrap items-center gap-2 text-[11px] text-white/70">
                    <span className="font-mono text-white truncate max-w-[60%]">{f.relative_path}</span>
                    <span className="text-white/50">{f.content_type}</span>
                    <span className="tabular-nums">{formatBytes(f.size_bytes)}</span>
                    {f.collector_id ? <span className="text-white/40">· {f.collector_id}</span> : null}
                    {f.controls.length > 0 ? <span className="text-white/40">· {f.controls.join(', ')}</span> : null}
                    <span className="ml-auto text-[10px] font-mono text-white/30 break-all">{f.sha256.slice(0, 12)}…</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.12] bg-white/[0.04] p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function groupBy<T, K>(list: readonly T[], fn: (x: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of list) {
    const k = fn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(x);
  }
  return m;
}
