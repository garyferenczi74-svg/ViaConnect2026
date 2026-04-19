'use client';

// Prompt #93 Phase 4: scheduled activations manager.
// Lists pending scheduled flag changes. Admins can cancel before execution.
// Executed history shows the last 20 results for auditing.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';

const supabase = createClient();

interface ActivationRow {
  id: string;
  feature_id: string;
  target_action: string;
  target_value: unknown;
  scheduled_for: string;
  executed_at: string | null;
  execution_result: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
}

export default function AdminScheduledActivationsPage() {
  const [rows, setRows] = useState<ActivationRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('scheduled_flag_activations')
      .select('*')
      .order('scheduled_for', { ascending: false })
      .limit(50);
    setRows((data ?? []) as ActivationRow[]);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const cancel = async (id: string) => {
    const reason = window.prompt('Cancellation reason (optional)') ?? '';
    const response = await fetch(`/api/admin/scheduled-activations/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Cancel failed: ${err.error ?? response.status}`);
      return;
    }
    setMessage('Canceled.');
    await refresh();
  };

  const pending = rows.filter((r) => !r.executed_at && !r.canceled_at);
  const history = rows.filter((r) => r.executed_at || r.canceled_at);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/admin/flags"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to flags
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2">Scheduled activations</h1>
          <p className="text-xs text-white/55 mt-1">
            Pending rows are executed by the background job at or after their scheduled time.
          </p>
        </div>

        {message && (
          <div className="rounded-xl bg-[#2DA5A0]/10 border border-[#2DA5A0]/30 px-3 py-2 text-xs text-[#2DA5A0]">
            {message}
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-300" strokeWidth={1.5} /> Pending ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-xs text-white/55">No pending activations.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((r) => (
                <li key={r.id} className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      <Link href={`/admin/flags/${r.feature_id}`} className="hover:text-[#2DA5A0]">
                        {r.feature_id}
                      </Link>{' '}
                      → {r.target_action}
                    </p>
                    <p className="text-[11px] text-white/55">
                      {new Date(r.scheduled_for).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancel(r.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 text-red-200 hover:bg-red-500/25 px-3 py-1.5 text-xs"
                  >
                    <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} /> History
          </h2>
          {history.length === 0 ? (
            <p className="text-xs text-white/55">No history yet.</p>
          ) : (
            <ul className="space-y-1 text-[11px] text-white/75">
              {history.slice(0, 20).map((r) => (
                <li key={r.id} className="rounded-lg bg-white/[0.04] px-2 py-1.5 flex justify-between gap-3">
                  <span>
                    {r.feature_id} → {r.target_action}
                    {r.execution_result ? ` (${r.execution_result})` : r.canceled_at ? ' (canceled)' : ''}
                  </span>
                  <span className="text-white/50">
                    {new Date(r.executed_at ?? r.canceled_at ?? r.scheduled_for).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
