'use client';

import { Lightbulb, Loader2, Copy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { UnitToggle } from './UnitToggle';
import {
  BODY_REGIONS,
  MEASUREMENT_LABELS,
  convertAllMeasurements,
  emptyMeasurements,
  type CircumferenceMeasurements,
  type MeasurementKey,
  type MeasurementUnit,
  SYMMETRY_PAIRS,
} from '@/lib/body-tracker/circumference';

export interface CircumferenceFormState {
  unit: MeasurementUnit;
  values: CircumferenceMeasurements;
}

interface BaseProps {
  preferredUnit?: MeasurementUnit;
  existingData?: CircumferenceFormState;
}

interface StandaloneProps extends BaseProps {
  mode?: 'standalone';
  onSave: (data: CircumferenceFormState) => Promise<void> | void;
  onCancel: () => void;
}

interface ControlledProps extends BaseProps {
  mode: 'controlled';
  value: CircumferenceFormState;
  onChange: (next: CircumferenceFormState) => void;
}

type CircumferenceEntryFormProps = StandaloneProps | ControlledProps;

const COPY_PAIRS: Record<MeasurementKey, MeasurementKey | undefined> = {
  neck: undefined,
  shoulderWidth: undefined,
  rightUpperArm: undefined,
  rightForearm: undefined,
  leftUpperArm: 'rightUpperArm',
  leftForearm: 'rightForearm',
  chest: undefined,
  waist: undefined,
  hip: undefined,
  rightUpperThigh: undefined,
  rightCalf: undefined,
  leftUpperThigh: 'rightUpperThigh',
  leftCalf: 'rightCalf',
};

void SYMMETRY_PAIRS;

function makeInitial(preferredUnit: MeasurementUnit, existing?: CircumferenceFormState): CircumferenceFormState {
  if (existing) return { unit: existing.unit, values: { ...existing.values } };
  return { unit: preferredUnit, values: emptyMeasurements() };
}

export function CircumferenceEntryForm(props: CircumferenceEntryFormProps) {
  const isControlled = props.mode === 'controlled';

  const [internalState, setInternalState] = useState<CircumferenceFormState>(() =>
    makeInitial(props.preferredUnit ?? 'in', props.existingData),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = isControlled ? props.value : internalState;
  const setState = (next: CircumferenceFormState) => {
    if (isControlled) {
      props.onChange(next);
    } else {
      setInternalState(next);
    }
  };

  // Reset internal state if existingData changes in standalone mode
  useEffect(() => {
    if (!isControlled && props.existingData) {
      setInternalState({
        unit: props.existingData.unit,
        values: { ...props.existingData.values },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.existingData]);

  function handleUnitChange(nextUnit: MeasurementUnit) {
    if (nextUnit === state.unit) return;
    setState({
      unit: nextUnit,
      values: convertAllMeasurements(state.values, state.unit, nextUnit),
    });
  }

  function handleFieldChange(key: MeasurementKey, raw: string) {
    const parsed = raw === '' ? null : Number.parseFloat(raw);
    setState({
      ...state,
      values: { ...state.values, [key]: Number.isFinite(parsed as number) ? parsed : null },
    });
  }

  function handleCopyFromRight(leftKey: MeasurementKey) {
    const sourceKey = COPY_PAIRS[leftKey];
    if (!sourceKey) return;
    const sourceVal = state.values[sourceKey];
    if (sourceVal === null) return;
    setState({
      ...state,
      values: { ...state.values, [leftKey]: sourceVal },
    });
  }

  const hasAnyValue = useMemo(
    () => Object.values(state.values).some((v) => v !== null),
    [state.values],
  );

  async function handleSave() {
    if (isControlled) return;
    if (!hasAnyValue) return;
    setError(null);
    setSaving(true);
    try {
      await props.onSave(state);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function renderField(key: MeasurementKey) {
    const v = state.values[key];
    const sourceKey = COPY_PAIRS[key];
    const showCopy = sourceKey !== undefined && state.values[sourceKey] !== null && v === null;

    return (
      <div key={key} className="space-y-1">
        <label
          htmlFor={`circ-${key}`}
          className="block text-xs font-medium uppercase tracking-wider text-white/55"
        >
          {MEASUREMENT_LABELS[key]}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`circ-${key}`}
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={v ?? ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className="w-20 rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-base text-white placeholder-white/30 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]/30"
          />
          <span className="text-sm text-white/40">{state.unit}</span>
          {showCopy && (
            <button
              type="button"
              onClick={() => handleCopyFromRight(key)}
              className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label={`Copy ${MEASUREMENT_LABELS[sourceKey!]} value`}
            >
              <Copy size={12} strokeWidth={1.5} />
              Copy
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Circumferences
        </h3>
        <UnitToggle value={state.unit} onChange={handleUnitChange} layoutId="circumference-form-unit" />
      </div>

      {BODY_REGIONS.map((region, idx) => (
        <section key={region.id} className={idx === 0 ? '' : 'pt-2'}>
          <h4 className="mb-3 border-b border-white/[0.05] pb-1 text-[11px] uppercase tracking-widest text-white/40">
            {region.label}
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {region.measurements.map(renderField)}
          </div>
        </section>
      ))}

      <div className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
        <Lightbulb size={14} strokeWidth={1.5} className="mt-0.5 flex-none text-[#FBBF24]" />
        <p className="text-xs text-white/55">
          You don&apos;t need to fill every field. Log what you have; partial entries are fine.
        </p>
      </div>

      {!isControlled && (
        <>
          {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => props.onCancel()}
              className="rounded-lg px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasAnyValue}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2DA5A0] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
              Save Entry
            </button>
          </div>
        </>
      )}
    </div>
  );
}
