'use client';

import { useMemo, useState } from 'react';
import { Target, Scale, Percent, Dumbbell, Ruler, Gauge, HeartPulse, Activity, Settings2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  InlineEntryPanel,
  DatePickerWithDefaults,
  todayIso,
  NumberField,
  FormTip,
  FormActions,
  useCurrentUser,
} from '..';
import { createClient } from '@/lib/supabase/client';

type MilestoneKind = 'weight' | 'body_fat' | 'muscle_mass' | 'waist' | 'body_score' | 'rhr' | 'hrv' | 'custom';

interface MilestoneOption {
  id: MilestoneKind;
  label: string;
  icon: LucideIcon;
  unit: string;
  direction: 'increase' | 'decrease';
}

const MILESTONE_OPTIONS: MilestoneOption[] = [
  { id: 'weight',      label: 'Weight target',              icon: Scale,      unit: 'lbs', direction: 'decrease' },
  { id: 'body_fat',    label: 'Body fat % target',          icon: Percent,    unit: '%',   direction: 'decrease' },
  { id: 'muscle_mass', label: 'Muscle mass target',         icon: Dumbbell,   unit: 'lbs', direction: 'increase' },
  { id: 'waist',       label: 'Waist circumference target', icon: Ruler,      unit: 'in',  direction: 'decrease' },
  { id: 'body_score',  label: 'Body Score target',          icon: Gauge,      unit: 'pts', direction: 'increase' },
  { id: 'rhr',         label: 'Resting heart rate target',  icon: HeartPulse, unit: 'bpm', direction: 'decrease' },
  { id: 'hrv',         label: 'HRV target',                 icon: Activity,   unit: 'ms',  direction: 'increase' },
  { id: 'custom',      label: 'Custom metric',              icon: Settings2,  unit: '',    direction: 'increase' },
];

type RatePref = 'aggressive' | 'moderate' | 'gradual';

const RATE_LABELS: Record<MilestoneKind, Record<RatePref, { label: string; perWeek: number | null }>> = {
  weight:      { aggressive: { label: 'Aggressive, 2 lbs per week',  perWeek: 2    }, moderate: { label: 'Moderate, 1 lb per week',       perWeek: 1    }, gradual: { label: 'Gradual, 0.5 lbs per week',      perWeek: 0.5  } },
  body_fat:    { aggressive: { label: 'Aggressive, 1 percent per week', perWeek: 1 }, moderate: { label: 'Moderate, 0.5 percent per week', perWeek: 0.5 }, gradual: { label: 'Gradual, 0.25 percent per week', perWeek: 0.25 } },
  muscle_mass: { aggressive: { label: 'Aggressive, 0.5 lbs per week', perWeek: 0.5 }, moderate: { label: 'Moderate, 0.25 lbs per week',  perWeek: 0.25 }, gradual: { label: 'Gradual, 0.1 lbs per week',       perWeek: 0.1 } },
  waist:       { aggressive: { label: 'Aggressive, 0.5 in per week',  perWeek: 0.5 }, moderate: { label: 'Moderate, 0.25 in per week',    perWeek: 0.25 }, gradual: { label: 'Gradual, 0.1 in per week',       perWeek: 0.1 } },
  body_score:  { aggressive: { label: 'Aggressive, 25 pts per week', perWeek: 25   }, moderate: { label: 'Moderate, 10 pts per week',    perWeek: 10   }, gradual: { label: 'Gradual, 5 pts per week',        perWeek: 5   } },
  rhr:         { aggressive: { label: 'Aggressive, 2 bpm per week',   perWeek: 2   }, moderate: { label: 'Moderate, 1 bpm per week',     perWeek: 1    }, gradual: { label: 'Gradual, 0.5 bpm per week',      perWeek: 0.5 } },
  hrv:         { aggressive: { label: 'Aggressive, 3 ms per week',    perWeek: 3   }, moderate: { label: 'Moderate, 1.5 ms per week',    perWeek: 1.5  }, gradual: { label: 'Gradual, 1 ms per week',         perWeek: 1   } },
  custom:      { aggressive: { label: 'Aggressive',                   perWeek: null }, moderate: { label: 'Moderate',                   perWeek: null }, gradual: { label: 'Gradual',                         perWeek: null } },
};

interface MilestoneCreatorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

interface FormState {
  goalType: MilestoneKind | null;
  title: string;
  currentValue: number | null;
  targetValue: number | null;
  targetDate: string;
  ratePref: RatePref;
  notes: string;
}

function initialState(): FormState {
  return {
    goalType: null,
    title: '',
    currentValue: null,
    targetValue: null,
    targetDate: '',
    ratePref: 'moderate',
    notes: '',
  };
}

export function MilestoneCreatorForm({ open, onOpenChange, onSaved }: MilestoneCreatorFormProps) {
  const { id: userId } = useCurrentUser();
  const [state, setState] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const option = state.goalType ? MILESTONE_OPTIONS.find((o) => o.id === state.goalType)! : null;
  const rate = state.goalType ? RATE_LABELS[state.goalType][state.ratePref] : null;

  const projection = useMemo(() => {
    if (!option || !rate || state.currentValue === null || state.targetValue === null || rate.perWeek === null) return null;
    const delta = Math.abs(state.targetValue - state.currentValue);
    const weeks = delta / rate.perWeek;
    const days  = Math.ceil(weeks * 7);
    const d = new Date();
    d.setDate(d.getDate() + days);
    return {
      weeks: Math.round(weeks * 10) / 10,
      dateString: d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    };
  }, [option, rate, state.currentValue, state.targetValue]);

  const canSave = Boolean(
    userId && state.goalType && state.targetValue !== null && state.currentValue !== null && state.title.trim().length > 0 && state.targetDate,
  );

  function patch(p: Partial<FormState>) {
    setState((s) => ({ ...s, ...p }));
  }

  function reset() {
    setState(initialState());
    setError(null);
  }

  function selectGoalType(id: MilestoneKind) {
    const opt = MILESTONE_OPTIONS.find((o) => o.id === id)!;
    setState((s) => ({ ...s, goalType: id, title: opt.label }));
  }

  async function handleSave() {
    if (!userId || !state.goalType || state.targetValue === null) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const days = state.targetDate
        ? Math.ceil((new Date(state.targetDate).getTime() - Date.now()) / 86400000)
        : null;

      const { error: insErr } = await supabase
        .from('body_tracker_milestones')
        .insert({
          user_id: userId,
          milestone_type: state.goalType,
          title: state.title.trim(),
          description: state.notes.trim() || null,
          start_value: state.currentValue,
          current_value: state.currentValue,
          target_value: state.targetValue,
          target_unit: option?.unit || null,
          target_date: state.targetDate || null,
          expected_days: days,
          rate_preference: state.ratePref,
          status: 'active',
          is_active: true,
          milestone_order: 1,
          total_milestones: 5,
        } as never);
      if (insErr) throw insErr;

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
      title="Create new milestone"
      description="Set a goal with a target value and timeline"
      footer={
        <div className="space-y-2">
          {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
          <FormActions
            onCancel={() => { reset(); onOpenChange(false); }}
            onSave={handleSave}
            saving={saving}
            disabled={!canSave}
            saveLabel="Create goal"
          />
        </div>
      }
    >
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Goal type</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MILESTONE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = state.goalType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => selectGoalType(opt.id)}
                  aria-pressed={selected}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left min-h-[56px] transition-colors ${
                    selected
                      ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/15'
                      : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-none ${selected ? 'text-[#2DA5A0]' : 'text-white/70'}`} strokeWidth={1.5} />
                  <span className={`text-sm font-medium ${selected ? 'text-[#2DA5A0]' : 'text-white'}`}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {state.goalType && option && (
          <>
            <div className="space-y-1">
              <label htmlFor="milestone-title" className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Title
              </label>
              <input
                id="milestone-title"
                type="text"
                value={state.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder={option.label}
                className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] px-3 py-2.5 text-base text-white placeholder-white/30 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
              />
            </div>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberField
                label="Current value"
                value={state.currentValue}
                onChange={(v) => patch({ currentValue: v })}
                unit={option.unit || undefined}
                required
              />
              <NumberField
                label="Target value"
                value={state.targetValue}
                onChange={(v) => patch({ targetValue: v })}
                unit={option.unit || undefined}
                required
              />
            </section>

            <DatePickerWithDefaults
              id="milestone-target-date"
              label="Target date"
              value={state.targetDate}
              onChange={(v) => patch({ targetDate: v })}
            />

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Rate preference</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Rate preference">
                {(['aggressive', 'moderate', 'gradual'] as RatePref[]).map((r) => {
                  const selected = state.ratePref === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => patch({ ratePref: r })}
                      className={`rounded-lg border px-3 py-3 text-left min-h-[56px] transition-colors ${
                        selected
                          ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="block text-xs font-semibold capitalize">{r}</span>
                      <span className="block text-[11px] leading-tight mt-0.5 text-white/50">
                        {RATE_LABELS[state.goalType!][r].label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {projection && (
              <FormTip>
                At this rate, you would reach {state.targetValue}
                {option.unit ? ` ${option.unit}` : ''} by approximately {projection.dateString}, in {projection.weeks} weeks. This is a healthy rate per clinical guidelines.
              </FormTip>
            )}

            <div className="space-y-1">
              <label htmlFor="milestone-notes" className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Notes
              </label>
              <textarea
                id="milestone-notes"
                rows={2}
                value={state.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] px-3 py-2 text-base text-white placeholder-white/30 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                placeholder="Why this goal matters to you"
              />
            </div>
          </>
        )}

        {!state.goalType && (
          <FormTip>
            Pick a goal type above to set up tracking. Each goal earns Helix tokens as you hit 25 percent, 50 percent, 75 percent, and 100 percent completion.
          </FormTip>
        )}
      </div>
    </InlineEntryPanel>
  );
}

export { MILESTONE_OPTIONS };
export type { MilestoneKind };
