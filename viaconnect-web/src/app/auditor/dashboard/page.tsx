// Prompt #122 P8: Auditor dashboard. Requires an authenticated Supabase
// session whose email ties to an active grant.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck, Clock, FileArchive, AlertTriangle } from 'lucide-react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

interface GrantRow {
  id: string;
  auditor_firm: string;
  packet_ids: string[];
  granted_at: string;
  expires_at: string;
  access_count: number;
}

interface PacketRow {
  id: string;
  packet_uuid: string;
  period_start: string;
  period_end: string;
  attestation_type: string;
  generated_at: string;
  size_bytes: number;
  tsc_in_scope: string[];
  root_hash: string;
}

export default async function AuditorDashboardPage() {
  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user || !user.email) {
    redirect('/auditor');
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  const { data: grants } = await sb
    .from('soc2_auditor_grants')
    .select('id, auditor_firm, packet_ids, granted_at, expires_at, access_count')
    .eq('auditor_email', user.email.toLowerCase())
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true });
  const grantRows: GrantRow[] = (grants as GrantRow[] | null) ?? [];

  if (grantRows.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-white">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 space-y-6">
          <header className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-300" strokeWidth={1.5} aria-hidden />
            <h1 className="text-xl md:text-2xl font-bold">ViaConnect SOC 2 Evidence Portal</h1>
          </header>
          <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
              <div>
                <div className="font-semibold">No active grants</div>
                <p className="text-amber-200/90 mt-1">Your engagement may have expired or not yet started. Contact your engagement partner at FarmCeutica Wellness LLC.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const allPacketIds = Array.from(new Set(grantRows.flatMap((g) => g.packet_ids)));
  const { data: packets } = await sb
    .from('soc2_packets')
    .select('id, packet_uuid, period_start, period_end, attestation_type, generated_at, size_bytes, tsc_in_scope, root_hash')
    .in('id', allPacketIds);
  const packetRows: PacketRow[] = (packets as PacketRow[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
            ViaConnect SOC 2 Evidence Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Welcome, {grantRows[0].auditor_firm}</h1>
          <p className="text-sm text-white/60">Signed in as {user.email}. Every action on this portal is logged.</p>
        </header>

        <section>
          <h2 className="text-sm font-semibold text-white/80 mb-2">Active grants</h2>
          <div className="space-y-2">
            {grantRows.map((g) => {
              const daysRemaining = Math.round((new Date(g.expires_at).getTime() - Date.now()) / 86_400_000);
              return (
                <div key={g.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3 text-xs text-white/70 flex flex-wrap items-center gap-3">
                  <Clock className="w-3.5 h-3.5 text-white/60" strokeWidth={1.5} aria-hidden />
                  <span>Granted: {g.granted_at.slice(0, 10)}</span>
                  <span>Expires: {g.expires_at.slice(0, 10)}</span>
                  <span className={daysRemaining <= 7 ? 'text-amber-300' : 'text-white/60'}>{daysRemaining}d remaining</span>
                  <span>Packets: {g.packet_ids.length}</span>
                  <span className="ml-auto">Accesses: <span className="tabular-nums text-white">{g.access_count}</span></span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white/80 mb-2">Packets available to you ({packetRows.length})</h2>
          {packetRows.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-white/60">
              Your grants reference packets that are not yet available. Contact your engagement partner.
            </div>
          ) : (
            <div className="space-y-2">
              {packetRows.map((p) => (
                <Link
                  key={p.id}
                  href={`/auditor/packets/${p.id}`}
                  className="block rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-3"
                >
                  <div className="flex items-start gap-2 flex-wrap">
                    <FileArchive className="w-4 h-4 text-[#B75E18] mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white font-mono truncate">{p.packet_uuid}</div>
                      <div className="text-xs text-white/60">{p.period_start.slice(0, 10)} → {p.period_end.slice(0, 10)} · {p.attestation_type}</div>
                    </div>
                    <span className="text-[11px] text-white/50 tabular-nums">{formatBytes(p.size_bytes)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/50">
                    <span>TSCs: {p.tsc_in_scope.join(', ')}</span>
                    <span>Root: <code className="font-mono">{p.root_hash.slice(0, 16)}…</code></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
