'use client';

// Prompt #93 Phase 4: admin flag management dashboard.
// Server-side role check is performed by the admin API routes. The page
// itself fetches with the authenticated client; the RLS policy on features
// admits authenticated reads, so non-admins can view but their write
// attempts hit a 403. UI gives quick visibility plus kill-switch access.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Filter, FlaskConical, Lock, Search, Settings } from 'lucide-react';

const supabase = createClient();

interface FeatureRow {
  id: string;
  display_name: string;
  category: string;
  is_active: boolean;
  kill_switch_engaged: boolean;
  launch_phase_id: string | null;
  rollout_strategy: string;
  rollout_percentage: number | null;
  minimum_tier_level: number;
}

interface PhaseRow {
  id: string;
  display_name: string;
  activation_status: string;
}

export default function AdminFlagsPage() {
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [phases, setPhases] = useState<Record<string, PhaseRow>>({});
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: feats }, { data: phaseRows }] = await Promise.all([
        supabase.from('features').select(
          'id, display_name, category, is_active, kill_switch_engaged, launch_phase_id, rollout_strategy, rollout_percentage, minimum_tier_level',
        ),
        supabase.from('launch_phases').select('id, display_name, activation_status'),
      ]);
      setFeatures(((feats ?? []) as FeatureRow[]).sort((a, b) => a.display_name.localeCompare(b.display_name)));
      const phaseMap: Record<string, PhaseRow> = {};
      for (const p of ((phaseRows ?? []) as PhaseRow[])) phaseMap[p.id] = p;
      setPhases(phaseMap);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(features.map((f) => f.category))).sort();
  }, [features]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return features.filter((f) => {
      if (categoryFilter && f.category !== categoryFilter) return false;
      if (!s) return true;
      return f.display_name.toLowerCase().includes(s) || f.id.toLowerCase().includes(s);
    });
  }, [features, search, categoryFilter]);

  const killSwitched = features.filter((f) => f.kill_switch_engaged);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
              Feature flags
            </h1>
            <p className="text-xs text-white/60 mt-1">
              {features.length} features; {killSwitched.length} kill-switched
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/launch-phases"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium hover:bg-white/[0.08]"
            >
              Launch phases
            </Link>
            <Link
              href="/admin/scheduled-activations"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium hover:bg-white/[0.08]"
            >
              Scheduled
            </Link>
          </div>
        </header>

        {killSwitched.length > 0 && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 sm:p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-none" strokeWidth={1.5} />
            <div className="text-sm text-red-100">
              <p className="font-semibold">
                {killSwitched.length} kill switch{killSwitched.length === 1 ? '' : 'es'} engaged
              </p>
              <p className="text-xs text-red-200/80 mt-0.5">
                {killSwitched.map((f) => f.display_name).join(', ')}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or id"
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/40"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" strokeWidth={1.5} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-white/[0.1] bg-white/[0.04] pl-9 pr-3 py-2 text-sm text-white min-w-[160px]"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-sm text-white/60">Loading features...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-white/60">No matching features.</div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {filtered.map((f) => {
                const phase = f.launch_phase_id ? phases[f.launch_phase_id] : null;
                const phaseActive = phase?.activation_status === 'active' || phase?.activation_status === 'completed';
                return (
                  <li key={f.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/flags/${f.id}`}
                          className="text-sm font-medium text-white hover:text-[#2DA5A0]"
                        >
                          {f.display_name}
                        </Link>
                        <code className="text-[10px] text-white/40">{f.id}</code>
                      </div>
                      <p className="text-xs text-white/55 mt-0.5">
                        {f.category} · tier {f.minimum_tier_level}
                        {phase ? ` · ${phase.display_name}` : ' · no phase'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {f.kill_switch_engaged ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 text-red-300 px-2 py-0.5 text-[10px] font-semibold">
                          <Lock className="h-3 w-3" strokeWidth={1.5} /> kill switch
                        </span>
                      ) : f.is_active ? (
                        phase && !phaseActive ? (
                          <span className="rounded-lg bg-amber-500/15 text-amber-300 px-2 py-0.5 text-[10px] font-semibold">
                            phase {phase.activation_status}
                          </span>
                        ) : (
                          <span className="rounded-lg bg-emerald-500/15 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                            active
                          </span>
                        )
                      ) : (
                        <span className="rounded-lg bg-white/10 text-white/60 px-2 py-0.5 text-[10px] font-semibold">
                          inactive
                        </span>
                      )}
                      <span className="rounded-lg bg-white/[0.06] text-white/70 px-2 py-0.5 text-[10px] font-medium">
                        {f.rollout_strategy}
                        {f.rollout_strategy === 'percentage' && f.rollout_percentage !== null
                          ? ` ${f.rollout_percentage}%`
                          : ''}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-white/40 flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" strokeWidth={1.5} /> Click a feature to edit its
          rollout, kill switch, and scheduled activations.
        </p>
      </div>
    </div>
  );
}
