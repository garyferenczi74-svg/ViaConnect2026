'use client';

/**
 * Prompt 214d Gap 4: read-only dual-registry reconciliation view.
 * ACC seats vs ultrathink heartbeats. No merge actions.
 */

import { useEffect, useState } from 'react';
import { GitCompare, AlertTriangle } from 'lucide-react';

interface SideRow {
  agent_id: string;
  acc_name: string;
  ultrathink_name: string | null;
  ultrathink_active: boolean | null;
  last_heartbeat: string | null;
}

interface DriftPayload {
  checked?: boolean;
  flagged?: boolean;
  findings?: Array<{ kind: string; agent_key: string; detail: string }>;
  side_by_side?: SideRow[];
  acc_count?: number;
  ultrathink_mapped_count?: number;
}

export function RegistryReconciliationPanel() {
  const [data, setData] = useState<DriftPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/agents/registry-reconcile');
        const body = (await res.json()) as DriftPayload;
        setData(body);
      } catch {
        setError('Registry reconciliation unavailable');
      }
    })();
  }, []);

  return (
    <section
      data-testid="registry-reconciliation-panel"
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/40 p-4 md:p-5 mt-4"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-white">Registry reconciliation</h2>
        </div>
        <p className="text-[11px] text-white/45">
          ACC seats vs ultrathink heartbeats (read-only; no merge)
        </p>
      </div>

      {error && <p className="text-xs text-white/55">{error}</p>}

      {data?.flagged && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#B75E18]/30 bg-[#B75E18]/10 p-3 text-xs text-white/70">
          <AlertTriangle className="w-4 h-4 text-[#B75E18] shrink-0" strokeWidth={1.5} />
          <div>
            <p className="font-medium text-[#B75E18]">Drift flagged</p>
            <ul className="mt-1 space-y-1">
              {(data.findings ?? []).map((f) => (
                <li key={`${f.kind}-${f.agent_key}`}>{f.detail}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-white/80">
          <thead className="text-[10px] uppercase tracking-wide text-white/40">
            <tr>
              <th className="py-2 pr-3">Agent</th>
              <th className="py-2 pr-3">ACC</th>
              <th className="py-2 pr-3">Ultrathink</th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {(data?.side_by_side ?? []).map((r) => (
              <tr key={r.agent_id} className="border-t border-white/[0.06]">
                <td className="py-2 pr-3 font-mono text-[11px]">{r.agent_id}</td>
                <td className="py-2 pr-3">{r.acc_name}</td>
                <td className="py-2 pr-3">{r.ultrathink_name ?? '—'}</td>
                <td className="py-2 pr-3">
                  {r.ultrathink_active === null
                    ? 'n/a'
                    : r.ultrathink_active
                      ? 'yes'
                      : 'no'}
                </td>
                <td className="py-2 text-white/45 text-[11px]">
                  {r.last_heartbeat
                    ? new Date(r.last_heartbeat).toLocaleString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <p className="mt-3 text-[11px] text-white/40">
          ACC seats: {data.acc_count ?? 0} · Ultrathink mapped: {data.ultrathink_mapped_count ?? 0}
          . End-state recommendation: ACC authoritative for seats; ultrathink for operational
          heartbeats. Merge requires Gary ruling.
        </p>
      )}
    </section>
  );
}

export default RegistryReconciliationPanel;
