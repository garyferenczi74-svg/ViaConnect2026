import Link from 'next/link';
import { ChevronLeft, FileSignature, Check, CircleAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { loadRegistry } from '@/lib/compliance/frameworks/registry';
import type { FrameworkId } from '@/lib/compliance/frameworks/types';
import GateASignoffForm from '@/components/compliance/GateASignoffForm';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  framework_id: string;
  attestor_role: string;
  signed_by: string;
  signed_name: string;
  signed_at: string;
  registry_version: string;
  scope_summary: string;
  outstanding_flags_critical: number;
  outstanding_flags_warning: number;
  attestation_text: string;
  revoked: boolean;
}

const FRAMEWORK_TO_ROLE: Record<FrameworkId, 'compliance_officer' | 'security_officer' | 'isms_manager'> = {
  soc2: 'compliance_officer',
  hipaa_security: 'security_officer',
  iso_27001_2022: 'isms_manager',
};

interface PageProps {
  searchParams: { framework?: string };
}

export default async function GateAPage({ searchParams }: PageProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('compliance_gate_a_signoffs')
    .select('id, framework_id, attestor_role, signed_by, signed_name, signed_at, registry_version, scope_summary, outstanding_flags_critical, outstanding_flags_warning, attestation_text, revoked')
    .eq('revoked', false)
    .order('signed_at', { ascending: false })
    .limit(50);
  const rows: Row[] = (data as Row[] | null) ?? [];
  const requestedFramework = (searchParams.framework ?? '').trim();

  const registry = loadRegistry();
  const activeFrameworks = Object.values(registry.frameworks);

  const activeByKey = new Map<string, Row>();
  for (const r of rows) {
    activeByKey.set(`${r.framework_id}|${r.attestor_role}`, r);
  }

  const populatedIds = activeFrameworks
    .filter((f) => f.controlPoints.length > 0)
    .map((f) => f.id);
  const allPopulatedSigned = populatedIds.every((fid) => {
    const expectedRole = FRAMEWORK_TO_ROLE[fid];
    return activeByKey.has(`${fid}|${expectedRole}`);
  });

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/dashboard" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Admin dashboard
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <FileSignature className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Gate A sign-off</h1>
            <p className="text-xs text-white/40">Multi-framework compliance initiative readiness. Each active framework requires a sign-off from its attestor role.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {allPopulatedSigned && populatedIds.length > 0 ? (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-4 flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
            <div>
              <div className="text-sm font-semibold text-emerald-200">Gate A cleared</div>
              <p className="text-xs text-emerald-200/80 mt-1">
                All populated frameworks have an active sign-off on file. The multi-framework compliance initiative is ready to ship.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 flex items-start gap-3">
            <CircleAlert className="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
            <div>
              <div className="text-sm font-semibold text-amber-200">Gate A pending</div>
              <p className="text-xs text-amber-200/80 mt-1">
                One or more active frameworks still awaits its attestor sign-off. Gate A clears when every populated framework has an active row below.
              </p>
            </div>
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">Framework status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeFrameworks.map((f) => {
              const expectedRole = FRAMEWORK_TO_ROLE[f.id];
              const active = activeByKey.get(`${f.id}|${expectedRole}`);
              const populated = f.controlPoints.length > 0;
              return (
                <article key={f.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white">{f.displayName}</div>
                      <div className="text-[11px] text-white/50 font-mono">{f.id}</div>
                    </div>
                    {!populated ? (
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-slate-400/30 bg-slate-500/15 text-slate-200">stub</span>
                    ) : active ? (
                      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-emerald-400/30 bg-emerald-500/15 text-emerald-200">
                        <Check className="w-3 h-3" strokeWidth={1.5} aria-hidden />
                        signed
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-amber-400/30 bg-amber-500/15 text-amber-200">awaiting</span>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] text-white/60">
                    Required attestor role: <span className="font-mono text-white/80">{expectedRole}</span>
                  </div>
                  {active ? (
                    <div className="mt-2 text-[11px] text-white/70">
                      <div><span className="text-white/40">Signer:</span> {active.signed_name}</div>
                      <div><span className="text-white/40">At:</span> {active.signed_at.slice(0, 16).replace('T', ' ')}</div>
                      <div><span className="text-white/40">Registry:</span> <span className="font-mono">{active.registry_version}</span></div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4 max-w-2xl">
          <h2 className="text-sm font-semibold text-white mb-3">Record a sign-off</h2>
          <GateAPicker
            requestedFramework={requestedFramework}
            frameworks={activeFrameworks.map((f) => ({
              id: f.id,
              displayName: f.displayName,
              attestorRole: FRAMEWORK_TO_ROLE[f.id],
              attestationLanguage: f.attestationLanguage,
              populated: f.controlPoints.length > 0,
            }))}
          />
        </section>

        {rows.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-white mb-3">Active sign-offs ({rows.length})</h2>
            <div className="space-y-2">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-emerald-400/30 bg-emerald-500/15 text-emerald-200">
                      {r.framework_id}
                    </span>
                    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-white/[0.12] bg-white/[0.05] text-white/80">
                      {r.attestor_role}
                    </span>
                    <span className="text-xs text-white/70">{r.signed_name}</span>
                    <span className="ml-auto text-[10px] text-white/50 font-mono">{r.signed_at.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/70 line-clamp-2"><span className="text-white/40">Scope:</span> {r.scope_summary}</p>
                  <p className="mt-1 text-xs text-white/70 line-clamp-3"><span className="text-white/40">Attestation:</span> {r.attestation_text}</p>
                  <div className="mt-1 text-[10px] text-white/40 flex gap-3">
                    <span>Registry <span className="font-mono">{r.registry_version}</span></span>
                    <span>Outstanding flags: {r.outstanding_flags_critical} critical, {r.outstanding_flags_warning} warning</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function GateAPicker({
  requestedFramework,
  frameworks,
}: {
  requestedFramework: string;
  frameworks: Array<{ id: string; displayName: string; attestorRole: string; attestationLanguage: string; populated: boolean }>;
}) {
  const available = frameworks.filter((f) => f.populated);
  if (available.length === 0) {
    return <div className="text-xs text-white/50">No active frameworks ready for sign-off.</div>;
  }
  const pick = available.find((f) => f.id === requestedFramework) ?? available[0];
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {available.map((f) => (
          <Link
            key={f.id}
            href={`/admin/frameworks/gate-a?framework=${f.id}`}
            className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium border transition ${
              f.id === pick.id
                ? 'border-[#B75E18]/60 bg-[#B75E18]/20 text-white'
                : 'border-white/[0.12] bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
            }`}
          >
            {f.displayName}
          </Link>
        ))}
      </div>
      <GateASignoffForm
        key={pick.id}
        frameworkId={pick.id}
        frameworkLabel={pick.displayName}
        attestorRole={pick.attestorRole}
        suggestedScope={`Controls and safeguards listed in the ${pick.displayName} registry as of the current version.`}
        suggestedAttestationText={pick.attestationLanguage}
      />
    </>
  );
}
