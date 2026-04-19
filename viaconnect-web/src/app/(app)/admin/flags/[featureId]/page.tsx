'use client';

// Prompt #93 Phase 4: feature flag detail editor.
// Provides:
//   - edit form for active / launch_phase / rollout_strategy / percentage /
//     cohort list / description / gate_behavior
//   - kill switch (with required reason)
//   - scheduled activation creator
//   - live evaluation test ("how does this flag resolve for user X?")
//   - audit trail (last 50 changes)

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  ArrowLeft,
  Beaker,
  CalendarPlus,
  CheckCircle2,
  History,
  Lock,
  LockOpen,
  Save,
  Shield,
} from 'lucide-react';

const supabase = createClient();

interface FeatureRow {
  id: string;
  display_name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  kill_switch_engaged: boolean;
  kill_switch_reason: string | null;
  launch_phase_id: string | null;
  rollout_strategy: string;
  rollout_percentage: number | null;
  rollout_cohort_ids: string[] | null;
  minimum_tier_level: number;
  gate_behavior: string;
}

interface PhaseRow {
  id: string;
  display_name: string;
  activation_status: string;
}

interface CohortRow {
  id: string;
  display_name: string;
}

interface AuditRow {
  id: string;
  change_type: string;
  change_reason: string | null;
  changed_at: string;
  new_state: unknown;
}

interface ActivationRow {
  id: string;
  target_action: string;
  scheduled_for: string;
  executed_at: string | null;
  canceled_at: string | null;
  execution_result: string | null;
}

const ROLLOUT_STRATEGIES = [
  'all_eligible',
  'percentage',
  'cohort_list',
  'opt_in',
  'internal_only',
  'kill_switch_off',
] as const;

export default function AdminFlagDetailPage() {
  const params = useParams<{ featureId: string }>();
  const featureId = params.featureId;
  const router = useRouter();

  const [feature, setFeature] = useState<FeatureRow | null>(null);
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [activations, setActivations] = useState<ActivationRow[]>([]);

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [killReason, setKillReason] = useState('');
  const [testUserId, setTestUserId] = useState('');
  const [testResult, setTestResult] = useState<unknown>(null);
  const [newScheduleAction, setNewScheduleAction] = useState('activate');
  const [newScheduleAt, setNewScheduleAt] = useState('');
  const [newSchedulePct, setNewSchedulePct] = useState<number>(0);

  const [form, setForm] = useState({
    is_active: true,
    launch_phase_id: null as string | null,
    rollout_strategy: 'all_eligible',
    rollout_percentage: null as number | null,
    rollout_cohort_ids: [] as string[],
    description: '',
    gate_behavior: 'hide',
  });

  const refresh = useCallback(async () => {
    const [featResp, phasesResp, cohortsResp, auditResp, schedResp] = await Promise.all([
      supabase.from('features').select('*').eq('id', featureId).maybeSingle(),
      supabase.from('launch_phases').select('id, display_name, activation_status').order('sort_order'),
      supabase.from('rollout_cohorts').select('id, display_name').eq('is_active', true),
      supabase
        .from('feature_flag_audit')
        .select('id, change_type, change_reason, changed_at, new_state')
        .eq('feature_id', featureId)
        .order('changed_at', { ascending: false })
        .limit(50),
      supabase
        .from('scheduled_flag_activations')
        .select('id, target_action, scheduled_for, executed_at, canceled_at, execution_result')
        .eq('feature_id', featureId)
        .order('scheduled_for', { ascending: false })
        .limit(10),
    ]);

    const row = featResp.data as FeatureRow | null;
    setFeature(row);
    if (row) {
      setForm({
        is_active: row.is_active,
        launch_phase_id: row.launch_phase_id,
        rollout_strategy: row.rollout_strategy,
        rollout_percentage: row.rollout_percentage,
        rollout_cohort_ids: row.rollout_cohort_ids ?? [],
        description: row.description ?? '',
        gate_behavior: row.gate_behavior,
      });
    }
    setPhases((phasesResp.data ?? []) as PhaseRow[]);
    setCohorts((cohortsResp.data ?? []) as CohortRow[]);
    setAudit((auditResp.data ?? []) as AuditRow[]);
    setActivations((schedResp.data ?? []) as ActivationRow[]);
  }, [featureId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = async () => {
    setSaveMessage(null);
    const response = await fetch(`/api/admin/flags/${featureId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patch: form }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setSaveMessage(`Save failed: ${err.error ?? response.status}`);
      return;
    }
    const result = await response.json();
    setSaveMessage(`Saved (${result.audit_entries} audit entries written).`);
    await refresh();
  };

  const toggleKillSwitch = async (engage: boolean) => {
    if (engage && !killReason.trim()) {
      setSaveMessage('A reason is required when engaging the kill switch.');
      return;
    }
    const response = await fetch(`/api/admin/flags/${featureId}/kill-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: engage ? 'engage' : 'release', reason: killReason }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setSaveMessage(`Kill switch failed: ${err.error ?? response.status}`);
      return;
    }
    setSaveMessage(engage ? 'Kill switch engaged.' : 'Kill switch released.');
    setKillReason('');
    await refresh();
  };

  const runEvaluationTest = async () => {
    setTestResult(null);
    const response = await fetch(`/api/admin/flags/${featureId}/evaluate-for`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId.trim() || null }),
    });
    if (!response.ok) {
      setTestResult({ error: `HTTP ${response.status}` });
      return;
    }
    setTestResult(await response.json());
  };

  const createSchedule = async () => {
    const targetValue: Record<string, unknown> = {};
    if (newScheduleAction === 'rollout_percentage_change') {
      targetValue.percentage = newSchedulePct;
    }
    const response = await fetch('/api/admin/scheduled-activations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature_id: featureId,
        target_action: newScheduleAction,
        target_value: targetValue,
        scheduled_for: new Date(newScheduleAt).toISOString(),
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setSaveMessage(`Schedule failed: ${err.error ?? response.status}`);
      return;
    }
    setSaveMessage('Scheduled.');
    setNewScheduleAt('');
    await refresh();
  };

  const cancelSchedule = async (id: string) => {
    const response = await fetch(`/api/admin/scheduled-activations/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      setSaveMessage('Cancel failed.');
      return;
    }
    await refresh();
  };

  const phaseOptions = useMemo(() => phases, [phases]);

  if (!feature) {
    return (
      <div className="min-h-screen bg-[#0B1520] text-white p-4 sm:p-6">
        <p className="text-sm text-white/60">Loading feature...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <button
            type="button"
            onClick={() => router.push('/admin/flags')}
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to all flags
          </button>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2">{feature.display_name}</h1>
          <p className="text-xs text-white/55 mt-1">
            <code className="mr-2">{feature.id}</code>
            {feature.category} · min tier {feature.minimum_tier_level}
          </p>
        </div>

        {saveMessage && (
          <div className="rounded-xl bg-[#2DA5A0]/10 border border-[#2DA5A0]/30 px-3 py-2 text-xs text-[#2DA5A0] flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
            {saveMessage}
          </div>
        )}

        {feature.kill_switch_engaged && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-red-400 flex-none" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-200">Kill switch engaged</p>
                <p className="text-xs text-red-200/80 mt-0.5">
                  {feature.kill_switch_reason ?? 'No reason provided.'}
                </p>
                <button
                  type="button"
                  onClick={() => toggleKillSwitch(false)}
                  className="inline-flex items-center gap-1.5 mt-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-100 px-3 py-1.5 text-xs font-medium"
                >
                  <LockOpen className="h-3.5 w-3.5" strokeWidth={1.5} /> Release kill switch
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Save className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} /> Configuration
          </h2>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded"
            />
            is_active
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs">
              Launch phase
              <select
                value={form.launch_phase_id ?? ''}
                onChange={(e) => setForm({ ...form, launch_phase_id: e.target.value || null })}
                className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
              >
                <option value="">(no phase gate)</option>
                {phaseOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name} ({p.activation_status})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs">
              Rollout strategy
              <select
                value={form.rollout_strategy}
                onChange={(e) => setForm({ ...form, rollout_strategy: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
              >
                {ROLLOUT_STRATEGIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs">
              Gate behavior
              <select
                value={form.gate_behavior}
                onChange={(e) => setForm({ ...form, gate_behavior: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
              >
                {['hide', 'preview', 'upgrade_prompt', 'read_only'].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            {form.rollout_strategy === 'percentage' && (
              <label className="block text-xs">
                Rollout percentage
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.rollout_percentage ?? 0}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      rollout_percentage: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
                />
              </label>
            )}
          </div>

          {form.rollout_strategy === 'cohort_list' && (
            <div className="text-xs">
              <p className="mb-1">Cohorts</p>
              <div className="flex flex-wrap gap-2">
                {cohorts.map((c) => {
                  const checked = form.rollout_cohort_ids.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 border ${
                        checked
                          ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                          : 'border-white/[0.1] bg-white/[0.04] text-white/70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.rollout_cohort_ids, c.id]
                            : form.rollout_cohort_ids.filter((id) => id !== c.id);
                          setForm({ ...form, rollout_cohort_ids: next });
                        }}
                      />
                      {c.display_name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <label className="block text-xs">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            />
          </label>

          <button
            type="button"
            onClick={save}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2DA5A0] text-[#0B1520] px-4 py-2 text-xs font-semibold hover:bg-[#2DA5A0]/90"
          >
            <Save className="h-3.5 w-3.5" strokeWidth={1.5} /> Save configuration
          </button>
        </section>

        {!feature.kill_switch_engaged && (
          <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-red-200 flex items-center gap-1.5">
              <Shield className="h-4 w-4" strokeWidth={1.5} /> Emergency kill switch
            </h2>
            <p className="text-xs text-red-200/75">
              Disables this feature immediately for every user, overriding every other gate.
              Cached evaluations invalidate within the next request.
            </p>
            <input
              type="text"
              value={killReason}
              onChange={(e) => setKillReason(e.target.value)}
              placeholder="Reason (required)"
              className="w-full rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-xs text-red-100 placeholder:text-red-300/50"
            />
            <button
              type="button"
              onClick={() => toggleKillSwitch(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/30 hover:bg-red-500/40 text-red-100 px-3 py-1.5 text-xs font-medium"
            >
              <Lock className="h-3.5 w-3.5" strokeWidth={1.5} /> Engage kill switch
            </button>
          </section>
        )}

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Beaker className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} /> Live evaluation test
          </h2>
          <p className="text-xs text-white/55">
            Bypasses the cache so you see the current effective state for a specific user id.
            Leave blank to evaluate for an anonymous session.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              placeholder="User UUID (or blank for anonymous)"
              className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              onClick={runEvaluationTest}
              className="rounded-lg bg-[#2DA5A0] text-[#0B1520] px-3 py-1.5 text-xs font-semibold hover:bg-[#2DA5A0]/90"
            >
              Evaluate
            </button>
          </div>
          {testResult !== null && (
            <pre className="text-[11px] text-white/80 bg-[#0B1520] rounded-lg p-2 overflow-x-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <CalendarPlus className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} /> Schedule a change
          </h2>
          <div className="grid sm:grid-cols-3 gap-2">
            <select
              value={newScheduleAction}
              onChange={(e) => setNewScheduleAction(e.target.value)}
              className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            >
              {['activate', 'deactivate', 'kill_switch_engage', 'kill_switch_release', 'rollout_percentage_change'].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={newScheduleAt}
              onChange={(e) => setNewScheduleAt(e.target.value)}
              className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            />
            {newScheduleAction === 'rollout_percentage_change' && (
              <input
                type="number"
                min={0}
                max={100}
                value={newSchedulePct}
                onChange={(e) => setNewSchedulePct(Number(e.target.value))}
                placeholder="Target %"
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
              />
            )}
          </div>
          <button
            type="button"
            onClick={createSchedule}
            disabled={!newScheduleAt}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DA5A0] text-[#0B1520] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Schedule
          </button>

          {activations.length > 0 && (
            <ul className="text-xs text-white/75 space-y-1 mt-2">
              {activations.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 bg-white/[0.04] rounded-lg px-2 py-1.5">
                  <span>
                    {a.target_action} @ {new Date(a.scheduled_for).toLocaleString()}
                    {a.executed_at
                      ? ` (executed ${a.execution_result ?? 'unknown'})`
                      : a.canceled_at
                      ? ' (canceled)'
                      : ''}
                  </span>
                  {!a.executed_at && !a.canceled_at && (
                    <button
                      type="button"
                      onClick={() => cancelSchedule(a.id)}
                      className="text-white/60 hover:text-red-300 text-[11px]"
                    >
                      Cancel
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <History className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} /> Audit trail (last 50)
          </h2>
          {audit.length === 0 ? (
            <p className="text-xs text-white/55">No changes logged yet.</p>
          ) : (
            <ul className="text-[11px] text-white/80 space-y-1">
              {audit.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 bg-white/[0.04] rounded-lg px-2 py-1.5">
                  <span>
                    <span className="font-medium">{a.change_type}</span>
                    {a.change_reason ? `: ${a.change_reason}` : ''}
                  </span>
                  <span className="text-white/50">{new Date(a.changed_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-white/40 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> Every save and kill-switch
          action is recorded in the audit trail.
        </p>
      </div>
    </div>
  );
}
