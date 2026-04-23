'use client';

// Prompt #114 P1: Customs dashboard shell.
//
// 6-tile overview for the CBP Customs e-Recordation + Counterfeit Customs
// module. Lives under /admin/legal/customs per the B1 routing decision
// (peer to /admin/legal/cases). At P1 only the Recordations tile fetches
// live data via /api/admin/legal/customs/recordations; the other 5 tiles
// ship as zero-state placeholders that light up in P2+.
//
// Mobile + desktop synchronised per CLAUDE.md quality gate: responsive
// grid collapses to 1 column on mobile, 2 on tablet, 3 on desktop.
// No emojis, no dashes in UI copy, Lucide icons at strokeWidth={1.5}.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  FileText,
  Clock,
  Package,
  Radar,
  Coins,
  ReceiptText,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

interface RecordationRow {
  recordation_id: string;
  status: string;
  cbp_expiration_date: string | null;
}

interface AlertRow {
  scan_result_id: string;
  status: string;
  is_synthetic: boolean;
}

export default function CustomsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordations, setRecordations] = useState<RecordationRow[]>([]);
  const [iprsAlerts, setIprsAlerts] = useState<AlertRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [rRec, rAlerts] = await Promise.all([
          fetch('/api/admin/legal/customs/recordations'),
          fetch('/api/admin/legal/customs/alerts?status=requires_review'),
        ]);
        const recJson = await rRec.json();
        if (!rRec.ok) throw new Error(recJson.error ?? `HTTP ${rRec.status}`);
        setRecordations(recJson.rows ?? []);

        const alertsJson = await rAlerts.json();
        if (rAlerts.ok) setIprsAlerts(alertsJson.rows ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeRecordations = recordations.filter((r) => r.status === 'active');
  const nextExpiration = activeRecordations
    .map((r) => r.cbp_expiration_date)
    .filter((d): d is string => d !== null)
    .sort()[0];
  const realAlertsRequiringReview = iprsAlerts.filter((a) => !a.is_synthetic).length;
  const syntheticAlerts = iprsAlerts.filter((a) => a.is_synthetic).length;

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/admin/legal"
              className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Legal Ops
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" strokeWidth={1.5} />
              Customs
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-3xl">
              CBP e-Recordation under 19 C.F.R. Part 133. Recordation renewals, Notice of Detention response workflow, seizure lifecycle, IPRS monitoring, and outbound e-Allegations. Statute deadlines tracked in US federal business days; every CBP-facing document requires counsel review before submission.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {!loading && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/legal/customs/recordations" className="contents">
            <Tile
              Icon={FileText}
              label="Active recordations"
              value={activeRecordations.length.toLocaleString()}
              caption={
                nextExpiration
                  ? `Next renewal: ${nextExpiration}`
                  : 'No active recordations yet'
              }
              accent="teal"
              clickable
            />
          </Link>
          <Tile
            Icon={Clock}
            label="Open detentions"
            value="0"
            caption="Ships in P5. Countdown pills at T minus 7 business days."
            accent="muted"
          />
          <Tile
            Icon={Package}
            label="Seizures year to date"
            value="0"
            caption="Ships in P6. 30 business day disclosure clock."
            accent="muted"
          />
          <Link href="/admin/legal/customs/alerts" className="contents">
            <Tile
              Icon={Radar}
              label="IPRS alerts"
              value={realAlertsRequiringReview.toLocaleString()}
              caption={
                syntheticAlerts > 0
                  ? `requires review. ${syntheticAlerts} synthetic row${syntheticAlerts === 1 ? '' : 's'} excluded from count.`
                  : 'requires review. Scheduled scan arrives in P4b.'
              }
              accent={realAlertsRequiringReview > 0 ? 'teal' : 'muted'}
              clickable
            />
          </Link>
          <Tile
            Icon={Coins}
            label="Moiety forecast"
            value="Restricted"
            caption="CFO and CEO access only. 19 U.S.C. 1619."
            accent="muted"
          />
          <Tile
            Icon={ReceiptText}
            label="Fees year to date"
            value="$0"
            caption="Recordation filing and renewal fees, posted to ledger."
            accent="muted"
          />
        </div>
      )}

      <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3">Module status</h2>
        <ul className="text-sm text-gray-300 space-y-2">
          <li className="inline-flex items-start gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2DA5A0] mt-1.5" aria-hidden />
            Phase 1 live: schema, RLS, business day math, dashboard shell.
          </li>
          <li className="inline-flex items-start gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-500 mt-1.5" aria-hidden />
            Phase 2 next: recordations CRUD and MSRP lookup.
          </li>
          <li className="inline-flex items-start gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-500 mt-1.5" aria-hidden />
            Phase 3: evidence + product linkage + case wiring.
          </li>
          <li className="inline-flex items-start gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-500 mt-1.5" aria-hidden />
            Phase 4: IPRS daily scan edge function.
          </li>
          <li className="inline-flex items-start gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-500 mt-1.5" aria-hidden />
            Phase 5: Marshall subagent and Hannah walkthrough mount.
          </li>
          <li className="inline-flex items-start gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-500 mt-1.5" aria-hidden />
            Phase 6: mobile parity polish and OBRA Gate A sign off.
          </li>
        </ul>
      </section>
    </div>
  );
}

interface TileProps {
  Icon: typeof FileText;
  label: string;
  value: string;
  caption: string;
  accent: 'teal' | 'muted';
  clickable?: boolean;
}

function Tile({ Icon, label, value, caption, accent, clickable }: TileProps) {
  const iconColor = accent === 'teal' ? 'text-[#2DA5A0]' : 'text-gray-500';
  const hover = clickable ? 'hover:border-[#2DA5A0]/60 cursor-pointer transition-colors' : '';
  return (
    <section className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5 min-h-[8rem] ${hover}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-gray-400">{label}</span>
        <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.5} />
      </div>
      <div className="text-2xl md:text-3xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{caption}</div>
    </section>
  );
}
