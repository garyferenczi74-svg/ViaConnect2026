'use client';

// Prompt #94 Phase 6.8: Admin tool, manual archetype override.
// Posts to /api/admin/analytics/archetype-override and renders confirmation.
// The refinement tick respects manual overrides (signal_payload marker) so
// the choice is sticky.

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const ARCHETYPES = [
  { id: 'precision_wellness_seeker',    label: 'Precision Wellness Seeker' },
  { id: 'biohacker_optimizer',          label: 'Biohacker, Optimizer' },
  { id: 'chronic_condition_navigator',  label: 'Chronic Condition Navigator' },
  { id: 'preventive_health_parent',     label: 'Preventive Health Parent' },
  { id: 'performance_athlete',          label: 'Performance Athlete' },
  { id: 'longevity_investor',           label: 'Longevity Investor' },
  { id: 'genetic_curious_explorer',     label: 'Genetic Curious Explorer' },
];

interface OverrideResult {
  user_id: string;
  archetype_id: string;
  assigned_from: string;
  customer_archetype_id: string | null;
  previous_archetype_id: string | null;
}

export default function OverrideToolPage() {
  const [userId, setUserId] = useState('');
  const [archetypeId, setArchetypeId] = useState(ARCHETYPES[0].id);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OverrideResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!confirm(`Override the primary archetype for ${userId} to ${archetypeId}? This will be sticky against the daily refinement tick.`)) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch('/api/admin/analytics/archetype-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId.trim(),
          archetype_id: archetypeId,
          reason: reason.trim() || undefined,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setResult(json as OverrideResult);
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
          <ShieldCheck className="w-6 h-6 text-copper" strokeWidth={1.5} /> Override archetype
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Manually set a user's primary archetype. Sticky against the daily refinement tick.
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

        <label className="block text-xs text-gray-400 mb-1 mt-4">New primary archetype</label>
        <select
          value={archetypeId}
          onChange={(e) => setArchetypeId(e.target.value)}
          className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm text-white"
        >
          {ARCHETYPES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>

        <label className="block text-xs text-gray-400 mb-1 mt-4">Reason (optional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Practitioner feedback indicates user is in fact a longevity investor; CAQ undersold age and income."
          className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-gray-500"
        />

        <div className="mt-5">
          <button
            disabled={!userId.trim() || busy}
            onClick={run}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-copper hover:bg-amber-600 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />}
            Apply override
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
          <div className="flex items-center gap-2 mb-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-portal-green" strokeWidth={1.5} />
            <span>Override applied.</span>
          </div>
          <p className="text-sm">
            User <span className="font-mono">{result.user_id}</span> primary set to <span className="font-medium capitalize">{result.archetype_id.replace(/_/g, ' ')}</span>
            {result.previous_archetype_id ? (
              <> (was: <span className="capitalize">{result.previous_archetype_id.replace(/_/g, ' ')}</span>)</>
            ) : null}.
          </p>
        </section>
      )}
    </div>
  );
}
