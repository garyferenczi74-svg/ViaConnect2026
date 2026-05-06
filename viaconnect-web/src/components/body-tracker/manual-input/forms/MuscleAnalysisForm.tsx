'use client';

import { useMemo, useState } from 'react';
import { BodySilhouette } from '@/components/body-tracker/BodySilhouette';
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
  validateField,
} from '..';
import {
  analyzeSymmetry,
  getDataSource,
  type DataSourceId,
} from '@/lib/body-tracker/manual-input';

interface MuscleAnalysisFormProps {
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
  totalMuscleMass: number | null;
  skeletalMuscleMass: number | null;
  smmPct: number | null;
  gripRight: number | null;
  gripLeft: number | null;
  muscleQuality: number | null;
  scanPhotoUrl: string | null;
  notes: string;
}

function initialState(): FormState {
  return {
    date: todayIso(),
    sourceId: null,
    rightArm: null, leftArm: null, trunk: null, rightLeg: null, leftLeg: null,
    totalMuscleMass: null,
    skeletalMuscleMass: null,
    smmPct: null,
    gripRight: null,
    gripLeft: null,
    muscleQuality: null,
    scanPhotoUrl: null,
    notes: '',
  };
}

export function MuscleAnalysisForm({ open, onOpenChange, onSaved }: MuscleAnalysisFormProps) {
  const { id: userId } = useCurrentUser();
  const [state, setState] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = state.sourceId ? getDataSource(state.sourceId) : null;
  const showSegmental = source?.providesSegmental ?? false;

  const autoTotal = useMemo(() => {
    if (!showSegmental) return null;
    const parts = [state.rightArm, state.leftArm, state.trunk, state.rightLeg, state.leftLeg];
    if (parts.some((p) => p === null)) return null;
    const sum = parts.reduce((acc, v) => (acc ?? 0) + (v ?? 0), 0) ?? 0;
    return Math.round(sum * 10) / 10;
  }, [state, showSegmental]);

  const armSym = useMemo(() => {
    if (state.rightArm === null || state.leftArm === null) return null;
    return analyzeSymmetry(state.leftArm, state.rightArm);
  }, [state.leftArm, state.rightArm]);
  const legSym = useMemo(() => {
    if (state.rightLeg === null || state.leftLeg === null) return null;
    return analyzeSymmetry(state.leftLeg, state.rightLeg);
  }, [state.leftLeg, state.rightLeg]);

  const silhouetteData = {
    right_arm_lbs: state.rightArm ?? 0,
    left_arm_lbs:  state.leftArm ?? 0,
    trunk_lbs:     state.trunk ?? 0,
    right_leg_lbs: state.rightLeg ?? 0,
    left_leg_lbs:  state.leftLeg ?? 0,
    total_muscle_mass_lbs:    state.totalMuscleMass ?? autoTotal ?? 0,
    skeletal_muscle_mass_lbs: state.skeletalMuscleMass ?? 0,
  };

  const canSave = useMemo(() => {
    if (!state.sourceId || !userId) return false;
    const total = state.totalMuscleMass ?? autoTotal;
    if (total === null && state.skeletalMuscleMass === null) return false;
    const checks: Array<[number | null, Parameters<typeof validateField>[0]]> = [
      [state.rightArm, 'segmental_muscle_lbs'], [state.leftArm, 'segmental_muscle_lbs'],
      [state.trunk, 'segmental_muscle_lbs'], [state.rightLeg, 'segmental_muscle_lbs'],
      [state.leftLeg, 'segmental_muscle_lbs'], [total, 'muscle_mass_lbs'],
    ];
    for (const [v, f] of checks) {
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
      await submitEntry({
        userId,
        entryDate: state.date,
        manualSourceId: state.sourceId,
        scanPhotoUrl: state.scanPhotoUrl,
        notes: state.notes || null,
        details: [
          {
            table: 'body_tracker_segmental_muscle',
            row: {
              right_arm_lbs: state.rightArm,
              left_arm_lbs:  state.leftArm,
              trunk_lbs:     state.trunk,
              right_leg_lbs: state.rightLeg,
              left_leg_lbs:  state.leftLeg,
              total_muscle_mass_lbs:    state.totalMuscleMass ?? autoTotal,
              skeletal_muscle_mass_lbs: state.skeletalMuscleMass,
              smm_pct: state.smmPct,
              grip_strength_right_lbs: state.gripRight,
              grip_strength_left_lbs:  state.gripLeft,
              muscle_quality_score:    state.muscleQuality,
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
    <InlineEntryPanel
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
      title="Log muscle analysis"
      description="Segmental muscle mass, totals, and optional strength"
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
                  Segmental muscle mass
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-start">
                  <div className="space-y-3">
                    <NumberField label="Right arm" value={state.rightArm} onChange={(v) => patch({ rightArm: v })} unit="lbs" sanityField="segmental_muscle_lbs" compact />
                    <NumberField label="Trunk" value={state.trunk} onChange={(v) => patch({ trunk: v })} unit="lbs" sanityField="segmental_muscle_lbs" compact />
                    <NumberField label="Right leg" value={state.rightLeg} onChange={(v) => patch({ rightLeg: v })} unit="lbs" sanityField="segmental_muscle_lbs" compact />
                  </div>
                  <div className="hidden md:flex justify-center items-center">
                    <div className="w-36">
                      <BodySilhouette mode="muscle" segmentalData={silhouetteData} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <NumberField label="Left arm" value={state.leftArm} onChange={(v) => patch({ leftArm: v })} unit="lbs" sanityField="segmental_muscle_lbs" compact />
                    <div className="invisible" aria-hidden>placeholder</div>
                    <NumberField label="Left leg" value={state.leftLeg} onChange={(v) => patch({ leftLeg: v })} unit="lbs" sanityField="segmental_muscle_lbs" compact />
                  </div>
                </div>
                <div className="md:hidden">
                  <div className="w-36 mx-auto">
                    <BodySilhouette mode="muscle" segmentalData={silhouetteData} />
                  </div>
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Totals</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField
                  label="Total muscle mass"
                  value={state.totalMuscleMass ?? autoTotal}
                  onChange={(v) => patch({ totalMuscleMass: v })}
                  unit="lbs"
                  autoFilled={state.totalMuscleMass === null && autoTotal !== null}
                  hint={showSegmental ? 'Sum of 5 regions, can override' : undefined}
                />
                <NumberField
                  label="Skeletal muscle mass"
                  value={state.skeletalMuscleMass}
                  onChange={(v) => patch({ skeletalMuscleMass: v })}
                  unit="lbs"
                />
                <NumberField
                  label="Skeletal muscle %"
                  value={state.smmPct}
                  onChange={(v) => patch({ smmPct: v })}
                  unit="%"
                  hint="Of total body weight"
                />
              </div>
            </section>

            {(armSym || legSym) && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Symmetry
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {armSym && (
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-white/55">Arm balance</p>
                        <p className="text-sm font-semibold text-white">{armSym.ratio.toFixed(1)}%</p>
                      </div>
                      <span
                        className="rounded-full px-2 py-1 text-[11px] font-medium"
                        style={{ backgroundColor: `${armSym.color}1F`, color: armSym.color, border: `1px solid ${armSym.color}4D` }}
                      >
                        {armSym.status}
                      </span>
                    </div>
                  )}
                  {legSym && (
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-white/55">Leg balance</p>
                        <p className="text-sm font-semibold text-white">{legSym.ratio.toFixed(1)}%</p>
                      </div>
                      <span
                        className="rounded-full px-2 py-1 text-[11px] font-medium"
                        style={{ backgroundColor: `${legSym.color}1F`, color: legSym.color, border: `1px solid ${legSym.color}4D` }}
                      >
                        {legSym.status}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Optional advanced
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField label="Grip strength, right" value={state.gripRight} onChange={(v) => patch({ gripRight: v })} unit="lbs" compact />
                <NumberField label="Grip strength, left" value={state.gripLeft} onChange={(v) => patch({ gripLeft: v })} unit="lbs" compact />
                <NumberField label="Muscle quality score" value={state.muscleQuality} onChange={(v) => patch({ muscleQuality: v })} hint="From advanced scan" compact />
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
              InBody scans provide segmental muscle mass. If your scan only shows total muscle mass, enter that and skip the segmental fields.
            </FormTip>
          </>
        )}
      </div>
    </InlineEntryPanel>
  );
}
