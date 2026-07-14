'use client';

/**
 * src/components/formavision/DexaAnchorImport.tsx
 *
 * Task 211b-W3d - the DEXA / clinic import form (consumer, consent-gated).
 *
 * HONESTY (the point of this component):
 *   - Every stored value is exactly what the user typed from their own
 *     report. No file parsing, no OCR, no auto-fill; a structured form is the
 *     entire surface, per the task contract.
 *   - The reliability shown ("high") mirrors DEFAULT_SOURCE_RELIABILITY for
 *     the 'dexa' source in fusion/anchorTypes.ts (W3a-approved); this
 *     component never claims a numeric accuracy or precision figure.
 *   - user_measurement_anchors (the underlying table) has columns for a
 *     region circumference (value_cm) or a session weight (weight_kg) only;
 *     it has no body-fat-percentage column. This form intentionally does NOT
 *     collect a body-fat percentage field, so it never asks for a number it
 *     cannot actually persist (collecting data implying it is saved when it
 *     is not would itself be dishonest).
 *   - Region taxonomy + labels are duplicated locally (same rationale as
 *     TapeAnchorEntry.tsx), not imported from PersonalPrecisionPanel.tsx.
 *
 * Consumer own-row + consent ('dexa_anchor') via anchorEntryDb.ts's fail-open
 * write path. A save is one-time per session: the user checks the regions
 * (and/or weight) their report includes, enters the values, and saves once.
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes, tokens
 *   only (Teal #2DA5A0 / Navy #1A2744 / Orange #B75E18), desktop + mobile
 *   responsive, 44px min touch targets, text-base inputs (no iOS zoom).
 */

import { useState } from 'react';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Region } from '@/lib/arnold/scanning/types';
import {
  writeDexaRegionAnchorFailOpen,
  writeDexaWeightAnchorFailOpen,
  type LengthUnit,
  type WeightUnit,
} from '@/lib/formavision/anchors/anchorEntryDb';

const DEXA_REGIONS: readonly Region[] = [
  'neck', 'shoulder', 'chest', 'under_bust',
  'waist_natural', 'waist_navel', 'hip',
  'bicep', 'forearm', 'thigh', 'calf',
];

export const DEXA_REGION_LABEL: Readonly<Record<Region, string>> = {
  neck: 'Neck',
  shoulder: 'Shoulders',
  chest: 'Chest',
  under_bust: 'Under bust',
  waist_natural: 'Waist, natural',
  waist_navel: 'Waist, navel',
  hip: 'Hips',
  bicep: 'Bicep',
  forearm: 'Forearm',
  thigh: 'Thigh',
  calf: 'Calf',
};

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Pure: a positive finite number, or null for anything blank/invalid. Never
 *  substitutes a default; an invalid entry is simply excluded from the save. */
export function parsePositiveValue(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

// ---------------------------------------------------------------------------
// Pure state + helpers
// ---------------------------------------------------------------------------

export interface DexaRegionEntryState {
  region: Region;
  included: boolean;
  valueText: string;
}

export function buildInitialDexaRegionState(): DexaRegionEntryState[] {
  return DEXA_REGIONS.map((region) => ({ region, included: false, valueText: '' }));
}

/** Pure: true when at least one included region has a valid value, or the
 *  weight field has a valid value -- i.e. there is something real to save. */
export function hasAnyValidDexaEntry(
  regions: DexaRegionEntryState[],
  weightText: string,
): boolean {
  const anyRegion = regions.some((r) => r.included && parsePositiveValue(r.valueText) !== null);
  const anyWeight = parsePositiveValue(weightText) !== null;
  return anyRegion || anyWeight;
}

// ---------------------------------------------------------------------------
// Pure content renderer (exported for renderToStaticMarkup tests, no hooks).
// ---------------------------------------------------------------------------

export interface DexaAnchorImportContentProps {
  regions: DexaRegionEntryState[];
  unit: LengthUnit;
  weightText: string;
  weightUnit: WeightUnit;
  dateText: string;
  saving: boolean;
  error: string | null;
  savedCount: number;
  onRegionToggle: (region: Region, included: boolean) => void;
  onRegionValueChange: (region: Region, value: string) => void;
  onUnitChange: (unit: LengthUnit) => void;
  onWeightChange: (value: string) => void;
  onWeightUnitChange: (unit: WeightUnit) => void;
  onDateChange: (value: string) => void;
  onSubmit: () => void;
}

export function DexaAnchorImportContent({
  regions,
  unit,
  weightText,
  weightUnit,
  dateText,
  saving,
  error,
  savedCount,
  onRegionToggle,
  onRegionValueChange,
  onUnitChange,
  onWeightChange,
  onWeightUnitChange,
  onDateChange,
  onSubmit,
}: DexaAnchorImportContentProps) {
  const canSubmit = hasAnyValidDexaEntry(regions, weightText) && !saving;

  return (
    <div data-testid="dexa-anchor-import" className="w-full space-y-3">
      <p className="text-xs leading-relaxed text-white/60">
        Enter values directly from your DEXA or BodPod report. This is a one-time reference
        reading recorded at high reliability. We do not read or import files, you type the
        numbers yourself.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/70">Circumference unit</span>
        <div
          role="radiogroup"
          aria-label="Circumference unit"
          data-testid="dexa-unit-toggle"
          className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 text-xs"
        >
          <button
            type="button"
            role="radio"
            aria-checked={unit === 'in'}
            data-testid="dexa-unit-in"
            onClick={() => onUnitChange('in')}
            className={`min-h-[44px] rounded-md px-3 font-medium transition-colors ${
              unit === 'in' ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]' : 'text-white/60 hover:text-white'
            }`}
          >
            in
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={unit === 'cm'}
            data-testid="dexa-unit-cm"
            onClick={() => onUnitChange('cm')}
            className={`min-h-[44px] rounded-md px-3 font-medium transition-colors ${
              unit === 'cm' ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]' : 'text-white/60 hover:text-white'
            }`}
          >
            cm
          </button>
        </div>
      </div>

      <ul data-testid="dexa-region-list" className="space-y-2">
        {regions.map((r) => (
          <li key={r.region} className="flex items-center gap-2">
            <label className="flex min-h-[44px] flex-1 items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                data-testid={`dexa-region-check-${r.region}`}
                checked={r.included}
                onChange={(e) => onRegionToggle(r.region, e.target.checked)}
                className="h-5 w-5 flex-none accent-[#2DA5A0]"
              />
              {DEXA_REGION_LABEL[r.region]}
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              disabled={!r.included}
              value={r.valueText}
              data-testid={`dexa-region-value-${r.region}`}
              onChange={(e) => onRegionValueChange(r.region, e.target.value)}
              className="min-h-[44px] w-24 shrink-0 rounded-xl border border-white/20 bg-white/[0.04] px-2 text-base text-white disabled:opacity-40 sm:w-28"
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-3 sm:flex-row sm:items-end">
        <div className="flex-1 flex flex-col gap-1.5">
          <label htmlFor="dexa-weight-input" className="text-xs font-medium text-white/70">
            Body weight (optional)
          </label>
          <input
            id="dexa-weight-input"
            data-testid="dexa-weight-input"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={weightText}
            onChange={(e) => onWeightChange(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-white/20 bg-white/[0.04] px-3 text-base text-white"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span id="dexa-weight-unit-label" className="text-xs font-medium text-white/70">
            Unit
          </span>
          <div
            role="radiogroup"
            aria-labelledby="dexa-weight-unit-label"
            data-testid="dexa-weight-unit-toggle"
            className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 text-xs"
          >
            <button
              type="button"
              role="radio"
              aria-checked={weightUnit === 'lbs'}
              data-testid="dexa-weight-unit-lbs"
              onClick={() => onWeightUnitChange('lbs')}
              className={`min-h-[44px] rounded-md px-3 font-medium transition-colors ${
                weightUnit === 'lbs' ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]' : 'text-white/60 hover:text-white'
              }`}
            >
              lbs
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={weightUnit === 'kg'}
              data-testid="dexa-weight-unit-kg"
              onClick={() => onWeightUnitChange('kg')}
              className={`min-h-[44px] rounded-md px-3 font-medium transition-colors ${
                weightUnit === 'kg' ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]' : 'text-white/60 hover:text-white'
              }`}
            >
              kg
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dexa-date-input" className="text-xs font-medium text-white/70">
          Report date
        </label>
        <input
          id="dexa-date-input"
          data-testid="dexa-date-input"
          type="date"
          value={dateText}
          onChange={(e) => onDateChange(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-white/20 bg-white/[0.04] px-3 text-base text-white sm:w-auto"
        />
      </div>

      <button
        type="button"
        data-testid="dexa-anchor-submit"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 px-4 py-2.5 text-sm font-medium text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/25 disabled:opacity-50 sm:w-auto"
      >
        {saving ? 'Saving' : 'Save report values'}
      </button>

      {error && (
        <p data-testid="dexa-anchor-error" role="alert" className="text-xs text-[#FCA5A5]">
          {error}
        </p>
      )}

      {savedCount > 0 && (
        <p data-testid="dexa-anchor-saved-note" className="flex items-center gap-1.5 text-xs text-white/70">
          <Check size={12} strokeWidth={1.5} className="text-[#2DA5A0]" aria-hidden="true" />
          Saved {savedCount} {savedCount === 1 ? 'value' : 'values'} from your report.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client wrapper (surface mount point). Own-row write via anchorEntryDb.ts.
// ---------------------------------------------------------------------------

export interface DexaAnchorImportProps {
  /** Null (auth not yet resolved / signed out) disables submission with an
   *  honest message rather than silently no-op-ing. */
  userId: string | null;
}

export function DexaAnchorImport({ userId }: DexaAnchorImportProps) {
  const [regions, setRegions] = useState<DexaRegionEntryState[]>(() => buildInitialDexaRegionState());
  const [unit, setUnit] = useState<LengthUnit>('in');
  const [weightText, setWeightText] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs');
  const [dateText, setDateText] = useState<string>(() => todayDateInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const handleRegionToggle = (region: Region, included: boolean) => {
    setRegions((prev) => prev.map((r) => (r.region === region ? { ...r, included } : r)));
  };

  const handleRegionValueChange = (region: Region, value: string) => {
    setRegions((prev) => prev.map((r) => (r.region === region ? { ...r, valueText: value } : r)));
  };

  const handleSubmit = async () => {
    if (!userId) {
      setError('Sign in to save your report values.');
      return;
    }
    if (!hasAnyValidDexaEntry(regions, weightText)) {
      setError('Enter at least one measurement or your weight from the report.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const takenAt = new Date(`${dateText}T12:00:00.000Z`).toISOString();
      let successCount = 0;
      let anyAttempted = false;
      let anyFailed = false;

      for (const r of regions) {
        if (!r.included) continue;
        const parsedValue = parsePositiveValue(r.valueText);
        if (parsedValue === null) continue;
        anyAttempted = true;
        const ok = await writeDexaRegionAnchorFailOpen(supabase, {
          userId,
          region: r.region,
          value: parsedValue,
          unit,
          takenAt,
        });
        if (ok) successCount += 1;
        else anyFailed = true;
      }

      const parsedWeight = parsePositiveValue(weightText);
      if (parsedWeight !== null) {
        anyAttempted = true;
        const ok = await writeDexaWeightAnchorFailOpen(supabase, {
          userId,
          value: parsedWeight,
          unit: weightUnit,
          takenAt,
        });
        if (ok) successCount += 1;
        else anyFailed = true;
      }

      if (successCount > 0) {
        setSavedCount((prev) => prev + successCount);
        setRegions(buildInitialDexaRegionState());
        setWeightText('');
      }
      if (anyFailed || !anyAttempted) {
        setError(
          anyFailed
            ? 'Some values could not be saved. Please try again.'
            : 'Enter at least one measurement or your weight from the report.',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DexaAnchorImportContent
      regions={regions}
      unit={unit}
      weightText={weightText}
      weightUnit={weightUnit}
      dateText={dateText}
      saving={saving}
      error={error}
      savedCount={savedCount}
      onRegionToggle={handleRegionToggle}
      onRegionValueChange={handleRegionValueChange}
      onUnitChange={setUnit}
      onWeightChange={setWeightText}
      onWeightUnitChange={setWeightUnit}
      onDateChange={setDateText}
      onSubmit={() => void handleSubmit()}
    />
  );
}
