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
  validateField,
} from '..';
import {
  classifyBP,
  getDataSource,
  type ConditionContext,
  type DataSourceId,
} from '@/lib/body-tracker/manual-input';

interface MetabolicCardioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

interface FormState {
  date: string;
  sourceId: DataSourceId | null;
  metabolicAge: number | null;
  bmr: number | null;
  bodyTempF: number | null;
  restingHR: number | null;
  hrv: number | null;
  systolic: number | null;
  diastolic: number | null;
  spo2: number | null;
  respiratoryRate: number | null;
  vo2Max: number | null;
  maxHR: number | null;
  recoveryHR: number | null;
  conditionContext: ConditionContext;
  scanPhotoUrl: string | null;
  notes: string;
}

function initialState(): FormState {
  return {
    date: todayIso(),
    sourceId: null,
    metabolicAge: null,
    bmr: null,
    bodyTempF: null,
    restingHR: null,
    hrv: null,
    systolic: null,
    diastolic: null,
    spo2: null,
    respiratoryRate: null,
    vo2Max: null,
    maxHR: null,
    recoveryHR: null,
    conditionContext: 'resting',
    scanPhotoUrl: null,
    notes: '',
  };
}

const CONDITION_OPTIONS: Array<{ id: ConditionContext; label: string }> = [
  { id: 'resting',       label: 'Resting' },
  { id: 'post_exercise', label: 'Post exercise' },
  { id: 'stressed',      label: 'Stressed' },
  { id: 'sick',          label: 'Sick' },
];

export function MetabolicCardioForm({ open, onOpenChange, onSaved }: MetabolicCardioFormProps) {
  const { id: userId } = useCurrentUser();
  const [state, setState] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = state.sourceId ? getDataSource(state.sourceId) : null;

  const bpClass = useMemo(() => {
    if (state.systolic === null || state.diastolic === null) return null;
    return classifyBP(state.systolic, state.diastolic);
  }, [state.systolic, state.diastolic]);

  const canSave = useMemo(() => {
    if (!state.sourceId || !userId) return false;
    const hasAnyValue =
      state.metabolicAge !== null || state.bmr !== null || state.bodyTempF !== null ||
      state.restingHR !== null || state.hrv !== null ||
      (state.systolic !== null && state.diastolic !== null) ||
      state.spo2 !== null || state.respiratoryRate !== null ||
      state.vo2Max !== null || state.maxHR !== null || state.recoveryHR !== null;
    if (!hasAnyValue) return false;

    const checks: Array<[number | null, Parameters<typeof validateField>[0]]> = [
      [state.metabolicAge, 'metabolic_age'], [state.bmr, 'bmr_kcal'],
      [state.bodyTempF, 'body_temperature_f'],
      [state.restingHR, 'resting_hr'], [state.hrv, 'hrv_ms'],
      [state.systolic, 'systolic_bp'], [state.diastolic, 'diastolic_bp'],
      [state.spo2, 'blood_oxygen_pct'], [state.respiratoryRate, 'respiratory_rate'],
      [state.vo2Max, 'vo2_max'],
    ];
    for (const [v, f] of checks) {
      if (v !== null && validateField(f, v) === 'blocked') return false;
    }
    return true;
  }, [state, userId]);

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
        conditionContext: state.conditionContext,
        details: [
          {
            table: 'body_tracker_metabolic',
            row: {
              metabolic_age:             state.metabolicAge,
              basal_metabolic_rate_kcal: state.bmr,
              body_temperature_f:        state.bodyTempF,
              resting_hr_bpm:            state.restingHR,
              hrv_ms:                    state.hrv,
              systolic_bp:               state.systolic,
              diastolic_bp:              state.diastolic,
              blood_oxygen_pct:          state.spo2,
              respiratory_rate:          state.respiratoryRate,
              vo2_max:                   state.vo2Max,
              max_hr_measured:           state.maxHR,
              recovery_hr:               state.recoveryHR,
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
      title="Log metabolic and cardiovascular"
      description="Enter whichever values you have from your reading"
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Metabolic</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField label="Metabolic age" value={state.metabolicAge} onChange={(v) => patch({ metabolicAge: v })} unit="yrs" sanityField="metabolic_age" />
                <NumberField label="BMR" value={state.bmr} onChange={(v) => patch({ bmr: v })} unit="kcal/day" sanityField="bmr_kcal" />
                <NumberField label="Body temperature" value={state.bodyTempF} onChange={(v) => patch({ bodyTempF: v })} unit="F" sanityField="body_temperature_f" />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Cardiovascular</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField label="Resting heart rate" value={state.restingHR} onChange={(v) => patch({ restingHR: v })} unit="bpm" sanityField="resting_hr" />
                <NumberField label="Heart rate variability" value={state.hrv} onChange={(v) => patch({ hrv: v })} unit="ms" sanityField="hrv_ms" />
                <NumberField label="Systolic BP" value={state.systolic} onChange={(v) => patch({ systolic: v })} unit="mmHg" sanityField="systolic_bp" />
                <NumberField label="Diastolic BP" value={state.diastolic} onChange={(v) => patch({ diastolic: v })} unit="mmHg" sanityField="diastolic_bp" />
                <NumberField label="Blood oxygen (SpO2)" value={state.spo2} onChange={(v) => patch({ spo2: v })} unit="%" sanityField="blood_oxygen_pct" />
                <NumberField label="Respiratory rate" value={state.respiratoryRate} onChange={(v) => patch({ respiratoryRate: v })} unit="br/min" sanityField="respiratory_rate" />
              </div>
              {bpClass && (
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-white/55">Blood pressure classification</p>
                    <p className="text-sm font-semibold text-white">{state.systolic}/{state.diastolic} mmHg</p>
                  </div>
                  <span
                    className="rounded-full px-2 py-1 text-[11px] font-medium"
                    style={{ backgroundColor: `${bpClass.color}1F`, color: bpClass.color, border: `1px solid ${bpClass.color}4D` }}
                  >
                    {bpClass.label}
                  </span>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Fitness metrics (optional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField label="VO2 max" value={state.vo2Max} onChange={(v) => patch({ vo2Max: v })} unit="ml/kg/min" sanityField="vo2_max" />
                <NumberField label="Max heart rate, measured" value={state.maxHR} onChange={(v) => patch({ maxHR: v })} unit="bpm" />
                <NumberField label="Recovery HR" value={state.recoveryHR} onChange={(v) => patch({ recoveryHR: v })} unit="bpm" hint="1 minute post exercise" />
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Condition context</h3>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Condition context">
                {CONDITION_OPTIONS.map((c) => {
                  const selected = state.conditionContext === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => patch({ conditionContext: c.id })}
                      className={`rounded-lg border px-3 py-2 text-xs min-h-[40px] transition-colors ${
                        selected
                          ? 'border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <ScanPhotoUpload
              userId={userId}
              category={source?.id === 'blood_pressure_monitor' ? 'bp_reading' : source?.id === 'clinical_lab' ? 'lab_results' : 'other'}
              value={state.scanPhotoUrl}
              onChange={(p) => patch({ scanPhotoUrl: p })}
            />

            <div className="space-y-1">
              <label htmlFor="mc-notes" className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Notes
              </label>
              <textarea
                id="mc-notes"
                rows={2}
                value={state.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] px-3 py-2 text-base text-white placeholder-white/30 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                placeholder="Anything to remember about this reading"
              />
            </div>

            <FormTip>
              For the most accurate resting heart rate, measure first thing in the morning before getting out of bed. Blood pressure should be taken after 5 minutes of rest.
            </FormTip>
          </>
        )}
      </div>
    </InlineEntryPanel>
  );
}
