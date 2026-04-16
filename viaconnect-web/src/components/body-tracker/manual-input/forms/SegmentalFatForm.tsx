'use client';

import { useMemo, useState } from 'react';
import { BodySilhouette } from '@/components/body-tracker/BodySilhouette';
import {
  ManualInputModal,
  DataSourceSelector,
  DatePickerWithDefaults,
  todayIso,
  NumberField,
  ScanPhotoUpload,
  FormTip,
  FormActions,
  submitEntry,
  useCurrentUser,
  validateField,
} from '..';
import {
  calculateTotalBodyFat,
  getDataSource,
  type DataSourceId,
} from '@/lib/body-tracker/manual-input';

interface SegmentalFatFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

interface FormState {
  date: string;
  sourceId: DataSourceId | null;
  rightArm: number | null;
  leftArm: number | null;
  trunk: number | null;
  rightLeg: number | null;
  leftLeg: number | null;
  totalBodyFat: number | null;
  visceralFat: number | null;
  bodyWater: number | null;
  subcutaneous: number | null;
  fatMass: number | null;
  bmd: number | null;
  scanPhotoUrl: string | null;
  notes: string;
}

function initialState(): FormState {
  return {
    date: todayIso(),
    sourceId: null,
    rightArm: null, leftArm: null, trunk: null, rightLeg: null, leftLeg: null,
    totalBodyFat: null,
    visceralFat: null,
    bodyWater: null,
    subcutaneous: null,
    fatMass: null,
    bmd: null,
    scanPhotoUrl: null,
    notes: '',
  };
}

export function SegmentalFatForm({ open, onOpenChange, onSaved }: SegmentalFatFormProps) {
  const { id: userId } = useCurrentUser();
  const [state, setState] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = state.sourceId ? getDataSource(state.sourceId) : null;
  const showSegmental = source?.providesSegmental ?? false;
  const showDexaOnly = source?.id === 'dexa';

  const autoTotal = useMemo(() => {
    if (!showSegmental) return null;
    const { rightArm, leftArm, trunk, rightLeg, leftLeg } = state;
    if ([rightArm, leftArm, trunk, rightLeg, leftLeg].some((v) => v === null)) return null;
    return calculateTotalBodyFat({
      rightArmPct: rightArm!, leftArmPct: leftArm!, trunkPct: trunk!,
      rightLegPct: rightLeg!, leftLegPct: leftLeg!,
    });
  }, [state, showSegmental]);

  const silhouetteData = {
    right_arm_pct: state.rightArm ?? 0,
    left_arm_pct: state.leftArm ?? 0,
    trunk_pct: state.trunk ?? 0,
    right_leg_pct: state.rightLeg ?? 0,
    left_leg_pct: state.leftLeg ?? 0,
    total_body_fat_pct: state.totalBodyFat ?? autoTotal ?? 0,
  };

  const canSave = useMemo(() => {
    if (!state.sourceId || !userId) return false;
    const total = state.totalBodyFat ?? autoTotal;
    if (total === null) return false;
    const fields: Array<[number | null, Parameters<typeof validateField>[0]]> = [
      [state.rightArm, 'segmental_fat_pct'], [state.leftArm, 'segmental_fat_pct'],
      [state.trunk, 'segmental_fat_pct'], [state.rightLeg, 'segmental_fat_pct'],
      [state.leftLeg, 'segmental_fat_pct'], [total, 'body_fat_pct'],
      [state.visceralFat, 'visceral_fat'], [state.bodyWater, 'body_water_pct'],
    ];
    for (const [v, f] of fields) {
      if (v !== null && validateField(f, v) === 'blocked') return false;
    }
    return true;
  }, [state, autoTotal, userId]);

  function patch(p: Partial<FormState>) {
    setState((s) => ({ ...s, ...p }));
  }

  function reset() {
    setState(initialState());
    setError(null);
  }

  async function handleSave() {
    if (!userId || !state.sourceId) return;
    setSaving(true);
    setError(null);
    try {
      const total = state.totalBodyFat ?? autoTotal;
      await submitEntry({
        userId,
        entryDate: state.date,
        manualSourceId: state.sourceId,
        scanPhotoUrl: state.scanPhotoUrl,
        notes: state.notes || null,
        details: [
          {
            table: 'body_tracker_segmental_fat',
            row: {
              right_arm_pct: state.rightArm,
              left_arm_pct: state.leftArm,
              trunk_pct: state.trunk,
              right_leg_pct: state.rightLeg,
              left_leg_pct: state.leftLeg,
              total_body_fat_pct: total,
              visceral_fat_rating: state.visceralFat,
              body_water_pct: state.bodyWater,
              subcutaneous_fat_pct: state.subcutaneous,
              fat_mass_lbs: state.fatMass,
              bone_mineral_density: state.bmd,
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

  return (
    <ManualInputModal
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
      title="Log body composition"
      description="Segmental body fat and composition summary"
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
            {showSegmental && (
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Segmental body fat
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-start">
                  <div className="space-y-3">
                    <NumberField label="Right arm %" value={state.rightArm} onChange={(v) => patch({ rightArm: v })} unit="%" sanityField="segmental_fat_pct" compact />
                    <NumberField label="Trunk %" value={state.trunk} onChange={(v) => patch({ trunk: v })} unit="%" sanityField="segmental_fat_pct" compact />
                    <NumberField label="Right leg %" value={state.rightLeg} onChange={(v) => patch({ rightLeg: v })} unit="%" sanityField="segmental_fat_pct" compact />
                  </div>
                  <div className="hidden md:flex justify-center items-center">
                    <div className="w-36">
                      <BodySilhouette mode="fat" segmentalData={silhouetteData} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <NumberField label="Left arm %" value={state.leftArm} onChange={(v) => patch({ leftArm: v })} unit="%" sanityField="segmental_fat_pct" compact />
                    <div className="invisible" aria-hidden>placeholder</div>
                    <NumberField label="Left leg %" value={state.leftLeg} onChange={(v) => patch({ leftLeg: v })} unit="%" sanityField="segmental_fat_pct" compact />
                  </div>
                </div>
                <div className="md:hidden">
                  <div className="w-36 mx-auto">
                    <BodySilhouette mode="fat" segmentalData={silhouetteData} />
                  </div>
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField
                  label="Total body fat"
                  value={state.totalBodyFat ?? autoTotal}
                  onChange={(v) => patch({ totalBodyFat: v })}
                  unit="%"
                  sanityField="body_fat_pct"
                  autoFilled={state.totalBodyFat === null && autoTotal !== null}
                  hint={showSegmental ? 'Auto calculated from segmental, can override' : undefined}
                />
                <NumberField label="Visceral fat" value={state.visceralFat} onChange={(v) => patch({ visceralFat: v })} hint="Rating 1 to 59" sanityField="visceral_fat" />
                <NumberField label="Body water" value={state.bodyWater} onChange={(v) => patch({ bodyWater: v })} unit="%" sanityField="body_water_pct" />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Optional extras
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField label="Subcutaneous fat" value={state.subcutaneous} onChange={(v) => patch({ subcutaneous: v })} unit="%" />
                <NumberField label="Fat mass" value={state.fatMass} onChange={(v) => patch({ fatMass: v })} unit="lbs" />
                {showDexaOnly && (
                  <NumberField label="Bone mineral density" value={state.bmd} onChange={(v) => patch({ bmd: v })} unit="g/cm²" hint="DEXA only" />
                )}
              </div>
            </section>

            <ScanPhotoUpload
              userId={userId}
              category={source?.id === 'dexa' ? 'dexa_report' : source?.id === 'inbody' ? 'inbody_printout' : 'other'}
              value={state.scanPhotoUrl}
              onChange={(p) => patch({ scanPhotoUrl: p })}
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
              Your gym&apos;s InBody printout shows segmental fat percent for each body region. DEXA scans provide the most accurate data.
            </FormTip>
          </>
        )}
      </div>
    </ManualInputModal>
  );
}
