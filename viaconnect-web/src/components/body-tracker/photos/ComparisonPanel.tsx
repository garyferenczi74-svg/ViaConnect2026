'use client';

import { useEffect, useState } from 'react';
import { GitCompareArrows, Layers, Loader2, SplitSquareVertical, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { PoseId } from '@/lib/arnold/types';
import { PHOTO_POSES } from './poseConstants';
import { SideBySideComparison } from './SideBySideComparison';
import { OverlaySlider } from './OverlaySlider';
import { TimelineGallery } from './TimelineGallery';
import { ProgressReport, type ProgressReportPayload } from './ProgressReport';

type Mode = 'side_by_side' | 'overlay';

interface ComparisonPanelProps {
  defaultAfterSessionId?: string | null;
}

interface PhotoData {
  id: string;
  date: string;
  fullUrl: string | null;
}

const POSE_OPTIONS: Array<{ id: PoseId; label: string }> = PHOTO_POSES.map((p) => ({ id: p.id, label: p.label }));

export function ComparisonPanel({ defaultAfterSessionId }: ComparisonPanelProps) {
  const [mode, setMode] = useState<Mode>('side_by_side');
  const [pose, setPose] = useState<PoseId>('front');
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(defaultAfterSessionId ?? null);
  const [beforeData, setBeforeData] = useState<PhotoData | null>(null);
  const [afterData, setAfterData]   = useState<PhotoData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportPayload, setReportPayload] = useState<ProgressReportPayload | null>(null);

  useEffect(() => {
    if (defaultAfterSessionId && !afterId) setAfterId(defaultAfterSessionId);
  }, [defaultAfterSessionId, afterId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const pathCol = `${pose}_full_path`;

      async function load(id: string | null): Promise<PhotoData | null> {
        if (!id) return null;
        const { data } = await supabase
          .from('body_photo_sessions')
          .select(`id, session_date, ${pathCol}`)
          .eq('id', id)
          .maybeSingle();
        if (!data) return null;
        const row = data as unknown as Record<string, unknown>;
        const path = (row[pathCol] as string | null) ?? null;
        let url: string | null = null;
        if (path) {
          const { data: s } = await supabase.storage.from('body-progress-photos').createSignedUrl(path, 3600);
          url = s?.signedUrl ?? null;
        }
        return { id: row.id as string, date: row.session_date as string, fullUrl: url };
      }

      const [b, a] = await Promise.all([load(beforeId), load(afterId)]);
      if (mounted) { setBeforeData(b); setAfterData(a); }
    })();
    return () => { mounted = false; };
  }, [beforeId, afterId, pose]);

  const selected = [beforeId, afterId].filter((v): v is string => !!v);

  function handlePick(id: string) {
    if (!beforeId) { setBeforeId(id); return; }
    if (!afterId)  { setAfterId(id); return; }
    // Both set: replace the older one (before)
    setBeforeId(afterId);
    setAfterId(id);
  }

  function reset() {
    setBeforeId(null);
    setAfterId(defaultAfterSessionId ?? null);
    setReportPayload(null);
    setReportError(null);
  }

  async function generateReport() {
    if (!beforeId || !afterId) return;
    setReportLoading(true);
    setReportError(null);
    setReportPayload(null);
    try {
      const supabase = createClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhkcufyqjojdbvdrpky.supabase.co') + '/functions/v1/arnold-progress-report';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token ?? ''}` },
        body: JSON.stringify({ before_session_id: beforeId, after_session_id: afterId }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'complete') {
        setReportError(json.error ?? 'Report generation failed');
        return;
      }
      setReportPayload(json as ProgressReportPayload);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Report generation failed');
    } finally {
      setReportLoading(false);
    }
  }

  const bothReady = beforeData?.fullUrl && afterData?.fullUrl;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
          <GitCompareArrows className="h-3.5 w-3.5" strokeWidth={1.5} />
          Compare sessions
        </h3>
        <div className="flex items-center gap-2">
          <PoseSelector value={pose} onChange={setPose} />
          <ModeToggle value={mode} onChange={setMode} />
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
        <p className="text-[11px] text-white/55">
          {selected.length === 0 && 'Tap two thumbnails below to pick a before and after.'}
          {selected.length === 1 && 'Pick one more session to compare.'}
          {selected.length === 2 && `Comparing ${pose} view. Tap Reset to change selection.`}
        </p>
        <TimelineGallery pose={pose} onSelect={handlePick} selectedIds={selected} />
        {selected.length === 2 && (
          <button
            type="button"
            onClick={reset}
            className="text-[11px] text-[#2DA5A0] hover:underline"
          >
            Reset selection
          </button>
        )}
      </div>

      {bothReady && beforeId && afterId && (
        mode === 'side_by_side' ? (
          <SideBySideComparison beforeSessionId={beforeId} afterSessionId={afterId} pose={pose} />
        ) : (
          <OverlaySlider
            beforeUrl={beforeData!.fullUrl!}
            afterUrl={afterData!.fullUrl!}
            beforeLabel={new Date(beforeData!.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            afterLabel={new Date(afterData!.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          />
        )
      )}

      {bothReady && beforeId && afterId && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={generateReport}
            disabled={reportLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-[#E8803A]/40 bg-[#E8803A]/15 px-4 py-2.5 text-sm font-semibold text-[#E8803A] hover:bg-[#E8803A]/25 min-h-[44px] disabled:opacity-50"
          >
            {reportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            )}
            {reportLoading ? 'Generating report' : 'Generate Arnold progress report'}
          </button>
          {reportError && <p className="text-xs text-[#FCA5A5]">{reportError}</p>}
          {reportPayload && <ProgressReport payload={reportPayload} />}
        </div>
      )}
    </section>
  );
}

function PoseSelector({ value, onChange }: { value: PoseId; onChange: (p: PoseId) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PoseId)}
      className="rounded-lg border border-white/[0.08] bg-[#1A2744] px-2 py-1.5 text-xs text-white focus:border-[#2DA5A0] focus:outline-none min-h-[36px]"
    >
      {POSE_OPTIONS.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}

function ModeToggle({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <div role="radiogroup" aria-label="Comparison mode" className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 text-xs">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'side_by_side'}
        onClick={() => onChange('side_by_side')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md min-h-[32px] font-medium ${
          value === 'side_by_side' ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]' : 'text-white/60'
        }`}
      >
        <SplitSquareVertical className="h-3 w-3" strokeWidth={1.5} />
        Side by side
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'overlay'}
        onClick={() => onChange('overlay')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md min-h-[32px] font-medium ${
          value === 'overlay' ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]' : 'text-white/60'
        }`}
      >
        <Layers className="h-3 w-3" strokeWidth={1.5} />
        Overlay
      </button>
    </div>
  );
}
