'use client';

import { useEffect, useState } from 'react';
import { Bot, Loader2, AlertTriangle, Star, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { CalibratedAnalysis } from '@/lib/arnold/types';

type Status = 'pending' | 'queued' | 'analyzing' | 'complete' | 'failed';

interface Props {
  sessionId: string;
  onRetry?: () => void;
}

export function ArnoldAnalysisCard({ sessionId, onRetry }: Props) {
  const [status, setStatus] = useState<Status>('pending');
  const [analysis, setAnalysis] = useState<CalibratedAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function tick() {
      if (cancelled) return;
      const supabase = createClient();
      const { data, error: selErr } = await supabase
        .from('body_photo_sessions')
        .select('arnold_status, arnold_analysis, arnold_error, arnold_confidence')
        .eq('id', sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (selErr || !data) {
        setError(selErr?.message ?? 'Session not found');
        return;
      }
      const row = data as {
        arnold_status: Status;
        arnold_analysis: CalibratedAnalysis | null;
        arnold_error: string | null;
        arnold_confidence: number | null;
      };
      setStatus(row.arnold_status);
      setAnalysis(row.arnold_analysis);
      setError(row.arnold_error);
      setConfidence(row.arnold_confidence);

      if (row.arnold_status === 'queued' || row.arnold_status === 'analyzing') {
        timer = window.setTimeout(tick, 5000);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [sessionId]);

  if (status === 'queued' || status === 'analyzing') {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-white">Arnold is analyzing your photos</p>
            <p className="text-xs text-white/55 mt-0.5">This typically takes 15 to 30 seconds. Updates will appear automatically.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed' || error) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#FCA5A5] flex-none" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Analysis failed</p>
            <p className="text-xs text-[#FCA5A5] mt-1 break-words">{error ?? 'Unknown error'}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.15] bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 hover:bg-white/[0.08]"
              >
                <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
                Retry analysis
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-center text-white/50 text-sm">
        Analysis has not been run yet for this session.
      </div>
    );
  }

  const fat = analysis.bodyFatEstimate ?? analysis.estimatedBodyFatRange;
  const dev = analysis.muscleDevelopment;
  const devLabel = ['Undeveloped','Beginner','Intermediate','Advanced','Elite'][dev?.overall_level ?? 0];
  const postureLabel = analysis.posture?.overallAlignment
    ? analysis.posture.overallAlignment.replace('_', ' ')
    : 'Unknown';

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-5 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2DA5A0]/20">
            <Bot className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs text-white/55">Arnold&apos;s analysis</p>
            <p className="text-sm font-semibold text-white">Body composition assessment</p>
          </div>
        </div>
        {confidence !== null && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.04] px-2 py-1 text-[11px] text-white/70">
            <Star className="h-3 w-3 text-[#E8803A]" strokeWidth={1.5} />
            {Math.round(confidence * 100)}% confidence
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric label="Body fat"        value={`${fat.low} to ${fat.high}%`} />
        <Metric label="Distribution"    value={capitalize(analysis.fatDistributionPattern)} />
        <Metric label="Muscle level"    value={`${devLabel} (${dev?.overall_level ?? 0}/4)`} />
        <Metric label="Posture"         value={capitalize(postureLabel)} />
      </div>

      {analysis.calibrationNote && (
        <div className="rounded-lg border border-[#2DA5A0]/20 bg-[#2DA5A0]/5 px-3 py-2.5 text-xs text-white/75 leading-relaxed">
          {analysis.calibrationNote}
        </div>
      )}

      {analysis.coachingInsights && analysis.coachingInsights.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">
            Arnold says
          </p>
          <ul className="space-y-1.5">
            {analysis.coachingInsights.slice(0, 5).map((insight, i) => (
              <li key={i} className="text-xs text-white/75 leading-relaxed flex gap-2">
                <span className="text-[#2DA5A0] flex-none">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.posture?.deviations && analysis.posture.deviations.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">
            Posture notes
          </p>
          <ul className="space-y-1">
            {analysis.posture.deviations.map((d, i) => (
              <li key={i} className="text-[11px] text-white/65 leading-snug">
                <span className="font-medium capitalize">{d.type.replace(/_/g, ' ')}:</span>{' '}
                <span className="text-white/50">({d.severity})</span> {d.notes}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] text-white/50 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
