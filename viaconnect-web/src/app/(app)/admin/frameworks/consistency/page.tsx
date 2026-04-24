import Link from 'next/link';
import { ChevronLeft, AlertTriangle, ShieldAlert, Info, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ConsistencyScanButton from '@/components/compliance/ConsistencyScanButton';
import ResolveFlagDialog from '@/components/compliance/ResolveFlagDialog';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  framework_id: string;
  control_ref: string;
  related_framework_id: string | null;
  related_control_ref: string | null;
  flag_kind: string;
  severity: string;
  description: string;
  registry_version: string;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export default async function ConsistencyPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const [openRes, resolvedRes] = await Promise.all([
    supabase
      .from('framework_registry_flags')
      .select('id, framework_id, control_ref, related_framework_id, related_control_ref, flag_kind, severity, description, registry_version, first_seen_at, last_seen_at, resolved_at, resolution_note')
      .is('resolved_at', null)
      .order('severity', { ascending: false })
      .order('last_seen_at', { ascending: false })
      .limit(200),
    supabase
      .from('framework_registry_flags')
      .select('id, framework_id, control_ref, related_framework_id, related_control_ref, flag_kind, severity, description, registry_version, first_seen_at, last_seen_at, resolved_at, resolution_note')
      .not('resolved_at', 'is', null)
      .order('resolved_at', { ascending: false })
      .limit(25),
  ]);
  const openRows: Row[] = (openRes.data as Row[] | null) ?? [];
  const resolvedRows: Row[] = (resolvedRes.data as Row[] | null) ?? [];

  const critical = openRows.filter((r) => r.severity === 'critical');
  const warning = openRows.filter((r) => r.severity === 'warning');
  const info = openRows.filter((r) => r.severity === 'info');

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Frameworks overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Consistency scan</h1>
            <p className="text-xs text-white/40">Registry-level cross-framework consistency checks. Critical flags block packet signing.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="grid grid-cols-3 gap-3 flex-1">
            <Stat label="Critical open" value={critical.length} tone="red" icon={ShieldAlert} />
            <Stat label="Warning open" value={warning.length} tone="amber" icon={AlertTriangle} />
            <Stat label="Info open" value={info.length} tone="slate" icon={Info} />
          </div>
          <div>
            <ConsistencyScanButton />
          </div>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">Open flags ({openRows.length})</h2>
          {openRows.length === 0 ? (
            <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-6 flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
              <div>
                <div className="text-sm font-semibold text-emerald-200">Registry is consistent</div>
                <p className="text-xs text-emerald-200/80 mt-1">No open consistency flags. If this is the first load, run a scan to populate the flag set.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {openRows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <SeverityBadge severity={r.severity} />
                    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-white/[0.12] bg-white/[0.05] text-white/80">{r.flag_kind.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-xs text-white">{r.control_ref}</span>
                    <span className="text-[11px] text-white/60">{shortFramework(r.framework_id)}</span>
                    {r.related_framework_id ? (
                      <>
                        <span className="text-[11px] text-white/40">vs.</span>
                        <span className="text-[11px] text-white/60">{shortFramework(r.related_framework_id)}</span>
                        {r.related_control_ref ? <span className="font-mono text-xs text-white">{r.related_control_ref}</span> : null}
                      </>
                    ) : null}
                    <span className="ml-auto text-[10px] text-white/40 font-mono">{r.registry_version}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/80">{r.description}</p>
                  <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-[10px] text-white/40">first seen {r.first_seen_at.slice(0, 10)}, last seen {r.last_seen_at.slice(0, 10)}</div>
                    <ResolveFlagDialog flagId={r.id} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {resolvedRows.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-white mb-3">Recently resolved ({resolvedRows.length})</h2>
            <div className="space-y-2">
              {resolvedRows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.08] bg-white/[0.01] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-emerald-400/30 bg-emerald-500/15 text-emerald-200">
                      <Check className="w-3 h-3" strokeWidth={1.5} aria-hidden />
                      resolved
                    </span>
                    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-white/[0.12] bg-white/[0.05] text-white/70">{r.flag_kind.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-xs text-white/80">{r.control_ref}</span>
                    <span className="ml-auto text-[10px] text-white/40">{r.resolved_at?.slice(0, 10)}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/60 line-clamp-2">{r.description}</p>
                  {r.resolution_note ? (
                    <p className="mt-1 text-xs text-emerald-200/70"><span className="text-white/40">Note:</span> {r.resolution_note}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, tone, icon: Icon }: { label: string; value: number; tone: 'red' | 'amber' | 'slate'; icon: typeof AlertTriangle }) {
  const classes: Record<typeof tone, string> = {
    red:   'border-red-400/30 bg-red-500/10 text-red-200',
    amber: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    slate: 'border-white/[0.12] bg-white/[0.04] text-white/80',
  };
  return (
    <div className={`rounded-lg border ${classes[tone]} p-3 flex items-center gap-3`}>
      <Icon className="w-5 h-5 opacity-80" strokeWidth={1.5} aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="text-xs opacity-80">{label}</div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-500/20 border-red-400/40 text-red-200',
    warning: 'bg-amber-500/15 border-amber-400/30 text-amber-200',
    info: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${map[severity] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70'}`}>
      {severity}
    </span>
  );
}

function shortFramework(fid: string): string {
  switch (fid) {
    case 'soc2': return 'SOC 2';
    case 'hipaa_security': return 'HIPAA';
    case 'iso_27001_2022': return 'ISO 27001';
    default: return fid;
  }
}
