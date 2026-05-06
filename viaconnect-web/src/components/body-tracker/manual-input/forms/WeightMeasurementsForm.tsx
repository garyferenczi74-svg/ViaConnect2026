'use client';

import { useMemo, useState } from 'react';
import {
  InlineEntryPanel,
  DataSourceSelector,
  DatePickerWithDefaults,
  todayIso,
  NumberField,
  ScanPhotoUpload,
  FormTip,
  FormActions,
  submitEntry,
  useCurrentUser,
  UnitToggle,
  validateField,
} from '..';
import {
  calculateWHR,
  getDataSource,
  type DataSourceId,
  type TimeOfDay,
  type UnitSystem,
} from '@/lib/body-tracker/manual-input';

interface WeightMeasurementsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

interface FormState {
  date: string;
  sourceId: DataSourceId | null;
  weightUnit: UnitSystem;
  lengthUnit: UnitSystem;
  weight: number | null;
  goalWeight: number | null;
  timeOfDay: TimeOfDay;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  neck: number | null;
  rightArm: number | null;
  leftArm: number | null;
  rightThigh: number | null;
  leftThigh: number | null;
  rightCalf: number | null;
  leftCalf: number | null;
  scanPhotoUrl: string | null;
  notes: string;
}

function initialState(preferredUnit: UnitSystem = 'imperial'): FormState {
  return {
    date: todayIso(),
    sourceId: null,
    weightUnit: preferredUnit,
    lengthUnit: preferredUnit,
    weight: null,
    goalWeight: null,
    timeOfDay: 'morning_fasted',
    waist: null, hips: null, chest: null, neck: null,
    rightArm: null, leftArm: null, rightThigh: null, leftThigh: null,
    rightCalf: null, leftCalf: null,
    scanPhotoUrl: null,
    notes: '',
  };
}

function toStoredLbs(value: number | null, unit: UnitSystem): number | null {
  if (value === null) return null;
  return unit === 'metric' ? Math.round(value * 2.20462262 * 100) / 100 : value;
}

function toStoredIn(value: number | null, unit: UnitSystem): number | null {
  if (value === null) return null;
  return unit === 'metric' ? Math.round(value * 0.393700787 * 100) / 100 : value;
}

const TIME_OF_DAY_OPTIONS: Array<{ id: TimeOfDay; label: string }> = [
  { id: 'morning_fasted', label: 'Morning (fasted)' },
  { id: 'afternoon',      label: 'Afternoon' },
  { id: 'evening',        label: 'Evening' },
  { id: 'unknown',        label: 'Not sure' },
];

export function WeightMeasurementsForm({ open, onOpenChange, onSaved }: WeightMeasurementsFormProps) {
  const { id: userId, unitSystem } = useCurrentUser();
  const [state, setState] = useState<FormState>(() => initialState(unitSystem));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const whr = useMemo(() => {
    if (state.waist === null || state.hips === null) return null;
    const waistIn = state.lengthUnit === 'metric' ? state.waist * 0.393700787 : state.waist;
    const hipIn   = state.lengthUnit === 'metric' ? state.hips  * 0.393700787 : state.hips;
    return calculateWHR(waistIn, hipIn);
  }, [state.waist, state.hips, state.lengthUnit]);

  const canSave = useMemo(() => {
    if (!state.sourceId || !userId) return false;
    if (state.weight === null) return false;
    const weightLbs = toStoredLbs(state.weight, state.weightUnit);
    if (weightLbs !== null) {
      const res = validateField(state.weightUnit === 'metric' ? 'weight_kg' : 'weight_lbs', state.weight);
      if (res === 'blocked') return false;
    }
    return true;
  }, [state, userId]);

  function patch(p: Partial<FormState>) {
    setState((s) => ({ ...s, ...p }));
  }

  function reset() {
    setState(initialState(unitSystem));
    setError(null);
  }

  async function handleSave() {
    if (!userId || !state.sourceId || state.weight === null) return;
    setSaving(true);
    setError(null);
    try {
      const source = getDataSource(state.sourceId)!;
      await submitEntry({
        userId,
        entryDate: state.date,
        manualSourceId: source.id,
        scanPhotoUrl: state.scanPhotoUrl,
        notes: state.notes || null,
        timeOfDay: state.timeOfDay,
        details: [
          {
            table: 'body_tracker_weight',
            row: {
              weight_lbs:      toStoredLbs(state.weight, state.weightUnit),
              goal_weight_lbs: toStoredLbs(state.goalWeight, state.weightUnit),
              waist_in:       toStoredIn(state.waist, state.lengthUnit),
              hips_in:        toStoredIn(state.hips, state.lengthUnit),
              chest_in:       toStoredIn(state.chest, state.lengthUnit),
              neck_in:        toStoredIn(state.neck, state.lengthUnit),
              right_arm_in:   toStoredIn(state.rightArm, state.lengthUnit),
              left_arm_in:    toStoredIn(state.leftArm, state.lengthUnit),
              right_thigh_in: toStoredIn(state.rightThigh, state.lengthUnit),
              left_thigh_in:  toStoredIn(state.leftThigh, state.lengthUnit),
              right_calf_in:  toStoredIn(state.rightCalf, state.lengthUnit),
              left_calf_in:   toStoredIn(state.leftCalf, state.lengthUnit),
            },
          },
        ],
      });
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const wUnit = state.weightUnit === 'metric' ? 'kg' : 'lbs';
  const lUnit = state.lengthUnit === 'metric' ? 'cm' : 'in';

  return (
    <InlineEntryPanel
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
      title="Log weight and measurements"
      description="Weight plus optional body circumferences"
      footer={
        <div className="space-y-2">
          {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
          <FormActions
            onCancel={() => { reset(); onOpenChange(false); }}
            onSave={handleSave}
            saving={saving}
            disabled={!canSave}
          />
        </div>
      }
    >
      <div className="space-y-5">
        <DatePickerWithDefaults value={state.date} onChange={(v) => patch({ date: v })} />
        <DataSourceSelector value={state.sourceId} onChange={(id) => patch({ sourceId: id })} />

        {state.sourceId && (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Weight</h3>
                <UnitToggle value={state.weightUnit} onChange={(u) => patch({ weightUnit: u })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField
                  label="Weight"
                  value={state.weight}
                  onChange={(v) => patch({ weight: v })}
                  unit={wUnit}
                  sanityField={state.weightUnit === 'metric' ? 'weight_kg' : 'weight_lbs'}
                  required
                />
                <NumberField
                  label="Goal weight (optional)"
                  value={state.goalWeight}
                  onChange={(v) => patch({ goalWeight: v })}
                  unit={wUnit}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
                  Time of day
                </p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Time of day">
                  {TIME_OF_DAY_OPTIONS.map((opt) => {
                    const selected = state.timeOfDay === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => patch({ timeOfDay: opt.id })}
                        className={`rounded-lg border px-3 py-2 text-xs min-h-[40px] transition-colors ${
                          selected
                            ? 'border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                            : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Body circumferences (optional)
                </h3>
                <UnitToggle
                  value={state.lengthUnit}
                  onChange={(u) => patch({ lengthUnit: u })}
                  labelImperial="in"
                  labelMetric="cm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <NumberField label="Waist" value={state.waist} onChange={(v) => patch({ waist: v })} unit={lUnit} hint="At navel" compact />
                <NumberField label="Hips" value={state.hips} onChange={(v) => patch({ hips: v })} unit={lUnit} hint="Widest point" compact />
                <NumberField label="Chest" value={state.chest} onChange={(v) => patch({ chest: v })} unit={lUnit} compact />
                <NumberField label="Neck" value={state.neck} onChange={(v) => patch({ neck: v })} unit={lUnit} compact />
                <NumberField label="Right bicep" value={state.rightArm} onChange={(v) => patch({ rightArm: v })} unit={lUnit} compact />
                <NumberField label="Left bicep" value={state.leftArm} onChange={(v) => patch({ leftArm: v })} unit={lUnit} compact />
                <NumberField label="Right thigh" value={state.rightThigh} onChange={(v) => patch({ rightThigh: v })} unit={lUnit} compact />
                <NumberField label="Left thigh" value={state.leftThigh} onChange={(v) => patch({ leftThigh: v })} unit={lUnit} compact />
                <NumberField label="Right calf" value={state.rightCalf} onChange={(v) => patch({ rightCalf: v })} unit={lUnit} compact />
                <NumberField label="Left calf" value={state.leftCalf} onChange={(v) => patch({ leftCalf: v })} unit={lUnit} compact />
              </div>
              {whr && state.waist !== null && state.hips !== null && (
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-white/55">Waist to hip ratio</p>
                    <p className="text-sm font-semibold text-white">{whr.ratio.toFixed(2)}</p>
                  </div>
                  <span
                    className="rounded-full px-2 py-1 text-[11px] font-medium"
                    style={{ backgroundColor: `${whr.color}1F`, color: whr.color, border: `1px solid ${whr.color}4D` }}
                  >
                    {whr.risk}
                  </span>
                </div>
              )}
            </section>

            <ScanPhotoUpload
              userId={userId}
              category="progress_photo"
              value={state.scanPhotoUrl}
              onChange={(p) => patch({ scanPhotoUrl: p })}
              label="Progress photo (optional)"
            />

            <div className="space-y-1">
              <label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Notes
              </label>
              <textarea
                id="notes"
                rows={2}
                value={state.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] px-3 py-2 text-base text-white placeholder-white/30 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                placeholder="Anything to remember about this reading"
              />
            </div>

            <FormTip>
              Weigh yourself at the same time each day, ideally morning fasted, for the most consistent trend tracking.
            </FormTip>
          </>
        )}
      </div>
    </InlineEntryPanel>
  );
}
