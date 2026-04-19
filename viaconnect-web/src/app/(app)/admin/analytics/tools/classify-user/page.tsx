'use client';

// Prompt #94 Phase 6.7: Admin tool, classify a user.
// Posts to /api/admin/analytics/archetype-classify and renders the
// classification result. Useful for hand-validating the engine and for
// reclassifying after a user updates their CAQ.

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Wand2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface ClassifyResult {
  user_id: string;
  primary: { archetype_id: string; score: number };
  secondary: Array<{ archetype_id: string; score: number }>;
  confidence: number;
  assigned_from: string;
}

export default function ClassifyUserToolPage() {
  const [userId, setUserId] = useState('');
  const [includeBehavior, setIncludeBehavior] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch('/api/admin/analytics/archetype-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId.trim(), include_behavior: includeBehavior }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setResult(json as ClassifyResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/analytics" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Analytics
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 inline-flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-copper" strokeWidth={1.5} /> Classify user
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Re-runs the archetype classifier for a user and persists the primary assignment.
        </p>
      </header>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 max-w-2xl">
        <label className="block text-xs text-gray-400 mb-1">User UUID</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="00000000, 0000, 0000, 0000, 000000000000"
          className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-gray-500 font-mono"
        />
        <label className="mt-4 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeBehavior}
            onChange={(e) => setIncludeBehavior(e.target.checked)}
          />
          Include behavioral signals
        </label>
        <div className="mt-5">
          <button
            disabled={!userId.trim() || busy}
            onClick={run}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-copper hover:bg-amber-600 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Wand2 className="w-4 h-4" strokeWidth={1.5} />}
            Classify
          </button>
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {result && (
        <section className="mt-6 rounded-xl border border-portal-green/30 bg-portal-green/10 p-5 max-w-2xl">
          <div className="flex items-center gap-2 mb-3 text-sm">
            <CheckCircle2 className="w-4 h-4 text-portal-green" strokeWidth={1.5} />
            <span>Classification persisted. assigned_from: <span className="font-mono">{result.assigned_from}</span></span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400">Primary</p>
              <p className="text-lg font-semibold mt-1 capitalize">{result.primary.archetype_id.replace(/_/g, ' ')}</p>
              <p className="text-xs text-gray-400 mt-1">score: {result.primary.score.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Confidence</p>
              <p className="text-lg font-semibold mt-1">{result.confidence.toFixed(3)}</p>
              <p className="text-xs text-gray-400 mt-1">primary minus runner up</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">Secondary</p>
            <ul className="text-sm space-y-1">
              {result.secondary.map((s) => (
                <li key={s.archetype_id} className="flex justify-between">
                  <span className="capitalize">{s.archetype_id.replace(/_/g, ' ')}</span>
                  <span className="text-gray-400 font-mono text-xs">{s.score.toFixed(3)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
