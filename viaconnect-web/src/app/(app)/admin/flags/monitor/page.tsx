'use client';

// Prompt #93 Phase 6: flag state monitoring dashboard.
// Groups the current flag roster by launch phase. Highlights kill switches
// in red. Lists scheduled activations in the next 30 days. Surfaces the
// 10 most-recently-changed features from the audit trail.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Activity, ArrowLeft, Clock, History, Lock } from 'lucide-react';

const supabase = createClient();

interface PhaseRow {
  id: string;
  display_name: string;
  activation_status: string;
}

interface FeatureRow {
  id: string;
  display_name: string;
  launch_phase_id: string | null;
  is_active: boolean;
  kill_switch_engaged: boolean;
  rollout_strategy: string;
  rollout_percentage: number | null;
}

interface PendingRow {
  id: string;
  feature_id: string;
  target_action: string;
  scheduled_for: string;
}

interface RecentChangeRow {
  id: string;
  feature_id: string;
  change_type: string;
  changed_at: string;
}

export default function AdminFlagMonitorPage() {
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [recent, setRecent] = useState<RecentChangeRow[]>([]);

  const refresh = useCallback(async () => {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [phasesResp, featuresResp, pendingResp, recentResp] = await Promise.all([
      supabase.from('launch_phases').select('id, display_name, activation_status').order('sort_order'),
      supabase.from('features').select(
        'id, display_name, launch_phase_id, is_active, kill_switch_engaged, rollout_strategy, rollout_percentage',
      ),
      supabase
        .from('scheduled_flag_activations')
        .select('id, feature_id, target_action, scheduled_for')
        .is('executed_at', null)
        .is('canceled_at', null)
        .lte('scheduled_for', thirtyDaysFromNow)
        .order('scheduled_for', { ascending: true }),
      supabase
        .from('feature_flag_audit')
        .select('id, feature_id, change_type, changed_at')
        .gte('changed_at', sevenDaysAgo)
        .order('changed_at', { ascending: false })
        .limit(10),
    ]);

    setPhases((phasesResp.data ?? []) as PhaseRow[]);
    setFeatures((featuresResp.data ?? []) as FeatureRow[]);
    setPending((pendingResp.data ?? []) as PendingRow[]);
    setRecent((recentResp.data ?? []) as RecentChangeRow[]);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const killSwitched = useMemo(() => features.filter((f) => f.kill_switch_engaged), [features]);
  const featuresByPhase = useMemo(() => {
    const grouped: Record<string, FeatureRow[]> = {};
    for (const f of features) {
      const key = f.launch_phase_id ?? '(no phase)';
      grouped[key] = grouped[key] ?? [];
      grouped[key].push(f);
    }
    return grouped;
  }, [features]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/admin/flags"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to flags
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} /> Flag monitor
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Auto-refreshes every 30 seconds. {features.length} features tracked.
          </p>
        </div>

        {killSwitched.length > 0 && (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 sm:p-4">
            <h2 className="text-sm font-semibold text-red-200 flex items-center gap-1.5">
              <Lock className="h-4 w-4" strokeWidth={1.5} /> Kill-switched ({killSwitched.length})
            </h2>
            <ul className="mt-2 text-xs text-red-200/90 space-y-1">
              {killSwitched.map((f) => (
                <li key={f.id}>
                  <Link href={`/admin/flags/${f.id}`} className="hover:underline">
                    {f.display_name}
                  </Link>
                  <code className="ml-2 text-[10px] text-red-300/70">{f.id}</code>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-300" strokeWidth={1.5} />
            Scheduled in the next 30 days ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-xs text-white/55">Nothing scheduled.</p>
          ) : (
            <ul className="space-y-1 text-xs text-white/80">
              {pending.slice(0, 20).map((p) => (
                <li key={p.id} className="flex justify-between gap-3 bg-white/[0.04] rounded-lg px-2 py-1.5">
                  <span>
                    <Link href={`/admin/flags/${p.feature_id}`} className="hover:text-[#2DA5A0]">
                      {p.feature_id}
                    </Link>
                    {' → '}
                    {p.target_action}
                  </span>
                  <span className="text-white/50">{new Date(p.scheduled_for).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Features by launch phase</h2>
          {phases.map((ph) => {
            const items = featuresByPhase[ph.id] ?? [];
            if (items.length === 0) return null;
            const badgeColor =
              ph.activation_status === 'active' || ph.activation_status === 'completed'
                ? 'bg-emerald-500/15 text-emerald-300'
                : ph.activation_status === 'paused'
                ? 'bg-red-500/15 text-red-300'
                : 'bg-amber-500/15 text-amber-300';
            return (
              <div key={ph.id} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium">{ph.display_name}</h3>
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
                    {ph.activation_status}
                  </span>
                </div>
                <ul className="text-[11px] text-white/75 divide-y divide-white/[0.05]">
                  {items.map((f) => (
                    <li key={f.id} className="py-1.5 flex items-center justify-between gap-2">
                      <Link href={`/admin/flags/${f.id}`} className="hover:text-[#2DA5A0] truncate">
                        {f.display_name}
                      </Link>
                      <span className="text-white/50">
                        {f.kill_switch_engaged
                          ? 'kill_switch'
                          : !f.is_active
                          ? 'inactive'
                          : f.rollout_strategy === 'percentage'
                          ? `${f.rollout_strategy} ${f.rollout_percentage ?? 0}%`
                          : f.rollout_strategy}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {featuresByPhase['(no phase)'] && featuresByPhase['(no phase)'].length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
              <h3 className="text-sm font-medium mb-2">No launch phase</h3>
              <ul className="text-[11px] text-white/75 divide-y divide-white/[0.05]">
                {featuresByPhase['(no phase)'].map((f) => (
                  <li key={f.id} className="py-1.5">
                    <Link href={`/admin/flags/${f.id}`} className="hover:text-[#2DA5A0]">
                      {f.display_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <History className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} /> Recent changes (last 7 days)
          </h2>
          {recent.length === 0 ? (
            <p className="text-xs text-white/55">No changes in the last 7 days.</p>
          ) : (
            <ul className="text-[11px] text-white/75 space-y-1">
              {recent.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 bg-white/[0.04] rounded-lg px-2 py-1.5">
                  <span>
                    <Link href={`/admin/flags/${r.feature_id}`} className="hover:text-[#2DA5A0]">
                      {r.feature_id}
                    </Link>
                    {' → '}
                    {r.change_type}
                  </span>
                  <span className="text-white/50">{new Date(r.changed_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex gap-2">
          <Link
            href="/admin/flags/audit"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium hover:bg-white/[0.08]"
          >
            Full audit trail
          </Link>
          <Link
            href="/admin/flags/inspect"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium hover:bg-white/[0.08]"
          >
            Per-user inspector
          </Link>
        </div>
      </div>
    </div>
  );
}
