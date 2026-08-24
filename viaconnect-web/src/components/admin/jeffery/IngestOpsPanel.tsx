'use client';

/**
 * Prompt 214b: Admin topic registry queue + Firecrawl credit snapshot.
 * Desktop + mobile responsive.
 */

import { useEffect, useState } from 'react';
import { ListPlus, Gauge } from 'lucide-react';

interface Topic {
  topic_key: string;
  query_text: string;
  domain: string;
  approval_status: string;
  is_active: boolean;
}

export function IngestOpsPanel() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/admin/ingest/topics');
      const body = (await res.json()) as { topics?: Topic[] };
      setTopics(body.topics ?? []);
    } catch {
      setError('Topic registry unavailable');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(topic_key: string, action: 'approve' | 'reject') {
    setBusy(true);
    try {
      await fetch('/api/admin/ingest/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_key, action }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      data-testid="ingest-ops-panel"
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/40 p-4 md:p-5 mt-4"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ListPlus className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-white">Ingest topic registry</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/50">
          <Gauge className="w-3.5 h-3.5" strokeWidth={1.5} />
          Firecrawl budgets: FIRECRAWL_MAX_PAGES_PER_RUN / FIRECRAWL_MAX_CREDITS_PER_DAY
        </div>
      </div>

      {error && <p className="text-xs text-white/55">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-white/80">
          <thead className="text-[10px] uppercase tracking-wide text-white/40">
            <tr>
              <th className="py-2 pr-3">Topic</th>
              <th className="py-2 pr-3">Query</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.topic_key} className="border-t border-white/[0.06]">
                <td className="py-2 pr-3 font-mono text-[11px]">{t.topic_key}</td>
                <td className="py-2 pr-3 max-w-[220px] truncate">{t.query_text}</td>
                <td className="py-2 pr-3">{t.approval_status}</td>
                <td className="py-2">
                  {t.approval_status === 'proposed' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void act(t.topic_key, 'approve')}
                        className="min-h-[36px] rounded-lg border border-[#2DA5A0]/40 px-2 text-[#2DA5A0]"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void act(t.topic_key, 'reject')}
                        className="min-h-[36px] rounded-lg border border-[#B75E18]/40 px-2 text-[#B75E18]"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {t.approval_status === 'approved' && (
                    <span className="text-white/40">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default IngestOpsPanel;
