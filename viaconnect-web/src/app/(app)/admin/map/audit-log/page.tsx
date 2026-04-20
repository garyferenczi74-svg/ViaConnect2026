'use client';

// Prompt #100 Phase 5: admin MAP audit log.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gavel } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LogRow {
  change_id: string;
  policy_id: string;
  changed_by: string;
  change_type: string;
  justification: string;
  admin_2fa_verified_at: string;
  created_at: string;
}

export default function AdminAuditLogPage() {
  const [rows, setRows] = useState<LogRow[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('map_policy_change_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setRows((data ?? []) as LogRow[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const exportCsv = () => {
    const header = 'change_id,policy_id,changed_by,change_type,justification,verified_at,created_at';
    const body = rows
      .map((r) =>
        [r.change_id, r.policy_id, r.changed_by, r.change_type, JSON.stringify(r.justification), r.admin_2fa_verified_at, r.created_at].join(','),
      )
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `map_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/admin/map" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> MAP Enforcement
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Gavel className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            Audit log
          </h1>
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-50 px-3 py-1.5 text-[11px] text-white/80"
          >
            Export CSV
          </button>
        </div>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-white/50 text-[10px] uppercase tracking-wide">
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 px-2">When</th>
                <th className="text-left py-2 px-2">Change</th>
                <th className="text-left py-2 px-2">Policy</th>
                <th className="text-left py-2 px-2">Justification</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.change_id} className="border-b border-white/[0.04]">
                  <td className="py-2 px-2 text-white/70">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 px-2 text-white/80">{r.change_type}</td>
                  <td className="py-2 px-2 font-mono text-[10px] text-white/60">{r.policy_id.slice(0, 8)}</td>
                  <td className="py-2 px-2 text-white/70">{r.justification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
