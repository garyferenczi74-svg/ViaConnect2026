'use client';

// BodyScanCaqFreshnessCheck.tsx  (Prompt #169b, Task 17, spec section 10)
//
// A brief pre capture "Confirm your stats" gate. The Body Scan composition
// estimate is weight driven (CUNBAE / BMI body fat input + the lean / fat mass
// split), so a stale self reported weight/height silently corrupts the result.
// This gate is shown ONLY when the last known stat is stale (older than the
// section 10 threshold) or its age is unknown (first ever scan). When the stat is
// fresh it renders its children unchanged, so the normal flow is undisturbed.
//
// Composition (mounts AFTER the consent + age gates, BEFORE capture):
//
//   <BodyScanAgeGate>
//     <BodyScanConsentGate>
//       <BodyScanCaqFreshnessCheck sessionId={...}>
//         <RunScanButton ... />   // capture entry, with its own premium gate
//       </BodyScanCaqFreshnessCheck>
//     </BodyScanConsentGate>
//   </BodyScanAgeGate>
//
// On confirm/update the per scan value is pinned onto
// body_photo_sessions.weight_kg_at_scan / height_cm_at_scan (with the correct
// source: caq_phase_1 when unchanged, pre_scan_update when the user updated it),
// any change is logged to caq_demographics_updates, and the profile MASTER is
// updated only when the user opts in. runScanAnalysis then prefers the pinned per
// scan value over a stale profiles read (see runScanAnalysis confirmed-stat read).
//
// Unit handling reuses the project convention: the user's profiles.unit_system
// drives kg/lbs and cm vs feet+inches; conversions live in caq-freshness.ts.
// Lucide icons at strokeWidth 1.5; copy punctuation is commas/colons only (no
// dashes); responsive.

import { useEffect, useState, type ReactNode } from 'react';
import { Scale, Loader2, Check, Pencil } from 'lucide-react';
import { useCaqFreshness } from '@/hooks/body-tracker/useCaqFreshness';
import {
  selectFreshnessGateRender,
  weightKgToDisplay,
  heightCmToDisplay,
  displayWeightToKg,
  displayHeightToCm,
  type UnitSystem,
} from '@/lib/body-tracker/caq-freshness';

interface BodyScanCaqFreshnessCheckProps {
  sessionId: string;
  children: ReactNode;
  className?: string;
}

// Display unit labels for the stat fields.
function weightUnitLabel(unit: UnitSystem): string {
  return unit === 'metric' ? 'kg' : 'lbs';
}

// Format the stat date for the prompt copy: "May 12, 2026". Returns null when no
// dated stat exists (unknown age), so the copy adapts.
function formatStatDate(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Total inches -> { feet, inches } for the imperial height editor.
function inchesToFeetInches(totalInches: number): { feet: number; inches: number } {
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round((totalInches - feet * 12) * 10) / 10;
  return { feet, inches };
}

export function BodyScanCaqFreshnessCheck({ sessionId, children, className = '' }: BodyScanCaqFreshnessCheckProps) {
  const {
    isLoading,
    decision,
    weightKg,
    heightCm,
    statDateIso,
    unitSystem,
    confirmStats,
  } = useCaqFreshness();

  const render = selectFreshnessGateRender(isLoading, decision.needsConfirm);

  // Editor state. Seeded from the known values (in display units) once the
  // freshness data resolves. `editing` flips the confirm card into the inline
  // update form; `missing_stat` starts in edit mode because there is no value to
  // simply confirm.
  const [editing, setEditing] = useState(false);
  const [weightInput, setWeightInput] = useState<string>('');
  const [feetInput, setFeetInput] = useState<string>('');
  const [inchInput, setInchInput] = useState<string>('');
  const [cmInput, setCmInput] = useState<string>('');
  const [alsoUpdateProfile, setAlsoUpdateProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the editor fields from the known stats (in the user's unit system) when
  // the gate first needs a confirm. `missing_stat` opens directly in edit mode.
  useEffect(() => {
    if (render !== 'confirm') return;
    const wDisplay = weightKgToDisplay(weightKg, unitSystem);
    const hDisplay = heightCmToDisplay(heightCm, unitSystem); // kg/cm or lbs/total-in
    setWeightInput(wDisplay != null ? String(wDisplay) : '');
    if (unitSystem === 'metric') {
      setCmInput(hDisplay != null ? String(hDisplay) : '');
    } else if (hDisplay != null) {
      const { feet, inches } = inchesToFeetInches(hDisplay);
      setFeetInput(String(feet));
      setInchInput(String(inches));
    } else {
      setFeetInput('');
      setInchInput('');
    }
    if (decision.reason === 'missing_stat') setEditing(true);
    // Seed only when the gate transitions into the confirm state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render, decision.reason, weightKg, heightCm, unitSystem]);

  // ---- loading: hold the entry behind a small loader (no flash of children) ----
  if (render === 'loading') {
    return (
      <div className={`flex items-center justify-center py-6 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-white/50" strokeWidth={1.5} />
      </div>
    );
  }

  // ---- fresh / already confirmed: render the gated capture entry ----
  if (render === 'children') {
    return <div className={className}>{children}</div>;
  }

  // ---- confirm: stale / unknown / missing stat ----
  const statDateLabel = formatStatDate(statDateIso);
  const wUnit = weightUnitLabel(unitSystem);
  const knownWeightDisplay = weightKgToDisplay(weightKg, unitSystem);
  const knownHeightDisplay = heightCmToDisplay(heightCm, unitSystem);
  const knownHeightLabel =
    knownHeightDisplay == null
      ? null
      : unitSystem === 'metric'
        ? `${knownHeightDisplay} cm`
        : (() => {
            const { feet, inches } = inchesToFeetInches(knownHeightDisplay);
            return `${feet} ft ${inches} in`;
          })();

  // Resolve the editor inputs to canonical kg / cm. Returns null when an input is
  // blank or not a positive number (so we can disable submit on bad input).
  function resolveCanonical(): { weightKg: number; heightCm: number } | null {
    const w = Number(weightInput);
    if (!Number.isFinite(w) || w <= 0) return null;
    const canonicalWeightKg = displayWeightToKg(w, unitSystem);

    let canonicalHeightCm: number;
    if (unitSystem === 'metric') {
      const cm = Number(cmInput);
      if (!Number.isFinite(cm) || cm <= 0) return null;
      canonicalHeightCm = displayHeightToCm(cm, unitSystem);
    } else {
      const ft = Number(feetInput);
      const inch = inchInput === '' ? 0 : Number(inchInput);
      if (!Number.isFinite(ft) || ft <= 0 || !Number.isFinite(inch) || inch < 0) return null;
      const totalInches = ft * 12 + inch;
      canonicalHeightCm = displayHeightToCm(totalInches, unitSystem);
    }
    return { weightKg: canonicalWeightKg, heightCm: canonicalHeightCm };
  }

  // Confirm (no change): persist the EXISTING known values as the per scan stat.
  // Only available when both known values exist (not the missing_stat case).
  async function handleConfirmUnchanged() {
    if (weightKg == null || heightCm == null) return;
    setSubmitting(true);
    setError(null);
    const ok = await confirmStats({
      sessionId,
      weightKg,
      heightCm,
      updateMaster: false, // confirming the existing value never rewrites master
    });
    setSubmitting(false);
    if (!ok) setError('We could not save your stats. Please try again.');
    // On success the hook flips decision.needsConfirm to false, re-rendering this
    // gate with its children (the capture entry).
  }

  // Save (updated): persist the edited values; provenance is resolved per field.
  async function handleSaveUpdated() {
    const canonical = resolveCanonical();
    if (!canonical) {
      setError('Enter a valid weight and height to continue.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const ok = await confirmStats({
      sessionId,
      weightKg: canonical.weightKg,
      heightCm: canonical.heightCm,
      updateMaster: alsoUpdateProfile,
    });
    setSubmitting(false);
    if (!ok) setError('We could not save your stats. Please try again.');
  }

  const canSave = resolveCanonical() !== null;

  return (
    <section
      data-testid="body-scan-caq-freshness-check"
      data-freshness-reason={decision.reason}
      className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/50 p-6 sm:p-7 space-y-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#E8803A]/15">
          <Scale className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-white">Confirm your stats</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/70">
            Your scan uses your weight and height to estimate body composition, so an out of date
            number can throw off the result. Take a second to check these before we begin.
          </p>
        </div>
      </div>

      {/* Known value summary + the "has this changed" prompt, shown when we have
          a value to confirm. The missing_stat case skips straight to the editor. */}
      {!editing && weightKg != null && heightCm != null && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
            <p className="text-sm text-white/80">
              {statDateLabel
                ? <>We have your weight from {statDateLabel} as <span className="font-semibold text-white">{knownWeightDisplay} {wUnit}</span>.</>
                : <>We have your weight on file as <span className="font-semibold text-white">{knownWeightDisplay} {wUnit}</span>.</>}
            </p>
            {knownHeightLabel && (
              <p className="text-sm text-white/80">
                Height: <span className="font-semibold text-white">{knownHeightLabel}</span>.
              </p>
            )}
            <p className="text-sm text-white/60">Has this changed?</p>
          </div>

          {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleConfirmUnchanged}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-5 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Check className="h-4 w-4" strokeWidth={1.5} />}
              No, these are current
            </button>
            <button
              type="button"
              onClick={() => { setEditing(true); setError(null); }}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/[0.06] min-h-[44px] disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" strokeWidth={1.5} />
              Yes, update them
            </button>
          </div>
        </div>
      )}

      {/* Inline update form: shown when the user chose to update, or when there
          is no stat on file at all (missing_stat). */}
      {(editing || weightKg == null || heightCm == null) && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weight */}
            <div className="space-y-1">
              <label htmlFor="caq-weight" className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Weight ({wUnit})
              </label>
              <input
                id="caq-weight"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] px-3 py-2 text-base text-white placeholder-white/30 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                placeholder={wUnit === 'kg' ? 'e.g. 75' : 'e.g. 165'}
              />
            </div>

            {/* Height */}
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Height ({unitSystem === 'metric' ? 'cm' : 'ft, in'})
              </span>
              {unitSystem === 'metric' ? (
                <input
                  aria-label="Height in centimeters"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  value={cmInput}
                  onChange={(e) => setCmInput(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] px-3 py-2 text-base text-white placeholder-white/30 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                  placeholder="e.g. 178"
                />
              ) : (
                <div className="flex gap-2">
                  <input
                    aria-label="Height feet"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="1"
                    value={feetInput}
                    onChange={(e) => setFeetInput(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] px-3 py-2 text-base text-white placeholder-white/30 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                    placeholder="ft"
                  />
                  <input
                    aria-label="Height inches"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.5"
                    value={inchInput}
                    onChange={(e) => setInchInput(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] px-3 py-2 text-base text-white placeholder-white/30 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                    placeholder="in"
                  />
                </div>
              )}
            </div>
          </div>

          {/* "Also update my profile" opt in (default OFF): without it the change
              is a per scan input only and the CAQ / profile master is undisturbed. */}
          <label className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 flex-none accent-[#2DA5A0]"
              checked={alsoUpdateProfile}
              onChange={(e) => setAlsoUpdateProfile(e.target.checked)}
            />
            <span className="text-sm text-white/75">
              Also update my profile, otherwise this is used for this scan only.
            </span>
          </label>

          {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleSaveUpdated}
              disabled={submitting || !canSave}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-5 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Check className="h-4 w-4" strokeWidth={1.5} />}
              Save and continue
            </button>
            {/* Allow backing out to the confirm choice, but only when there was a
                value to confirm (missing_stat has nothing to go back to). */}
            {weightKg != null && heightCm != null && (
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null); }}
                disabled={submitting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/[0.06] min-h-[44px] disabled:opacity-50"
              >
                Back
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
