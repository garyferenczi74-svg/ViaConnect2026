'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { CompositionEstimate } from '@/lib/arnold/scanning/types';
import { classifyFFMI } from '@/lib/arnold/brain/anthropometricStandards';
import { RevealableMetric, TrendRange } from './RevealableMetric';
import type { NumbersOptionalController } from './numbersOptionalController';

interface CompositionBreakdownCardProps {
  composition: CompositionEstimate;
  sex: 'male' | 'female';
  // Optional "Hide specific numbers" controller (Prompt #169b section 3.2.4).
  // When absent the card behaves exactly as before (numbers always shown).
  numbers?: NumbersOptionalController;
}

export function CompositionBreakdownCard({ composition, sex, numbers }: CompositionBreakdownCardProps) {
  const [methods, setMethods] = useState(false);
  const ffmiLabel = classifyFFMI(sex, composition.ffmi);

  // Metric ids: bodyFatPct is one of the two FULLY-hidden metrics (section
  // 3.2.4). Visceral fat index is the other; it is not surfaced in this card, so
  // there is nothing to hide here for it (it is hidden wherever it appears).
  const bodyFat = resolveMetric(numbers, 'bodyFatPct');
  const leanMass = resolveMetric(numbers, 'leanMassKg');
  const fatMass = resolveMetric(numbers, 'fatMassKg');
  const ffmi = resolveMetric(numbers, 'ffmi');

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-4 space-y-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Body composition</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat
          label="Body fat"
          accent="#2DA5A0"
          metric={bodyFat}
          value={`${composition.bodyFatPct.low.toFixed(1)} to ${composition.bodyFatPct.high.toFixed(1)}%`}
          sub={`mid ${composition.bodyFatPct.mid.toFixed(1)}%`}
          // bodyFatPct is hidden entirely when the mode is on: no range fallback.
        />
        <Stat
          label="Lean mass"
          accent="#22C55E"
          metric={leanMass}
          value={kgToLbs(composition.leanMassKg.mid)}
          sub={`${kgToLbs(composition.leanMassKg.low)} to ${kgToLbs(composition.leanMassKg.high)}`}
          range={`${kgToLbs(composition.leanMassKg.low)} to ${kgToLbs(composition.leanMassKg.high)}`}
        />
        <Stat
          label="Fat mass"
          accent="#E8803A"
          metric={fatMass}
          value={kgToLbs(composition.fatMassKg.mid)}
          sub={`${kgToLbs(composition.fatMassKg.low)} to ${kgToLbs(composition.fatMassKg.high)}`}
          range={`${kgToLbs(composition.fatMassKg.low)} to ${kgToLbs(composition.fatMassKg.high)}`}
        />
        <Stat
          label="FFMI"
          accent="#7C3AED"
          metric={ffmi}
          value={composition.ffmi.toFixed(1)}
          sub={ffmiLabel}
          // FFMI is a scalar with no numeric range; its category label is the
          // non-numeric stand-in when the mode is on.
          range={ffmiLabel}
        />
      </div>

      <div className="rounded-lg border border-[#2DA5A0]/20 bg-[#2DA5A0]/5 px-3 py-2 text-xs text-white/75 leading-relaxed">
        {composition.explanation} Confidence: {Math.round(composition.blendedConfidence * 100)}%.
      </div>

      <button
        type="button"
        onClick={() => setMethods((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[11px] text-white/60 hover:bg-white/[0.04] min-h-[36px]"
      >
        {methods ? 'Hide methods' : 'How this was calculated'}
        {methods ? <ChevronUp className="h-3 w-3" strokeWidth={1.5} /> : <ChevronDown className="h-3 w-3" strokeWidth={1.5} />}
      </button>

      {methods && (
        <ul className="text-[11px] text-white/65 space-y-1.5 leading-relaxed">
          <li>
            <span className="font-semibold text-white">Navy formula:</span>{' '}
            {composition.methods.navyFormula.available
              ? `${composition.methods.navyFormula.result!.toFixed(1)}%, from ${composition.methods.navyFormula.inputs}`
              : 'not available, needs valid neck + waist + (hip for female)'}
          </li>
          <li>
            <span className="font-semibold text-white">Arnold visual range:</span>{' '}
            {composition.methods.visualEstimate.available
              ? `${composition.methods.visualEstimate.low}% to ${composition.methods.visualEstimate.high}%`
              : 'not available, run a photo analysis first'}
          </li>
          <li>
            <span className="font-semibold text-white">CUN-BAE, BMI-based:</span>{' '}
            {composition.methods.bmiEstimate.available
              ? `${composition.methods.bmiEstimate.result!.toFixed(1)}%`
              : 'not available'}
          </li>
          <li>
            <span className="font-semibold text-white">Manual calibration:</span>{' '}
            {composition.methods.manualCalibration.available
              ? `${composition.methods.manualCalibration.result!.toFixed(1)}% from ${composition.methods.manualCalibration.source ?? 'manual'}`
              : 'no recent InBody, DEXA, or caliper entry'}
          </li>
        </ul>
      )}
    </div>
  );
}

// Resolves the per-metric display state from the optional controller. When no
// controller is provided every metric is in 'value' mode (numbers always shown).
interface ResolvedMetric {
  mode: 'value' | 'range' | 'sparkline' | 'hidden';
  revealable: boolean;
  numbersOptionalOn: boolean;
  onToggle: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}
function resolveMetric(numbers: NumbersOptionalController | undefined, metricId: string): ResolvedMetric {
  if (!numbers) {
    return { mode: 'value', revealable: false, numbersOptionalOn: false, onToggle: () => {}, onHoldStart: () => {}, onHoldEnd: () => {} };
  }
  return {
    mode: numbers.displayMode(metricId, 'composition'),
    revealable: numbers.numbersOptional && !numbers.isRevealed(metricId),
    numbersOptionalOn: numbers.numbersOptional,
    onToggle: () => numbers.toggleReveal(metricId),
    onHoldStart: () => numbers.revealHold(metricId),
    onHoldEnd: () => numbers.hideHold(metricId),
  };
}

function Stat({
  label,
  value,
  sub,
  accent,
  metric,
  range,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  metric: ResolvedMetric;
  range?: string;
}) {
  const showSub = metric.mode === 'value' && sub;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] text-white/50 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: metric.mode === 'value' ? accent : undefined }}>
        <RevealableMetric
          mode={metric.mode}
          label={label}
          revealable={metric.revealable}
          numbersOptionalOn={metric.numbersOptionalOn}
          onToggle={metric.onToggle}
          onHoldStart={metric.onHoldStart}
          onHoldEnd={metric.onHoldEnd}
          value={<span style={{ color: accent }}>{value}</span>}
          range={range ? <TrendRange direction="flat" range={range} /> : undefined}
        />
      </p>
      {showSub && <p className="text-[10px] text-white/50 mt-0.5">{sub}</p>}
    </div>
  );
}

function kgToLbs(kg: number): string {
  return `${(kg * 2.20462262).toFixed(1)} lbs`;
}
