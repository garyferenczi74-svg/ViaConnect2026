'use client';

import { Info } from 'lucide-react';
import type { BodyScanResult } from './BodyScanUploader';
import {
  BODY_SCAN_RESULTS_MUSCLE_IMPRESSION_TITLE,
  BODY_SCAN_RESULTS_NOT_MUSCLE_LBS,
  BODY_SCAN_RESULTS_RELIABLE_READING,
} from '@/lib/formavision/twoProtocolCopy';

interface BodyScanResultsProps {
  result: BodyScanResult;
  onRetake: () => void;
  onClose: () => void;
  onUseAsBaseline?: () => void;
}

const REGION_LABELS: Record<string, string> = {
  arms:  'Arms',
  chest: 'Chest',
  back:  'Back',
  core:  'Core',
  legs:  'Legs',
};

const CONFIDENCE_COLOR: Record<'low' | 'medium' | 'high', string> = {
  low:    '#B75E18',
  medium: '#F59E0B',
  high:   '#22C55E',
};

function MuscleBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="h-2 w-6 rounded-full"
          style={{ backgroundColor: i <= clamped ? '#2DA5A0' : 'rgba(255,255,255,0.1)' }}
        />
      ))}
      <span className="ml-1 text-[11px] text-white/50">{clamped}/5</span>
    </div>
  );
}

export function BodyScanResults({ result, onRetake, onClose, onUseAsBaseline }: BodyScanResultsProps) {
  const { estimates, scanDate } = result;
  const confColor = CONFIDENCE_COLOR[estimates.ai_confidence];
  const formattedDate = (() => {
    try { return new Date(scanDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return scanDate; }
  })();

  const muscleEntries = Object.entries(estimates.muscle_development).filter(
    ([k]) => REGION_LABELS[k] !== undefined,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Body Scan Results</h3>
          <p className="text-xs text-white/50">AI estimated from your 4 photos, {formattedDate}</p>
        </div>
        <span
          className="rounded-full px-2 py-1 text-[11px] font-medium"
          style={{ backgroundColor: `${confColor}1F`, color: confColor, border: `1px solid ${confColor}4D` }}
        >
          {estimates.ai_confidence.charAt(0).toUpperCase() + estimates.ai_confidence.slice(1)} confidence
        </span>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/5 p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/40">Body Fat</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {estimates.estimated_body_fat_min.toFixed(1)} to {estimates.estimated_body_fat_max.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/40">Body Type</p>
            <p className="mt-1 text-lg font-semibold capitalize text-white">{estimates.body_type}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/40">Fat Distribution</p>
            <p className="mt-1 text-lg font-semibold capitalize text-white">{estimates.fat_distribution}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/40">Waist to Hip</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {estimates.estimated_whr_min.toFixed(2)} to {estimates.estimated_whr_max.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/5 p-4">
        <p
          data-testid="body-scan-results-muscle-impression-title"
          className="mb-3 text-[11px] uppercase tracking-wider text-white/40"
        >
          {BODY_SCAN_RESULTS_MUSCLE_IMPRESSION_TITLE}
        </p>
        <div className="space-y-2">
          {muscleEntries.map(([key, val]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/70">{REGION_LABELS[key]}</span>
              <MuscleBar value={val} />
            </div>
          ))}
        </div>
        <p
          data-testid="body-scan-results-not-muscle-lbs"
          className="mt-3 text-[11px] leading-relaxed text-white/45"
        >
          {BODY_SCAN_RESULTS_NOT_MUSCLE_LBS}
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/55">
        <Info size={14} strokeWidth={1.5} className="mt-0.5 flex-none text-white/40" />
        <p>
          {BODY_SCAN_RESULTS_RELIABLE_READING}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onRetake}
          className="rounded-lg px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          Retake Photos
        </button>
        {onUseAsBaseline && (
          <button
            type="button"
            onClick={onUseAsBaseline}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-4 py-2 text-sm font-medium text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/25"
          >
            Use as Baseline
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2DA5A0] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2DA5A0]/90"
        >
          Done
        </button>
      </div>
    </div>
  );
}
