'use client';

// Prompt #106 — shop_refresh_audit_log viewer (append-only).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ScrollText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AuditRow {
  audit_id: string;
  occurred_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action_category: string;
  action_verb: string;
  sku: string | null;
  context_json: Record<string, unknown> | null;
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const { data } = await sb.from('shop_refresh_audit_log')
      .select('audit_id, occurred_at, actor_user_id, actor_role, action_category, action_verb, sku, context_json')
      .order('occurred_at', { ascending: false })
      .limit(500);
    setRows((data as AuditRow[] | null) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin/shop" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Shop refresh
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Audit log
        </h1>
        <p className="text-xs text-white/55">
          Append only. UPDATE and DELETE blocked at the trigger level. Last 500 events.
        </p>

        <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-black/20 text-white/60">
              <tr>
                <th className="text-left font-normal p-3">When</th>
                <th className="text-left font-normal p-3">Category</th>
                <th className="text-left font-normal p-3">Verb</th>
                <th className="text-left font-normal p-3">SKU</th>
                <th className="text-left font-normal p-3">Role</th>
                <th className="text-left font-normal p-3">Context</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.audit_id} className="border-t border-white/[0.05]">
                  <td className="p-3 text-white/65 whitespace-nowrap">{r.occurred_at.slice(0, 19).replace('T', ' ')}</td>
                  <td className="p-3 text-white/70">{r.action_category}</td>
                  <td className="p-3 text-white/85 font-mono text-[11px]">{r.action_verb}</td>
                  <td className="p-3 text-white/65">{r.sku ?? ''}</td>
                  <td className="p-3 text-white/55">{r.actor_role ?? ''}</td>
                  <td className="p-3 text-white/55 font-mono text-[10px] max-w-xs truncate">
                    {r.context_json ? JSON.stringify(r.context_json).slice(0, 60) : ''}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-xs text-white/55">No events yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
