'use client';

// Prompt #104 Phase 2: Legal Ops dashboard.
// Lightweight first-cut: counts of active cases by state + bucket, plus
// quick links into the section. Real KPI tiles (resolution time,
// recovery rate) ship with Phase 7 alongside the revenue-recovery KPI.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Gavel, FolderSearch, Users, FileText, ScaleIcon, Briefcase, ShieldCheck, Loader2, AlertCircle,
} from 'lucide-react';

interface CaseRow {
  case_id: string;
  state: string;
  bucket: string;
  priority: string;
}

const SECTION_LINKS = [
  { href: '/admin/legal/cases',           label: 'Cases',          Icon: FolderSearch },
  { href: '/admin/legal/counterparties',  label: 'Counterparties', Icon: Users },
  { href: '/admin/legal/templates',       label: 'Templates',      Icon: FileText },
  { href: '/admin/legal/counsel',         label: 'Outside counsel', Icon: Briefcase },
  { href: '/admin/legal/settlements',     label: 'Settlements',    Icon: ScaleIcon },
  { href: '/admin/legal/customs',         label: 'Customs',        Icon: ShieldCheck },
];

export default function LegalOpsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CaseRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/legal/cases');
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        setRows(json.rows ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byState: Record<string, number> = {};
  const byBucket: Record<string, number> = {};
  for (const r of rows) {
    byState[r.state] = (byState[r.state] ?? 0) + 1;
    byBucket[r.bucket] = (byBucket[r.bucket] ?? 0) + 1;
  }
  const activeCount = rows.filter((r) => !['resolved_successful','closed_no_action','archived'].includes(r.state)).length;

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
              <Gavel className="w-6 h-6" strokeWidth={1.5} />
              Legal Ops
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Investigation, enforcement, counsel coordination. Every legal threat is human-approved; nothing leaves this system without a typed confirmation.
            </p>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 mb-6">
        {SECTION_LINKS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="text-xs px-3 py-1.5 rounded border border-white/10 text-gray-300 hover:text-white hover:border-copper inline-flex items-center gap-1.5"
          >
            <Icon className="w-3 h-3" strokeWidth={1.5} /> {label}
          </Link>
        ))}
      </nav>

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
        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Active cases</div>
            <div className="text-3xl font-bold">{activeCount.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">across all buckets and states</div>
          </section>
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">By state</div>
            <ul className="text-xs space-y-1">
              {Object.entries(byState).sort(([, a], [, b]) => b - a).map(([state, n]) => (
                <li key={state} className="flex items-center justify-between">
                  <span className="font-mono text-gray-300">{state}</span>
                  <span className="text-white">{n}</span>
                </li>
              ))}
              {Object.keys(byState).length === 0 && <li className="text-gray-500">No cases yet.</li>}
            </ul>
          </section>
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">By bucket</div>
            <ul className="text-xs space-y-1">
              {Object.entries(byBucket).sort(([, a], [, b]) => b - a).map(([bucket, n]) => (
                <li key={bucket} className="flex items-center justify-between">
                  <span className="font-mono text-gray-300">{bucket}</span>
                  <span className="text-white">{n}</span>
                </li>
              ))}
              {Object.keys(byBucket).length === 0 && <li className="text-gray-500">No cases yet.</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
