import Link from 'next/link';
import {
  Shield,
  FileCheck,
  AlertTriangle,
  GitCompare,
  ChevronLeft,
  Layers,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { loadRegistry } from '@/lib/compliance/frameworks/registry';

export const dynamic = 'force-dynamic';

export default async function FrameworksDashboardPage() {
  const registry = loadRegistry();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const [
    soc2PacketsRes,
    soc2LatestRes,
    hipaaBreachRes,
    hipaaRiskRes,
    isoSoaRes,
    isoRisksRes,
    isoNcRes,
    flagsCriticalRes,
    flagsWarningRes,
    flagsInfoRes,
    flagsLatestScanRes,
  ] = await Promise.all([
    supabase.from('soc2_packets').select('id', { count: 'exact', head: true }),
    supabase.from('soc2_packets').select('generated_at, period_end').order('generated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('hipaa_breach_determinations').select('id', { count: 'exact', head: true }).eq('determination', 'breach_confirmed'),
    supabase.from('hipaa_risk_analyses').select('id', { count: 'exact', head: true }).not('approved_at', 'is', null),
    supabase.from('iso_statements_of_applicability').select('id', { count: 'exact', head: true }),
    supabase.from('iso_risk_register').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('iso_nonconformities').select('id', { count: 'exact', head: true }).not('status', 'in', '("closed","verified")'),
    supabase.from('framework_registry_flags').select('id', { count: 'exact', head: true }).is('resolved_at', null).eq('severity', 'critical'),
    supabase.from('framework_registry_flags').select('id', { count: 'exact', head: true }).is('resolved_at', null).eq('severity', 'warning'),
    supabase.from('framework_registry_flags').select('id', { count: 'exact', head: true }).is('resolved_at', null).eq('severity', 'info'),
    supabase.from('framework_registry_flags').select('last_seen_at').order('last_seen_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const soc2Packets = soc2PacketsRes.count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const soc2Latest = (soc2LatestRes.data as any) ?? null;
  const hipaaBreaches = hipaaBreachRes.count ?? 0;
  const hipaaRiskApproved = hipaaRiskRes.count ?? 0;
  const isoSoaEntries = isoSoaRes.count ?? 0;
  const isoOpenRisks = isoRisksRes.count ?? 0;
  const isoOpenNcs = isoNcRes.count ?? 0;
  const flagsCritical = flagsCriticalRes.count ?? 0;
  const flagsWarning = flagsWarningRes.count ?? 0;
  const flagsInfo = flagsInfoRes.count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastScan = (flagsLatestScanRes.data as any)?.last_seen_at ?? null;

  const soc2Tile = {
    id: 'soc2' as const,
    framework: registry.frameworks.soc2,
    href: '/admin/compliance/soc2',
    iconTone: 'text-emerald-300',
    headline: `${soc2Packets} packet${soc2Packets === 1 ? '' : 's'} generated`,
    subtext: soc2Latest ? `Latest period ended ${String(soc2Latest.period_end).slice(0, 10)}` : 'No packets yet',
    controlCount: registry.frameworks.soc2.controlPoints.length,
    statusTone: soc2Packets > 0 ? 'emerald' : 'amber',
    statusLabel: soc2Packets > 0 ? 'active' : 'awaiting first packet',
  };

  const hipaaTile = {
    id: 'hipaa_security' as const,
    framework: registry.frameworks.hipaa_security,
    href: '/admin/frameworks/hipaa',
    iconTone: 'text-blue-300',
    headline: hipaaBreaches > 0
      ? `${hipaaBreaches} breach confirmed`
      : `${hipaaRiskApproved} risk analysis${hipaaRiskApproved === 1 ? '' : 'es'} approved`,
    subtext: hipaaBreaches > 0 ? 'Legal escalation required' : 'Continuous attestation with annual risk analysis',
    controlCount: registry.frameworks.hipaa_security.controlPoints.length,
    statusTone: hipaaBreaches > 0 ? 'red' : hipaaRiskApproved > 0 ? 'emerald' : 'amber',
    statusLabel: hipaaBreaches > 0 ? 'action required' : hipaaRiskApproved > 0 ? 'active' : 'awaiting risk analysis',
  };

  const isoTile = {
    id: 'iso_27001_2022' as const,
    framework: registry.frameworks.iso_27001_2022,
    href: '/admin/frameworks/iso',
    iconTone: 'text-amber-300',
    headline: `${isoSoaEntries} of 93 SoA entries`,
    subtext: `${isoOpenRisks} open risk${isoOpenRisks === 1 ? '' : 's'}, ${isoOpenNcs} open NC${isoOpenNcs === 1 ? '' : 's'}`,
    controlCount: registry.frameworks.iso_27001_2022.controlPoints.length,
    statusTone: isoSoaEntries >= 50 ? 'emerald' : isoSoaEntries > 0 ? 'amber' : 'red',
    statusLabel: isoSoaEntries >= 50 ? 'active' : isoSoaEntries > 0 ? 'in progress' : 'awaiting SoA',
  };

  const tiles = [soc2Tile, hipaaTile, isoTile];
  const totalOpenFlags = flagsCritical + flagsWarning + flagsInfo;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/dashboard" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Admin dashboard
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Compliance frameworks</h1>
            <p className="text-xs text-white/40">Registry {registry.registryVersion}. SOC 2 + HIPAA Security Rule + ISO/IEC 27001:2022.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tiles.map((t) => (
            <Link key={t.id} href={t.href}
                  className="rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-4 flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
                  <Shield className={`w-5 h-5 ${t.iconTone}`} strokeWidth={1.5} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">{t.framework.displayName}</div>
                  <div className="text-[11px] text-white/50 font-mono">{t.framework.id}, {t.framework.attestationType}</div>
                </div>
                <StatusChip tone={t.statusTone}>{t.statusLabel}</StatusChip>
              </div>
              <div className="mt-1 text-sm text-white">{t.headline}</div>
              <div className="text-xs text-white/60">{t.subtext}</div>
              <div className="mt-2 pt-2 border-t border-white/[0.06] text-[11px] text-white/50 flex items-center justify-between">
                <span>{t.controlCount} control points</span>
                <span className="font-mono">v{t.framework.registryVersion}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/admin/frameworks/crosswalk"
                className="rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
              <GitCompare className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">Crosswalk viewer</div>
              <div className="text-xs text-white/60 mt-1">Browse cross-framework equivalences. Pick any control to see which collectors produce its evidence and which other frameworks reference it.</div>
            </div>
          </Link>

          <Link href="/admin/frameworks/consistency"
                className="rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
              {flagsCritical > 0
                ? <AlertTriangle className="w-4 h-4 text-red-300" strokeWidth={1.5} aria-hidden />
                : <FileCheck className="w-4 h-4 text-emerald-300" strokeWidth={1.5} aria-hidden />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">Consistency scan</div>
              <div className="text-xs text-white/60 mt-1">
                {totalOpenFlags === 0
                  ? 'No open flags. Registry is consistent.'
                  : `${flagsCritical} critical, ${flagsWarning} warning, ${flagsInfo} info open.`}
              </div>
              {lastScan ? (
                <div className="text-[10px] text-white/40 mt-1 font-mono">Last scan: {String(lastScan).slice(0, 19).replace('T', ' ')}</div>
              ) : (
                <div className="text-[10px] text-white/40 mt-1 font-mono">No scans on file yet</div>
              )}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ tone, children }: { tone: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
    amber: 'bg-amber-500/15 border-amber-400/30 text-amber-200',
    red: 'bg-red-500/20 border-red-400/40 text-red-200',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border ${map[tone] ?? 'bg-white/[0.05] border-white/[0.12] text-white/80'} flex-shrink-0`}>
      {children}
    </span>
  );
}
