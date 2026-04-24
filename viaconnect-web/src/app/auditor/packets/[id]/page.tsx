// Prompt #122 P8: Auditor packet detail page. RLS + soc2_has_auditor_access()
// enforce that only grantees can read; we re-check in route for explicit 403.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, Download, FileArchive, AlertTriangle, ShieldCheck } from 'lucide-react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditorAccess } from '@/lib/soc2/auditor/accessLog';

export const dynamic = 'force-dynamic';

interface PacketRow {
  id: string;
  packet_uuid: string;
  period_start: string;
  period_end: string;
  attestation_type: string;
  tsc_in_scope: string[];
  generated_at: string;
  root_hash: string;
  size_bytes: number;
  signing_key_id: string;
  storage_sha256: string;
  status: string;
}

interface FileRow {
  id: string;
  relative_path: string;
  content_type: string;
  sha256: string;
  size_bytes: number;
  controls: string[];
}

export default async function AuditorPacketDetailPage({ params }: { params: { id: string } }) {
  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user || !user.email) {
    redirect('/auditor');
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  const { data: grant } = await sb
    .from('soc2_auditor_grants')
    .select('id, expires_at')
    .eq('auditor_email', user.email.toLowerCase())
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .contains('packet_ids', [params.id])
    .limit(1)
    .maybeSingle();

  if (!grant) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-white px-4 md:px-6 py-12 max-w-2xl mx-auto">
        <Link href="/auditor/dashboard" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Dashboard
        </Link>
        <div className="mt-6 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
            <div>
              <div className="font-semibold">Access not permitted</div>
              <p className="text-amber-200/90 mt-1">Your active grants do not include this packet.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [{ data: packet }, { data: files }] = await Promise.all([
    sb.from('soc2_packets')
      .select('id, packet_uuid, period_start, period_end, attestation_type, tsc_in_scope, generated_at, root_hash, size_bytes, signing_key_id, storage_sha256, status')
      .eq('id', params.id)
      .maybeSingle(),
    sb.from('soc2_packet_files')
      .select('id, relative_path, content_type, sha256, size_bytes, controls')
      .eq('packet_id', params.id)
      .order('relative_path', { ascending: true })
      .limit(1000),
  ]);

  if (!packet) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-white px-4 md:px-6 py-12">
        Packet not found.
      </div>
    );
  }

  const p = packet as PacketRow;
  const fileRows: FileRow[] = (files as FileRow[] | null) ?? [];

  // Log a 'packet_view' event, fire-and-forget.
  await logAuditorAccess({
    supabase: admin,
    grantId: (grant as { id: string }).id,
    packetId: p.id,
    action: 'packet_view',
  });

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
        <div>
          <Link href="/auditor/dashboard" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
            Dashboard
          </Link>
        </div>

        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
            <span>Packet access granted</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-mono">{p.packet_uuid}</h1>
          <p className="text-sm text-white/60">
            {p.period_start.slice(0, 10)} → {p.period_end.slice(0, 10)} · {p.attestation_type} · status: {p.status}
          </p>
        </header>

        <section className="rounded-lg border border-white/[0.10] bg-white/[0.03] p-4 space-y-2 text-xs text-white/70">
          <h2 className="text-sm font-semibold text-white mb-2">Packet metadata</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>Generated: <span className="text-white">{p.generated_at.slice(0, 16).replace('T', ' ')}</span></div>
            <div>Signing key: <span className="text-white font-mono">{p.signing_key_id}</span></div>
            <div>Root hash: <span className="text-white font-mono text-[10px] break-all">{p.root_hash}</span></div>
            <div>Storage sha256: <span className="text-white font-mono text-[10px] break-all">{p.storage_sha256}</span></div>
            <div>Size: <span className="text-white tabular-nums">{formatBytes(p.size_bytes)}</span></div>
            <div>TSCs: <span className="text-white font-mono">{p.tsc_in_scope.join(', ')}</span></div>
          </div>
        </section>

        <section className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4">
          <h2 className="text-sm font-semibold text-white mb-1">Download packet ZIP</h2>
          <p className="text-xs text-white/60 mb-3">
            One use signed URL, five minute expiry. Verify the ZIP locally using the public key JWKS at /.well-known/soc2-packet-jwks.json and the signed manifest inside.
          </p>
          <a
            href={`/api/auditor/packets/${p.id}/download`}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-500 hover:bg-emerald-600 transition px-4 py-2 text-sm font-medium text-black"
          >
            <Download className="w-4 h-4" strokeWidth={1.5} aria-hidden />
            Download ZIP
          </a>
        </section>

        <section className="rounded-lg border border-white/[0.10] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white">
            <FileArchive className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
            Files in packet ({fileRows.length})
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {fileRows.map((f) => (
              <div key={f.id} className="rounded-md border border-white/[0.08] bg-black/20 p-1.5 flex flex-wrap gap-2 text-[11px] text-white/70">
                <span className="font-mono text-white truncate max-w-[50%]">{f.relative_path}</span>
                <span className="text-white/50">{f.content_type}</span>
                <span className="tabular-nums">{formatBytes(f.size_bytes)}</span>
                {f.controls.length > 0 ? <span className="text-white/40">· {f.controls.join(', ')}</span> : null}
                <span className="ml-auto text-[10px] font-mono text-white/30 break-all">{f.sha256.slice(0, 12)}…</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
