'use client';

/**
 * Prompt 214c: Science & Authorities crawl allowlist approval queue.
 */

import { useEffect, useState } from 'react';
import { ShieldCheck, BookOpen } from 'lucide-react';

interface Source {
  domain: string;
  label: string;
  source_kind: string;
  approval_status: string;
  is_active: boolean;
}

export function AuthoritiesAllowlistPanel() {
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/admin/ingest/authorities');
      const body = (await res.json()) as { sources?: Source[] };
      setSources(body.sources ?? []);
    } catch {
      setError('Authorities allowlist unavailable (apply 214c migration if empty).');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(domain: string, action: 'approve' | 'reject') {
    setBusy(true);
    try {
      await fetch('/api/admin/ingest/authorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, action }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      data-testid="authorities-allowlist-panel"
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/40 p-4 md:p-5 mt-4"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-white">Science & Authorities allowlist</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/50">
          <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
          Thanos and Elysium crawl only approved domains
        </div>
      </div>

      {error && <p className="text-xs text-white/55">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-white/80">
          <thead className="text-[10px] uppercase tracking-wide text-white/40">
            <tr>
              <th className="py-2 pr-3">Domain</th>
              <th className="py-2 pr-3">Label</th>
              <th className="py-2 pr-3">Kind</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.domain} className="border-t border-white/[0.06]">
                <td className="py-2 pr-3 font-mono text-[11px]">{s.domain}</td>
                <td className="py-2 pr-3 max-w-[180px] truncate">{s.label}</td>
                <td className="py-2 pr-3">{s.source_kind}</td>
                <td className="py-2 pr-3">{s.approval_status}</td>
                <td className="py-2">
                  {s.approval_status === 'proposed' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void act(s.domain, 'approve')}
                        className="min-h-[36px] rounded-lg border border-[#2DA5A0]/40 px-2 text-[#2DA5A0]"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void act(s.domain, 'reject')}
                        className="min-h-[36px] rounded-lg border border-[#B75E18]/40 px-2 text-[#B75E18]"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {s.approval_status === 'approved' && (
                    <span className="text-white/40">Active</span>
                  )}
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-white/40">
                  No rows yet. Apply migration 20260812050000_prompt_214c_thanos_elysium.sql.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AuthoritiesAllowlistPanel;
