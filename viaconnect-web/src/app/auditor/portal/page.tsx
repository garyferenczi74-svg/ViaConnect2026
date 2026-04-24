// Prompt #127 P8: Auditor framework portal selector.
//
// Shows the logged-in auditor which frameworks they hold active grants
// for. One card per framework with a count of accessible packets and
// a direct link into the framework-scoped dashboard. Auditors with a
// single-framework grant are auto-redirected to that dashboard.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck, ChevronRight, AlertTriangle, FileArchive } from 'lucide-react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadRegistry } from '@/lib/compliance/frameworks/registry';
import type { FrameworkId } from '@/lib/compliance/frameworks/types';

export const dynamic = 'force-dynamic';

interface GrantRow {
  id: string;
  auditor_firm: string;
  framework_id: string;
  packet_ids: string[];
  expires_at: string;
  granted_at: string;
  access_count: number;
}

export default async function AuditorPortalPage() {
  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user || !user.email) {
    redirect('/auditor');
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  const { data } = await sb
    .from('soc2_auditor_grants')
    .select('id, auditor_firm, framework_id, packet_ids, expires_at, granted_at, access_count')
    .eq('auditor_email', user.email.toLowerCase())
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true });

  const grants: GrantRow[] = (data as GrantRow[] | null) ?? [];

  if (grants.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-white">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 space-y-6">
          <header className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-300" strokeWidth={1.5} aria-hidden />
            <h1 className="text-xl md:text-2xl font-bold">ViaConnect Evidence Portal</h1>
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

  const byFramework = new Map<string, GrantRow[]>();
  for (const g of grants) {
    const arr = byFramework.get(g.framework_id) ?? [];
    arr.push(g);
    byFramework.set(g.framework_id, arr);
  }

  const frameworks = Array.from(byFramework.keys());

  // Single framework: skip the selector and redirect.
  if (frameworks.length === 1) {
    redirect(`/auditor/dashboard?framework=${frameworks[0]}`);
  }

  const registry = loadRegistry();

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
            ViaConnect Evidence Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Welcome, {grants[0].auditor_firm}</h1>
          <p className="text-sm text-white/60">Signed in as {user.email}. Pick the framework you want to review.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {frameworks.map((fid) => {
            const def = registry.frameworks[fid as FrameworkId];
            const frameworkGrants = byFramework.get(fid) ?? [];
            const packetCount = Array.from(new Set(frameworkGrants.flatMap((g) => g.packet_ids))).length;
            const soonestExpiry = frameworkGrants
              .map((g) => g.expires_at)
              .sort()[0];
            const daysRemaining = Math.round((new Date(soonestExpiry).getTime() - Date.now()) / 86_400_000);
            return (
              <Link
                key={fid}
                href={`/auditor/dashboard?framework=${fid}`}
                className="rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-4 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
                    <FileArchive className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">{def?.displayName ?? fid}</div>
                    <div className="text-[11px] text-white/50 font-mono">{def?.attestationType ?? fid}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40 mt-1" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-white/70">
                  <span>{packetCount} packet{packetCount === 1 ? '' : 's'}</span>
                  <span className="text-white/40">·</span>
                  <span>{frameworkGrants.length} grant{frameworkGrants.length === 1 ? '' : 's'}</span>
                  <span className="text-white/40">·</span>
                  <span className={daysRemaining <= 7 ? 'text-amber-300' : 'text-white/60'}>
                    {daysRemaining}d remaining
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
