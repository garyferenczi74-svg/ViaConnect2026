'use client';

/**
 * src/components/formavision/TapeAnchorEntry.tsx
 *
 * Task 211b-W3d - the tape guided-entry flow (consumer, consent-gated).
 *
 * HONESTY (the point of this component):
 *   - The stored value is exactly the number the user typed for the region
 *     they chose, converted from their chosen unit only. Nothing here is
 *     auto-filled, pre-populated, or derived from a scan.
 *   - The reliability shown ("medium") mirrors DEFAULT_SOURCE_RELIABILITY for
 *     the 'tape' source in fusion/anchorTypes.ts (W3a-approved); this
 *     component never claims a numeric accuracy or precision figure.
 *   - Region taxonomy + labels are duplicated locally rather than imported
 *     from PersonalPrecisionPanel.tsx, matching the repo's established
 *     convention of small per-file duplicated region taxonomies (see
 *     anchorIngestion.ts's own VALID_REGIONS comment), so this entry surface
 *     has no import-graph coupling to the W3c display-only component.
 *
 * Consumer own-row + consent ('tape_anchor') via anchorEntryDb.ts's fail-open
 * write path. A write failure shows an honest retry message; it never claims
 * a false success.
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
  writeTapeAnchorFailOpen,
  toStoredCm,
  type LengthUnit,
} from '@/lib/formavision/anchors/anchorEntryDb';

const TAPE_REGIONS: readonly Region[] = [
  'neck', 'shoulder', 'chest', 'under_bust',
  'waist_natural', 'waist_navel', 'hip',
  'bicep', 'forearm', 'thigh', 'calf',
];

export const TAPE_REGION_LABEL: Readonly<Record<Region, string>> = {
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

const TAPE_REGION_HOWTO: Readonly<Record<Region, string>> = {
  neck: 'Wrap the tape around the middle of your neck, just below the larynx. Keep it level and snug, not tight.',
  shoulder: 'Measure across your back from the tip of one shoulder to the tip of the other, following the natural curve.',
  chest: 'Wrap the tape around your chest at nipple level, level front and back. Breathe normally while measuring.',
  under_bust: 'Wrap the tape directly under your chest, where it naturally rests. Keep the tape level all the way around.',
  waist_natural: 'Wrap the tape around your natural waist, the narrowest point above your belly button. Do not suck in.',
  waist_navel: 'Wrap the tape around your waist at the level of your belly button.',
  hip: 'Wrap the tape around the widest part of your hips and glutes, keeping it level all the way around.',
  bicep: 'Wrap the tape around the widest part of your upper arm, with your arm relaxed at your side.',
  forearm: 'Wrap the tape around the widest part of your forearm, just below the elbow.',
  thigh: 'Wrap the tape around the widest part of your thigh, just below your glutes.',
  calf: 'Wrap the tape around the widest part of your calf, standing with your weight evenly distributed.',
};

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Pure: a positive finite number, or null for anything blank/invalid. Never
 *  substitutes a default; an invalid entry blocks submission instead. */
export function parsePositiveValue(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Pure: an ISO takenAt timestamp for a YYYY-MM-DD date input, or null when
 *  the date is empty or unparseable. Never throws; a cleared/invalid date
 *  blocks submission instead of raising an unhandled RangeError. */
export function parseDateInputToTakenAt(dateText: string): string | null {
  const trimmed = dateText.trim();
  if (trimmed === '') return null;
  const d = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Pure content renderer (exported for renderToStaticMarkup tests, no hooks).
// ---------------------------------------------------------------------------

export interface SavedTapeAnchor {
  region: Region;
  valueCm: number;
}

export interface TapeAnchorEntryContentProps {
  region: Region;
  unit: LengthUnit;
  valueText: string;
  dateText: string;
  saving: boolean;
  error: string | null;
  savedAnchors: SavedTapeAnchor[];
  onRegionChange: (region: Region) => void;
  onUnitChange: (unit: LengthUnit) => void;
  onValueChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSubmit: () => void;
}

export function TapeAnchorEntryContent({
  region,
  unit,
  valueText,
  dateText,
  saving,
  error,
  savedAnchors,
  onRegionChange,
  onUnitChange,
  onValueChange,
  onDateChange,
  onSubmit,
}: TapeAnchorEntryContentProps) {
  const parsed = parsePositiveValue(valueText);
  const canSubmit = parsed !== null && !saving;

  return (
    <div data-testid="tape-anchor-entry" className="w-full space-y-3">
      <p className="text-xs leading-relaxed text-white/60">
        Add your own tape measurement, one region at a time. This is your own reading, recorded at
        medium reliability. It never changes or replaces your scan result.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tape-region-select" className="text-xs font-medium text-white/70">
          Region
        </label>
        <select
          id="tape-region-select"
          data-testid="tape-region-select"
          value={region}
          onChange={(e) => onRegionChange(e.target.value as Region)}
          className="min-h-[44px] w-full rounded-xl border border-white/20 bg-white/[0.04] px-3 text-base text-white sm:w-auto"
        >
          {TAPE_REGIONS.map((r) => (
            <option key={r} value={r}>
              {TAPE_REGION_LABEL[r]}
            </option>
          ))}
        </select>
      </div>

      <p data-testid="tape-region-howto" className="text-xs leading-relaxed text-white/50">
        {TAPE_REGION_HOWTO[region]}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 flex flex-col gap-1.5">
          <label htmlFor="tape-value-input" className="text-xs font-medium text-white/70">
            Measurement
          </label>
          <input
            id="tape-value-input"
            data-testid="tape-value-input"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={valueText}
            onChange={(e) => onValueChange(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-white/20 bg-white/[0.04] px-3 text-base text-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span id="tape-unit-toggle-label" className="text-xs font-medium text-white/70">
            Unit
          </span>
          <div
            role="radiogroup"
            aria-labelledby="tape-unit-toggle-label"
            data-testid="tape-unit-toggle"
            className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 text-xs"
          >
            <button
              type="button"
              role="radio"
              aria-checked={unit === 'in'}
              data-testid="tape-unit-in"
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
              data-testid="tape-unit-cm"
              onClick={() => onUnitChange('cm')}
              className={`min-h-[44px] rounded-md px-3 font-medium transition-colors ${
                unit === 'cm' ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]' : 'text-white/60 hover:text-white'
              }`}
            >
              cm
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tape-date-input" className="text-xs font-medium text-white/70">
          Date taken
        </label>
        <input
          id="tape-date-input"
          data-testid="tape-date-input"
          type="date"
          value={dateText}
          onChange={(e) => onDateChange(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-white/20 bg-white/[0.04] px-3 text-base text-white sm:w-auto"
        />
      </div>

      <button
        type="button"
        data-testid="tape-anchor-submit"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 px-4 py-2.5 text-sm font-medium text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/25 disabled:opacity-50 sm:w-auto"
      >
        {saving ? 'Saving' : 'Save measurement'}
      </button>

      {error && (
        <p data-testid="tape-anchor-error" role="alert" className="text-xs text-[#FCA5A5]">
          {error}
        </p>
      )}

      {savedAnchors.length > 0 && (
        <ul data-testid="tape-anchor-saved-list" className="space-y-1 border-t border-white/[0.08] pt-3">
          {savedAnchors.map((a, i) => (
            <li key={`${a.region}-${i}`} className="flex items-center gap-1.5 text-xs text-white/70">
              <Check size={12} strokeWidth={1.5} className="text-[#2DA5A0]" aria-hidden="true" />
              {TAPE_REGION_LABEL[a.region]} recorded
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client wrapper (surface mount point). Own-row write via anchorEntryDb.ts.
// ---------------------------------------------------------------------------

export interface TapeAnchorEntryProps {
  /** Null (auth not yet resolved / signed out) disables submission with an
   *  honest message rather than silently no-op-ing. */
  userId: string | null;
}

export function TapeAnchorEntry({ userId }: TapeAnchorEntryProps) {
  const [region, setRegion] = useState<Region>('waist_natural');
  const [unit, setUnit] = useState<LengthUnit>('in');
  const [valueText, setValueText] = useState('');
  const [dateText, setDateText] = useState<string>(() => todayDateInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAnchors, setSavedAnchors] = useState<SavedTapeAnchor[]>([]);

  const handleSubmit = async () => {
    if (!userId) {
      setError('Sign in to save a measurement.');
      return;
    }
    const parsed = parsePositiveValue(valueText);
    if (parsed === null) {
      setError('Enter a measurement greater than zero.');
      return;
    }
    const takenAt = parseDateInputToTakenAt(dateText);
    if (takenAt === null) {
      setError('Enter a valid date.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const ok = await writeTapeAnchorFailOpen(supabase, {
        userId,
        region,
        value: parsed,
        unit,
        takenAt,
      });
      if (ok) {
        setSavedAnchors((prev) => [...prev, { region, valueCm: toStoredCm(parsed, unit) }]);
        setValueText('');
      } else {
        setError('Could not save that just now. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <TapeAnchorEntryContent
      region={region}
      unit={unit}
      valueText={valueText}
      dateText={dateText}
      saving={saving}
      error={error}
      savedAnchors={savedAnchors}
      onRegionChange={setRegion}
      onUnitChange={setUnit}
      onValueChange={setValueText}
      onDateChange={setDateText}
      onSubmit={() => void handleSubmit()}
    />
  );
}
