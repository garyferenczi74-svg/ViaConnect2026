'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  minutesOfDayFromInstant,
  computeTypicalScanMinute,
  isAtypicalScanTime,
  buildTimeOfDayAnnotation,
  formatTimeOfDay,
} from '@/lib/body-tracker/time-of-day-trend';
import { CyclePhaseTrendNote } from '@/components/body-tracker/scanning/CyclePhaseTrendNote';
import { useCyclePhaseSource } from '@/hooks/body-tracker/useCyclePhaseSource';

interface SessionRow {
  id: string;
  session_date: string;
  created_at: string;
  is_complete: boolean;
  poses_completed: string[];
  arnold_status: 'pending' | 'queued' | 'analyzing' | 'complete' | 'failed';
  arnold_confidence: number | null;
}

interface PhotoSessionHistoryProps {
  excludeSessionId?: string | null;
  limit?: number;
  onSelect?: (sessionId: string) => void;
}

export function PhotoSessionHistory({ excludeSessionId, limit = 10, onSelect }: PhotoSessionHistoryProps) {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (mounted) setSessions([]); return; }
      const { data } = await supabase
        .from('body_photo_sessions')
        .select('id, session_date, created_at, is_complete, poses_completed, arnold_status, arnold_confidence')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(limit);
      if (!mounted) return;
      const rows = ((data ?? []) as SessionRow[]).filter((s) => s.id !== excludeSessionId);
      setSessions(rows);
    })();
    return () => { mounted = false; };
  }, [excludeSessionId, limit]);

  // Time-of-day trend annotation (Prompt #169b section 11.2): compute the user's
  // TYPICAL scan time across the loaded history (local time-of-day from each
  // scan's created_at), then flag any scan captured MORE THAN 4 hours from it.
  // The flag is rendered as a subtle marker on each atypical row below.
  const typicalMinute = useMemo(() => {
    if (!sessions) return null;
    return computeTypicalScanMinute(
      sessions.map((s) => minutesOfDayFromInstant(s.created_at)),
    );
  }, [sessions]);

  // Opt-in, consumer-only cycle-phase trend annotation (Prompt #169b section
  // 11.2.3). Resolved ONCE here (the opt-in + the cycle source) and applied per
  // scan via annotationFor; default OFF means annotationFor returns null for the
  // vast majority and no cycle data is even read.
  const { annotationFor } = useCyclePhaseSource();

  if (sessions === null) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 flex items-center justify-center text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center">
        <Camera className="h-5 w-5 mx-auto mb-2 text-white/30" strokeWidth={1.5} />
        <p className="text-xs text-white/50">No previous sessions yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {sessions.map((s) => {
        const d = new Date(s.session_date);
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const scanMinute = minutesOfDayFromInstant(s.created_at);
        const atypical = isAtypicalScanTime(scanMinute, typicalMinute);
        const timeLabel = formatTimeOfDay(scanMinute);
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect?.(s.id)}
              className="w-full flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left hover:bg-white/[0.06] transition-colors"
            >
              <Camera className="h-4 w-4 text-white/55 flex-none" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-white">{label}</p>
                  {/* Atypical scan-time marker (section 11.2): subtle, never alarming. */}
                  {atypical && <AtypicalTimeMarker timeLabel={timeLabel} />}
                </div>
                <p className="text-[11px] text-white/50">
                  {s.poses_completed.length} of 4 poses
                </p>
                {/* Opt-in, consumer-only cycle-phase trend note (section 11.2.3).
                    Renders nothing unless the user has opted in AND a phase can be
                    computed from cycle data. */}
                <CyclePhaseTrendNote note={annotationFor(s.session_date)} />
              </div>
              <ArnoldStatusBadge status={s.arnold_status} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// A subtle "different time than usual" marker for a scan flagged atypical
// (section 11.2). It carries the explanation as a tooltip (title) so the row
// stays compact; "Some daily variation is normal."
function AtypicalTimeMarker({ timeLabel }: { timeLabel: string | null }) {
  return (
    <span
      data-testid="atypical-time-marker"
      title={buildTimeOfDayAnnotation()}
      className="inline-flex items-center gap-1 rounded-full border border-[#E8A33A]/30 bg-[#E8A33A]/10 px-1.5 py-0.5 text-[9px] text-[#E8A33A]"
    >
      <Clock className="h-2.5 w-2.5" strokeWidth={1.5} />
      {timeLabel ? `${timeLabel}, off your usual time` : 'Off your usual time'}
    </span>
  );
}

function ArnoldStatusBadge({ status }: { status: SessionRow['arnold_status'] }) {
  if (status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 px-2 py-0.5 text-[10px] text-[#86EFAC]">
        <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
        Analyzed
      </span>
    );
  }
  if (status === 'analyzing' || status === 'queued') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-2 py-0.5 text-[10px] text-[#2DA5A0]">
        <Clock className="h-3 w-3" strokeWidth={1.5} />
        Analyzing
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-0.5 text-[10px] text-[#FCA5A5]">
        <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/60">
      Pending
    </span>
  );
}
