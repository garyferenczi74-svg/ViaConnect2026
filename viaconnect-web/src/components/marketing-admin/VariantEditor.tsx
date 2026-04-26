'use client';

// Prompt #138a Phase 5a: variant editor form.
// Uncontrolled-feeling form that exposes the seven editable fields and a
// live word-count read-out using validateWordCounts() from the Phase 2 lib.
// onSubmit is fired by the parent which decides POST vs PATCH.

import { useMemo } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { validateWordCounts } from '@/lib/marketing/variants/wordCount';
import { WORD_COUNT_BUDGETS, type VariantFraming } from '@/lib/marketing/variants/types';

export interface VariantEditorState {
  slot_id: string;
  variant_label: string;
  framing: VariantFraming;
  headline_text: string;
  subheadline_text: string;
  cta_label: string;
  cta_destination: string;
}

const FRAMINGS: Array<{ value: VariantFraming; label: string }> = [
  { value: 'process_narrative', label: 'Process Narrative' },
  { value: 'outcome_first', label: 'Outcome First' },
  { value: 'proof_first', label: 'Proof First' },
  { value: 'time_to_value', label: 'Time to Value' },
  { value: 'other', label: 'Other' },
];

export interface VariantEditorProps {
  state: VariantEditorState;
  onChange: (next: VariantEditorState) => void;
  /** When true, slot_id and framing become read-only (edit flow). */
  lockIdentity?: boolean;
  disabled?: boolean;
}

export function VariantEditor({ state, onChange, lockIdentity = false, disabled = false }: VariantEditorProps) {
  const wc = useMemo(
    () => validateWordCounts(state.headline_text, state.subheadline_text),
    [state.headline_text, state.subheadline_text],
  );

  const set = <K extends keyof VariantEditorState>(key: K, value: VariantEditorState[K]) => {
    onChange({ ...state, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Slot ID" hint="e.g. hero.variant.E">
          <input
            type="text"
            value={state.slot_id}
            onChange={(e) => set('slot_id', e.target.value)}
            disabled={disabled || lockIdentity}
            placeholder="hero.variant.E"
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-base text-white font-mono min-h-[44px] focus:outline-none focus:border-[#2DA5A0] disabled:opacity-50"
          />
        </Field>
        <Field label="Variant label" hint="Short human-readable name">
          <input
            type="text"
            value={state.variant_label}
            onChange={(e) => set('variant_label', e.target.value)}
            disabled={disabled}
            placeholder="Outcome First v2"
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-base text-white min-h-[44px] focus:outline-none focus:border-[#2DA5A0] disabled:opacity-50"
          />
        </Field>
      </div>

      <Field label="Framing">
        <select
          value={state.framing}
          onChange={(e) => set('framing', e.target.value as VariantFraming)}
          disabled={disabled || lockIdentity}
          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-base text-white min-h-[44px] focus:outline-none focus:border-[#2DA5A0] disabled:opacity-50"
        >
          {FRAMINGS.map((f) => (
            <option key={f.value} value={f.value} className="bg-[#0B1520]">
              {f.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Headline"
        hint={`${wc.headlineWordCount} of ${WORD_COUNT_BUDGETS.headline_max} words`}
        statusOk={wc.headlineWordCount > 0 && wc.headlineWithinBudget}
        statusErr={!wc.headlineWithinBudget}
      >
        <textarea
          rows={2}
          value={state.headline_text}
          onChange={(e) => set('headline_text', e.target.value)}
          disabled={disabled}
          placeholder="One short sentence with the core promise."
          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-base text-white focus:outline-none focus:border-[#2DA5A0] disabled:opacity-50 resize-y"
        />
      </Field>

      <Field
        label="Subheadline"
        hint={`${wc.subheadlineWordCount} of ${WORD_COUNT_BUDGETS.subheadline_max} words`}
        statusOk={wc.subheadlineWordCount > 0 && wc.subheadlineWithinBudget}
        statusErr={!wc.subheadlineWithinBudget}
      >
        <textarea
          rows={3}
          value={state.subheadline_text}
          onChange={(e) => set('subheadline_text', e.target.value)}
          disabled={disabled}
          placeholder="One short paragraph that names the mechanic + outcome."
          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-base text-white focus:outline-none focus:border-[#2DA5A0] disabled:opacity-50 resize-y"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="CTA label">
          <input
            type="text"
            value={state.cta_label}
            onChange={(e) => set('cta_label', e.target.value)}
            disabled={disabled}
            placeholder="Start the assessment"
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-base text-white min-h-[44px] focus:outline-none focus:border-[#2DA5A0] disabled:opacity-50"
          />
        </Field>
        <Field label="CTA destination" hint="Optional; defaults to /signup at render time">
          <input
            type="text"
            value={state.cta_destination}
            onChange={(e) => set('cta_destination', e.target.value)}
            disabled={disabled}
            placeholder="/signup"
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-base text-white font-mono min-h-[44px] focus:outline-none focus:border-[#2DA5A0] disabled:opacity-50"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label, hint, statusOk = false, statusErr = false, children,
}: {
  label: string;
  hint?: string;
  statusOk?: boolean;
  statusErr?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-white/80">{label}</span>
        {hint && (
          <span
            className={`text-[11px] flex items-center gap-1 ${
              statusErr ? 'text-rose-400' : statusOk ? 'text-emerald-400' : 'text-white/40'
            }`}
          >
            {statusErr && <AlertCircle className="h-3 w-3" strokeWidth={1.5} />}
            {statusOk && <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />}
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

export const EMPTY_VARIANT_STATE: VariantEditorState = {
  slot_id: '',
  variant_label: '',
  framing: 'other',
  headline_text: '',
  subheadline_text: '',
  cta_label: '',
  cta_destination: '',
};
