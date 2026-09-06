'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  DataSourceSelector,
  DatePickerWithDefaults,
  todayIso,
  NumberField,
  submitEntry,
  useCurrentUser,
} from './manual-input';
import {
  CompositionSectionToggle,
  type CompositionSection,
} from './CompositionSectionToggle';
import {
  CircumferenceEntryForm,
  type CircumferenceFormState,
} from './CircumferenceEntryForm';
import {
  emptyMeasurements,
  MEASUREMENT_DB_COLUMN,
  MEASUREMENT_EXTERNAL_KEYS,
  MEASUREMENT_KEYS,
  type CircumferenceMeasurements,
  type MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import { getDataSource, type DataSourceId } from '@/lib/body-tracker/manual-input';
import {
  MUSCLE_SCALE_BLOCKED_COPY,
  canWriteSegmentalMuscleLbs,
  formatCompositionProvenanceChip,
} from '@/lib/body-tracker/composition/segmentalMuscleSources';

interface BodyCompositionFormProps {
  initialSection?: CompositionSection;
  preferredUnit?: MeasurementUnit;
  prefillTotalBodyFat?: number | null;
  onSaved?: () => void;
  onCancel: () => void;
}

interface FatState {
  rightArm: number | null;
  leftArm: number | null;
  trunk: number | null;
  rightLeg: number | null;
  leftLeg: number | null;
  totalBodyFat: number | null;
  visceralFat: number | null;
  bodyWater: number | null;
}

interface MuscleState {
  rightArm: number | null;
  leftArm: number | null;
  trunk: number | null;
  rightLeg: number | null;
  leftLeg: number | null;
  totalMuscleMass: number | null;
  skeletalMuscleMass: number | null;
  smmPct: number | null;
}

const EMPTY_FAT: FatState = {
  rightArm: null, leftArm: null, trunk: null, rightLeg: null, leftLeg: null,
  totalBodyFat: null, visceralFat: null, bodyWater: null,
};
const EMPTY_MUSCLE: MuscleState = {
  rightArm: null, leftArm: null, trunk: null, rightLeg: null, leftLeg: null,
  totalMuscleMass: null, skeletalMuscleMass: null, smmPct: null,
};

function hasAnyValue(state: Record<string, number | null>): boolean {
  return Object.values(state).some((v) => v !== null);
}

function circumferenceRowFromState(state: CircumferenceFormState): Record<string, unknown> {
  // source defaults to 'manual' in the table, but write it explicitly so Log Data
  // matches WeightMeasurementsForm and the scan path (source: 'scan').
  const row: Record<string, unknown> = { entry_unit: state.unit, source: 'manual' };
  for (const key of MEASUREMENT_KEYS) {
    if (MEASUREMENT_EXTERNAL_KEYS[key]) continue;
    row[MEASUREMENT_DB_COLUMN[key]] = state.values[key];
  }
  return row;
}

export function BodyCompositionForm({
  initialSection = 'fat',
  preferredUnit = 'in',
  prefillTotalBodyFat = null,
  onSaved,
  onCancel,
}: BodyCompositionFormProps) {
  const { id: userId } = useCurrentUser();

  const [section, setSection] = useState<CompositionSection>(initialSection);
  const [date, setDate] = useState<string>(todayIso());
  const [sourceId, setSourceId] = useState<DataSourceId | null>(
    prefillTotalBodyFat !== null ? 'other' : null,
  );

  const [fat, setFat] = useState<FatState>(() =>
    prefillTotalBodyFat !== null
      ? { ...EMPTY_FAT, totalBodyFat: prefillTotalBodyFat }
      : EMPTY_FAT,
  );
  const [muscle, setMuscle] = useState<MuscleState>(EMPTY_MUSCLE);
  const [circumference, setCircumference] = useState<CircumferenceFormState>(() => ({
    unit: preferredUnit,
    values: emptyMeasurements(),
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fatHasValues = hasAnyValue(fat as unknown as Record<string, number | null>);
  const muscleHasValues = hasAnyValue(muscle as unknown as Record<string, number | null>);
  const muscleWritable = canWriteSegmentalMuscleLbs(sourceId);
  const provenanceChip = formatCompositionProvenanceChip(sourceId);
  const circumferenceHasValues = useMemo<boolean>(() => {
    for (const k of MEASUREMENT_KEYS) {
      if (circumference.values[k] !== null) return true;
    }
    return false;
  }, [circumference]);

  const canSave = Boolean(
    userId &&
    sourceId &&
    (fatHasValues || (muscleHasValues && muscleWritable) || circumferenceHasValues),
  );

  function patchFat(p: Partial<FatState>) { setFat((s) => ({ ...s, ...p })); }
  function patchMuscle(p: Partial<MuscleState>) { setMuscle((s) => ({ ...s, ...p })); }

  async function handleSave() {
    if (!userId || !sourceId) return;
    const source = getDataSource(sourceId);
    if (!source) return;

    setError(null);
    setSaving(true);
    try {
      const details: Parameters<typeof submitEntry>[0]['details'] = [];

      if (fatHasValues) {
        details.push({
          table: 'body_tracker_segmental_fat',
          row: {
            right_arm_pct: fat.rightArm,
            left_arm_pct: fat.leftArm,
            trunk_pct: fat.trunk,
            right_leg_pct: fat.rightLeg,
            left_leg_pct: fat.leftLeg,
            total_body_fat_pct: fat.totalBodyFat,
            visceral_fat_rating: fat.visceralFat,
            body_water_pct: fat.bodyWater,
          },
        });
      }

      if (muscleHasValues && canWriteSegmentalMuscleLbs(sourceId)) {
        details.push({
          table: 'body_tracker_segmental_muscle',
          row: {
            right_arm_lbs: muscle.rightArm,
            left_arm_lbs: muscle.leftArm,
            trunk_lbs: muscle.trunk,
            right_leg_lbs: muscle.rightLeg,
            left_leg_lbs: muscle.leftLeg,
            total_muscle_mass_lbs: muscle.totalMuscleMass,
            skeletal_muscle_mass_lbs: muscle.skeletalMuscleMass,
            smm_pct: muscle.smmPct,
          },
        });
      }

      if (circumferenceHasValues) {
        details.push({
          table: 'body_tracker_circumference',
          row: circumferenceRowFromState(circumference),
        });
      }

      await submitEntry({
        userId,
        entryDate: date,
        manualSourceId: sourceId,
        details,
      });

      onSaved?.();
      onCancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <DatePickerWithDefaults value={date} onChange={setDate} />
      <DataSourceSelector value={sourceId} onChange={setSourceId} />
      {provenanceChip ? (
        <p
          data-testid="body-comp-form-provenance"
          className="text-xs text-white/55"
        >
          Source: <span className="font-medium text-white/75">{provenanceChip}</span>
        </p>
      ) : null}

      {sourceId && (
        <>
          <div className="flex">
            <CompositionSectionToggle
              active={section}
              onChange={(tab) => {
                if (tab === 'formavision') return;
                setSection(tab);
              }}
              includeFormaVision={false}
            />
          </div>

          {section === 'fat' && (
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Segmental body fat
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <NumberField label="Right arm %" value={fat.rightArm} onChange={(v) => patchFat({ rightArm: v })} unit="%" sanityField="segmental_fat_pct" compact />
                <NumberField label="Left arm %"  value={fat.leftArm}  onChange={(v) => patchFat({ leftArm:  v })} unit="%" sanityField="segmental_fat_pct" compact />
                <NumberField label="Trunk %"     value={fat.trunk}    onChange={(v) => patchFat({ trunk:    v })} unit="%" sanityField="segmental_fat_pct" compact />
                <NumberField label="Right leg %" value={fat.rightLeg} onChange={(v) => patchFat({ rightLeg: v })} unit="%" sanityField="segmental_fat_pct" compact />
                <NumberField label="Left leg %"  value={fat.leftLeg}  onChange={(v) => patchFat({ leftLeg:  v })} unit="%" sanityField="segmental_fat_pct" compact />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Summary
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <NumberField label="Total body fat" value={fat.totalBodyFat} onChange={(v) => patchFat({ totalBodyFat: v })} unit="%" sanityField="body_fat_pct" />
                <NumberField label="Visceral fat"   value={fat.visceralFat}  onChange={(v) => patchFat({ visceralFat:  v })} hint="Rating 1 to 59" sanityField="visceral_fat" />
                <NumberField label="Body water"     value={fat.bodyWater}    onChange={(v) => patchFat({ bodyWater:    v })} unit="%" sanityField="body_water_pct" />
              </div>
            </section>
          )}

          {section === 'muscle' && (
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Segmental muscle mass
              </h3>
              {!muscleWritable ? (
                <p data-testid="muscle-scale-blocked" className="text-xs text-white/60">
                  {MUSCLE_SCALE_BLOCKED_COPY}
                </p>
              ) : null}
              <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${muscleWritable ? '' : 'pointer-events-none opacity-40'}`}>
                <NumberField label="Right arm" value={muscle.rightArm} onChange={(v) => patchMuscle({ rightArm: v })} unit="lbs" sanityField="segmental_muscle_lbs" compact />
                <NumberField label="Left arm"  value={muscle.leftArm}  onChange={(v) => patchMuscle({ leftArm:  v })} unit="lbs" sanityField="segmental_muscle_lbs" compact />
                <NumberField label="Trunk"     value={muscle.trunk}    onChange={(v) => patchMuscle({ trunk:    v })} unit="lbs" sanityField="segmental_muscle_lbs" compact />
                <NumberField label="Right leg" value={muscle.rightLeg} onChange={(v) => patchMuscle({ rightLeg: v })} unit="lbs" sanityField="segmental_muscle_lbs" compact />
                <NumberField label="Left leg"  value={muscle.leftLeg}  onChange={(v) => patchMuscle({ leftLeg:  v })} unit="lbs" sanityField="segmental_muscle_lbs" compact />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Totals
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <NumberField label="Total muscle mass"    value={muscle.totalMuscleMass}    onChange={(v) => patchMuscle({ totalMuscleMass:    v })} unit="lbs" />
                <NumberField label="Skeletal muscle mass" value={muscle.skeletalMuscleMass} onChange={(v) => patchMuscle({ skeletalMuscleMass: v })} unit="lbs" />
                <NumberField label="Skeletal muscle %"    value={muscle.smmPct}             onChange={(v) => patchMuscle({ smmPct:             v })} unit="%"   hint="Of total body weight" />
              </div>
            </section>
          )}

          {section === 'measurements' && (
            <CircumferenceEntryForm
              mode="controlled"
              value={circumference}
              onChange={setCircumference}
              preferredUnit={preferredUnit}
            />
          )}
        </>
      )}

      {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2DA5A0] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
          Save Entry
        </button>
      </div>
    </div>
  );
}
