import Link from 'next/link';
import {
  FileArchive,
  Package,
  FileStack,
  Radio,
  Send,
  Key,
  ClipboardCheck,
  Users,
  KeyRound,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TILES = [
  { href: '/admin/compliance/soc2/packets',              label: 'Generated packets',   icon: Package },
  { href: '/admin/compliance/soc2/packets/new',          label: 'Generate packet',     icon: FileArchive },
  { href: '/admin/compliance/soc2/manual-evidence',      label: 'Manual evidence vault', icon: FileStack },
  { href: '/admin/compliance/soc2/collectors',           label: 'Collectors',          icon: Radio },
  { href: '/admin/compliance/soc2/distribution-targets', label: 'Distribution targets', icon: Send },
  { href: '/admin/compliance/soc2/signing-keys',         label: 'Signing keys',        icon: Key },
  { href: '/admin/compliance/soc2/auditor-grants',       label: 'Auditor grants',      icon: Users },
  { href: '/admin/compliance/soc2/pseudonym-requests',   label: 'Pseudonym requests',  icon: KeyRound },
];

export default async function Soc2OverviewPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const [packetsRes, manualRes, collectorsRes, distRes, keysRes] = await Promise.all([
    supabase.from('soc2_packets').select('id', { count: 'exact', head: true }),
    supabase.from('soc2_manual_evidence').select('id', { count: 'exact', head: true }).eq('archived', false),
    supabase.from('soc2_collector_config').select('collector_id, enabled'),
    supabase.from('soc2_distribution_targets').select('platform, enabled'),
    supabase.from('soc2_signing_keys').select('id, active').eq('active', true),
  ]);

  const packetsCount = packetsRes.count ?? 0;
  const manualActive = manualRes.count ?? 0;
  const collectors = (collectorsRes.data as Array<{ collector_id: string; enabled: boolean }> | null) ?? [];
  const distribution = (distRes.data as Array<{ platform: string; enabled: boolean }> | null) ?? [];
  const activeKeys = (keysRes.data as Array<{ id: string; active: boolean }> | null) ?? [];

  const enabledCollectors = collectors.filter((c) => c.enabled).length;
  const enabledDistribution = distribution.filter((d) => d.enabled).length;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">SOC 2 Evidence Exporter</h1>
            <p className="text-xs text-white/40">Monthly packet generator, signed deterministic ZIPs, Drata and Vanta push, auditor-ready.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Packets generated" value={packetsCount} tone="slate" />
          <Stat label="Active manual evidence" value={manualActive} tone="emerald" />
          <Stat label="Collectors enabled" value={`${enabledCollectors} / ${collectors.length}`} tone="blue" />
          <Stat label="Distribution enabled" value={`${enabledDistribution} / ${distribution.length}`} tone="amber" />
          <Stat label="Active signing keys" value={activeKeys.length} tone="emerald" />
        </div>

        <section>
          <div className="text-sm font-semibold text-white mb-3">Quick links</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TILES.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="flex items-center gap-3 rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-3"
              >
                <div className="w-9 h-9 rounded-md bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
                  <t.icon className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
                </div>
                <span className="text-sm text-white">{t.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: 'slate' | 'emerald' | 'blue' | 'amber' }) {
  const classes: Record<typeof tone, string> = {
    slate:   'border-white/[0.12] bg-white/[0.04] text-white/80',
    emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    blue:    'border-blue-400/30 bg-blue-500/10 text-blue-200',
    amber:   'border-amber-400/30 bg-amber-500/10 text-amber-200',
  };
  return (
    <div className={`rounded-lg border ${classes[tone]} p-3`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
