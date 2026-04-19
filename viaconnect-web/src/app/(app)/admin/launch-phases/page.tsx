'use client';

// Prompt #93 Phase 4: launch phase manager.
// Activating a phase is a two-step flow: press Arm, wait 60 seconds while a
// countdown ticks, then press Confirm. The server requires confirmed=true
// so a single-click cannot accidentally ship a major launch. Pausing a
// phase is the emergency rollback for every feature linked to it.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';

const supabase = createClient();

interface PhaseRow {
  id: string;
  display_name: string;
  description: string | null;
  phase_type: string;
  target_activation_date: string | null;
  actual_activation_date: string | null;
  activation_status: string;
  sort_order: number;
}

interface CountByPhase {
  [phaseId: string]: number;
}

const COUNTDOWN_SECONDS = 60;

export default function AdminLaunchPhasesPage() {
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [featureCounts, setFeatureCounts] = useState<CountByPhase>({});
  const [armedPhaseId, setArmedPhaseId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [phaseResp, featResp] = await Promise.all([
      supabase.from('launch_phases').select('*').order('sort_order'),
      supabase.from('features').select('launch_phase_id'),
    ]);
    setPhases((phaseResp.data ?? []) as PhaseRow[]);
    const counts: CountByPhase = {};
    for (const r of (featResp.data ?? []) as Array<{ launch_phase_id: string | null }>) {
      if (r.launch_phase_id) counts[r.launch_phase_id] = (counts[r.launch_phase_id] ?? 0) + 1;
    }
    setFeatureCounts(counts);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Countdown timer for the armed phase
  useEffect(() => {
    if (armedPhaseId === null) return;
    setCountdown(COUNTDOWN_SECONDS);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = COUNTDOWN_SECONDS - elapsed;
      if (remaining <= 0) {
        setCountdown(0);
        clearInterval(interval);
      } else {
        setCountdown(remaining);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [armedPhaseId]);

  const updateStatus = async (phaseId: string, status: string, confirmed: boolean) => {
    setMessage(null);
    const response = await fetch(`/api/admin/launch-phases/${phaseId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, confirmed }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Failed: ${err.error ?? response.status}`);
      return;
    }
    const result = await response.json();
    setMessage(
      `Phase ${phaseId}: ${status}. ${result.features_invalidated} feature caches invalidated.`,
    );
    setArmedPhaseId(null);
    await refresh();
  };

  const armed = useMemo(() => phases.find((p) => p.id === armedPhaseId) ?? null, [phases, armedPhaseId]);

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
          <h1 className="text-xl sm:text-2xl font-semibold mt-2">Launch phases</h1>
          <p className="text-xs text-white/55 mt-1">
            Activating a phase enables every feature linked to it. Two-step confirmation with a 60-second delay.
          </p>
        </div>

        {message && (
          <div className="rounded-xl bg-[#2DA5A0]/10 border border-[#2DA5A0]/30 px-3 py-2 text-xs text-[#2DA5A0] flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
            {message}
          </div>
        )}

        {armed && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-200">
              Armed: {armed.display_name}
            </p>
            <p className="text-xs text-amber-200/80 mt-1">
              {featureCounts[armed.id] ?? 0} features will become active when you confirm.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <button
                type="button"
                disabled={countdown > 0}
                onClick={() => updateStatus(armed.id, 'active', true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2DA5A0] text-[#0B1520] px-3 py-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {countdown > 0 ? `Confirm in ${countdown}s` : 'Confirm activation'}
              </button>
              <button
                type="button"
                onClick={() => setArmedPhaseId(null)}
                className="rounded-xl border border-white/[0.1] bg-white/[0.04] text-white px-3 py-2 text-xs font-medium hover:bg-white/[0.08]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <ul className="space-y-3">
          {phases.map((p) => {
            const count = featureCounts[p.id] ?? 0;
            const badgeColor =
              p.activation_status === 'active' || p.activation_status === 'completed'
                ? 'bg-emerald-500/15 text-emerald-300'
                : p.activation_status === 'paused'
                ? 'bg-red-500/15 text-red-300'
                : p.activation_status === 'canceled'
                ? 'bg-white/[0.06] text-white/50'
                : 'bg-amber-500/15 text-amber-300';
            return (
              <li key={p.id} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{p.display_name}</p>
                    <p className="text-[11px] text-white/50">
                      {p.phase_type} · target {p.target_activation_date ?? 'none'} · {count} features
                    </p>
                  </div>
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
                    {p.activation_status}
                  </span>
                </div>
                {p.description && (
                  <p className="text-xs text-white/65 leading-relaxed">{p.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {p.activation_status !== 'active' && p.activation_status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => setArmedPhaseId(p.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DA5A0]/20 text-[#2DA5A0] hover:bg-[#2DA5A0]/30 px-3 py-1.5 text-xs font-medium"
                    >
                      <Play className="h-3.5 w-3.5" strokeWidth={1.5} /> Arm activation
                    </button>
                  )}
                  {p.activation_status === 'active' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(p.id, 'paused', true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 px-3 py-1.5 text-xs font-medium"
                    >
                      <Pause className="h-3.5 w-3.5" strokeWidth={1.5} /> Pause (rollback)
                    </button>
                  )}
                  {p.activation_status === 'paused' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(p.id, 'active', true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DA5A0]/20 text-[#2DA5A0] hover:bg-[#2DA5A0]/30 px-3 py-1.5 text-xs font-medium"
                    >
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} /> Resume
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-[11px] text-white/40 flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.5} /> Use /admin/scheduled-activations
          to queue a phase change at a specific datetime.
        </p>
      </div>
    </div>
  );
}
