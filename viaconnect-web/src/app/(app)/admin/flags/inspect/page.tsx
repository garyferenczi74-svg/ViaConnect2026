'use client';

// Prompt #93 Phase 6: per-user flag inspector.
// Enter a user id; the page runs the evaluation engine for every feature
// and shows which ones are enabled and which gate blocked disabled ones.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, CheckCircle2, Search, XCircle } from 'lucide-react';

const supabase = createClient();

interface FeatureRow {
  id: string;
  display_name: string;
  category: string;
}

interface ResultRow {
  featureId: string;
  enabled: boolean;
  reason: string;
}

export default function AdminFlagInspectPage() {
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [userId, setUserId] = useState('');
  const [results, setResults] = useState<Record<string, ResultRow>>({});
  const [running, setRunning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('features')
        .select('id, display_name, category')
        .order('category');
      setFeatures((data ?? []) as FeatureRow[]);
    })();
  }, []);

  const runInspection = useCallback(async () => {
    setRunning(true);
    setResults({});
    const trimmed = userId.trim() || null;
    for (const f of features) {
      try {
        const response = await fetch(`/api/admin/flags/${f.id}/evaluate-for`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: trimmed }),
        });
        if (!response.ok) continue;
        const data = await response.json();
        setResults((prev) => ({
          ...prev,
          [f.id]: {
            featureId: f.id,
            enabled: data.result.enabled,
            reason: data.result.reason,
          },
        }));
      } catch {
        // skip failed features
      }
    }
    setRunning(false);
  }, [features, userId]);

  const enabled = Object.values(results).filter((r) => r.enabled).length;
  const disabled = Object.values(results).filter((r) => !r.enabled).length;

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
        <div>
          <Link
            href="/admin/flags"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to flags
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <Search className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} /> Per-user flag inspector
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Runs every feature through the evaluation engine for the given user id.
            Leave blank to evaluate as anonymous.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User UUID (or blank for anonymous)"
              className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              onClick={runInspection}
              disabled={running}
              className="rounded-lg bg-[#2DA5A0] text-[#0B1520] px-4 py-1.5 text-xs font-semibold hover:bg-[#2DA5A0]/90 disabled:opacity-50"
            >
              {running ? 'Inspecting...' : `Inspect ${features.length} features`}
            </button>
          </div>
          {Object.keys(results).length > 0 && (
            <p className="text-xs text-white/60">
              <span className="text-emerald-300">{enabled} enabled</span>
              {' · '}
              <span className="text-red-300">{disabled} disabled</span>
            </p>
          )}
        </div>

        {Object.keys(results).length > 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
            <ul className="divide-y divide-white/[0.06]">
              {features.map((f) => {
                const r = results[f.id];
                if (!r) return null;
                return (
                  <li key={f.id} className="p-3 flex items-center gap-3">
                    {r.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-300 flex-none" strokeWidth={1.5} />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-300 flex-none" strokeWidth={1.5} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        <Link href={`/admin/flags/${f.id}`} className="hover:text-[#2DA5A0]">
                          {f.display_name}
                        </Link>
                        <span className="text-white/40 text-[10px] ml-2">{f.category}</span>
                      </p>
                      <p className="text-[11px] text-white/55">{r.reason}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
