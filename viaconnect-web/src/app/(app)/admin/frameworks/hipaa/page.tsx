import Link from 'next/link';
import {
  Shield,
  FileText,
  AlertTriangle,
  Siren,
  Zap,
  Package,
  ChevronLeft,
  BookOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TILES = [
  { href: '/admin/frameworks/hipaa/risk-analysis',   label: 'Risk Analysis',           icon: BookOpen, ref: '164.308(a)(1)(ii)(A)' },
  { href: '/admin/frameworks/hipaa/sanctions',       label: 'Sanction Actions',        icon: AlertTriangle, ref: '164.308(a)(1)(ii)(C)' },
  { href: '/admin/frameworks/hipaa/breaches',        label: 'Breach Determinations',   icon: Siren, ref: '164.402 / 164.308(a)(6)(ii)' },
  { href: '/admin/frameworks/hipaa/contingency',     label: 'Contingency Plan Tests',  icon: Shield, ref: '164.308(a)(7)(ii)(D)' },
  { href: '/admin/frameworks/hipaa/emergency-access', label: 'Emergency Access',       icon: Zap, ref: '164.312(a)(2)(ii)' },
  { href: '/admin/frameworks/hipaa/device-media',    label: 'Device and Media',        icon: Package, ref: '164.310(d)' },
];

export default async function HipaaOverviewPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const [riskRes, sanctionRes, breachRes, contingencyRes, emergencyRes, deviceRes, breachConfirmedRes] = await Promise.all([
    supabase.from('hipaa_risk_analyses').select('id', { count: 'exact', head: true }),
    supabase.from('hipaa_sanction_actions').select('id', { count: 'exact', head: true }),
    supabase.from('hipaa_breach_determinations').select('id', { count: 'exact', head: true }),
    supabase.from('hipaa_contingency_plan_tests').select('id', { count: 'exact', head: true }),
    supabase.from('hipaa_emergency_access_invocations').select('id', { count: 'exact', head: true }).is('closed_at', null),
    supabase.from('hipaa_device_media_events').select('id', { count: 'exact', head: true }),
    supabase.from('hipaa_breach_determinations').select('id', { count: 'exact', head: true }).eq('determination', 'breach_confirmed'),
  ]);

  const counts = {
    risk: riskRes.count ?? 0,
    sanctions: sanctionRes.count ?? 0,
    breachTotal: breachRes.count ?? 0,
    breachConfirmed: breachConfirmedRes.count ?? 0,
    contingency: contingencyRes.count ?? 0,
    emergencyOpen: emergencyRes.count ?? 0,
    device: deviceRes.count ?? 0,
  };

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Compliance overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">HIPAA Security Rule</h1>
            <p className="text-xs text-white/40">45 CFR 164.302 to 318 safeguards. Steve Rica signs as Security Officer under 45 CFR 164.308(a)(2).</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Risk analyses" value={counts.risk} tone="slate" />
          <Stat label="Sanction actions" value={counts.sanctions} tone="amber" />
          <Stat label="Breach determinations" value={counts.breachTotal} tone="slate" />
          <Stat label="Confirmed breaches" value={counts.breachConfirmed} tone="red" />
          <Stat label="Open emergency access" value={counts.emergencyOpen} tone="amber" />
          <Stat label="Device events" value={counts.device} tone="slate" />
        </div>

        {counts.breachConfirmed > 0 ? (
          <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-4 flex items-start gap-3">
            <Siren className="w-5 h-5 text-red-300 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
            <div>
              <div className="text-sm font-semibold text-red-200">Breach confirmed</div>
              <p className="text-xs text-red-200/80 mt-1">
                At least one breach determination has been recorded as confirmed. Legal counsel must be notified within 24 hours per 45 CFR 164.400 series; OCR notification timeline begins on the date of discovery.
              </p>
              <Link
                href="/admin/frameworks/hipaa/breaches"
                className="inline-flex items-center gap-1 mt-2 text-xs text-red-200 hover:text-white"
              >
                View breach determinations
              </Link>
            </div>
          </div>
        ) : null}

        <section>
          <div className="text-sm font-semibold text-white mb-3">HIPAA subsurfaces</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TILES.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="flex items-start gap-3 rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-3"
              >
                <div className="w-9 h-9 rounded-md bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
                  <t.icon className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{t.label}</div>
                  <div className="text-[10px] text-white/50 font-mono">{t.ref}</div>
                </div>
                <FileText className="w-3.5 h-3.5 text-white/30 mt-1" strokeWidth={1.5} aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'amber' | 'red' }) {
  const classes: Record<typeof tone, string> = {
    slate: 'border-white/[0.12] bg-white/[0.04] text-white/80',
    amber: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    red:   'border-red-400/30 bg-red-500/10 text-red-200',
  };
  return (
    <div className={`rounded-lg border ${classes[tone]} p-3`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
