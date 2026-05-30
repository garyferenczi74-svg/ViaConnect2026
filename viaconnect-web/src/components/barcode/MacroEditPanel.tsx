/**
 * Prompt 170l Phase 1c-2: per-item macro override panel (Hannah 11.8).
 *
 * Two modes:
 *   1. Pre-filled mode: opened from product confirmation 11.4 "Macros wrong?
 *      Edit" link. Numeric fields pre-populated with OFF-derived values.
 *      Footer note: "Your edits apply to this meal only. They don't update
 *      Open Food Facts."
 *   2. Blank-slate mode: opened from 11.5 not-found fallback "Enter macros
 *      manually" card. All fields blank; user fills from the nutrition label
 *      on the package.
 *
 * On Save: parent receives the new macro values + a flag indicating whether
 * the original OFF values were overridden (true for blank-slate, true for
 * any field change in pre-filled mode).
 */

'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

const TEAL = '#2DA5A0';
const NAVY_50 = 'rgba(26, 39, 68, 0.5)';
const CARD = '#1E3054';

interface MacroValues {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  sugar_g: number;
}

const EMPTY_MACROS: MacroValues = {
  calories_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sodium_mg: 0,
  sugar_g: 0,
};

export interface MacroEditPanelProps {
  open: boolean;
  mode: 'prefilled' | 'blank_slate';
  initialValues?: Partial<MacroValues>;
  productNameHint?: string;
  onClose: () => void;
  onSave: (values: MacroValues, didOverride: boolean) => void;
}

const FIELDS: Array<{ key: keyof MacroValues; label: string; unit: string; primary: boolean }> = [
  { key: 'calories_kcal', label: 'Calories', unit: 'kcal', primary: true },
  { key: 'protein_g', label: 'Protein', unit: 'g', primary: true },
  { key: 'carbs_g', label: 'Carbs', unit: 'g', primary: true },
  { key: 'fat_g', label: 'Fat', unit: 'g', primary: true },
  { key: 'fiber_g', label: 'Fiber', unit: 'g', primary: false },
  { key: 'sugar_g', label: 'Sugar', unit: 'g', primary: false },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', primary: false },
];

function clampNonNegative(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function MacroEditPanel({
  open,
  mode,
  initialValues,
  productNameHint,
  onClose,
  onSave,
}: MacroEditPanelProps): JSX.Element | null {
  const titleId = useId();
  const [values, setValues] = useState<MacroValues>(EMPTY_MACROS);
  const [initialSnapshot, setInitialSnapshot] = useState<MacroValues>(EMPTY_MACROS);

  useEffect(() => {
    if (!open) return;
    const merged: MacroValues = { ...EMPTY_MACROS };
    if (initialValues) {
      for (const k of Object.keys(merged) as Array<keyof MacroValues>) {
        const v = initialValues[k];
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
          merged[k] = v;
        }
      }
    }
    setValues(merged);
    setInitialSnapshot(merged);
  }, [open, initialValues]);

  const onChangeField = useCallback(
    (key: keyof MacroValues, raw: string) => {
      const parsed = raw === '' ? 0 : Number.parseFloat(raw);
      const safe = clampNonNegative(parsed);
      setValues((v) => ({ ...v, [key]: safe }));
    },
    [],
  );

  const onSubmit = useCallback(() => {
    const didOverride =
      mode === 'blank_slate'
      || (Object.keys(values) as Array<keyof MacroValues>).some(
        (k) => values[k] !== initialSnapshot[k],
      );
    onSave(values, didOverride);
  }, [mode, values, initialSnapshot, onSave]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[150] flex items-center justify-center px-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: CARD, color: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full"
            style={{ color: 'rgba(255, 255, 255, 0.85)' }}
          >
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <h2 id={titleId} className="font-medium" style={{ fontSize: 16 }}>
            {mode === 'blank_slate' ? 'Enter macros' : 'Edit macros'}
          </h2>
          <div className="w-11" aria-hidden="true" />
        </div>

        {productNameHint ? (
          <p className="mb-4 text-center" style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
            {productNameHint}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {FIELDS.filter((f) => f.primary).map((f) => (
            <MacroField
              key={f.key}
              label={f.label}
              unit={f.unit}
              value={values[f.key]}
              onChange={(v) => onChangeField(f.key, v)}
            />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {FIELDS.filter((f) => !f.primary).map((f) => (
            <MacroField
              key={f.key}
              label={f.label}
              unit={f.unit}
              value={values[f.key]}
              onChange={(v) => onChangeField(f.key, v)}
            />
          ))}
        </div>

        <p
          className="mt-5"
          style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5 }}
        >
          Your edits apply to this meal only. They do not update Open Food Facts.
        </p>

        <button
          type="button"
          onClick={onSubmit}
          className="mt-5 w-full rounded-xl font-semibold"
          style={{
            backgroundColor: TEAL,
            color: '#FFFFFF',
            height: 48,
            fontSize: 14,
          }}
        >
          {mode === 'blank_slate' ? 'Add to meal' : 'Save edits'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 block w-full text-center underline"
          style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface MacroFieldProps {
  label: string;
  unit: string;
  value: number;
  onChange: (raw: string) => void;
}

function MacroField({ label, unit, value, onChange }: MacroFieldProps): JSX.Element {
  return (
    <label className="block">
      <span
        className="block uppercase tracking-wide font-medium mb-1"
        style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.55)' }}
      >
        {label}
      </span>
      <span
        className="flex items-center rounded-lg px-3"
        style={{ backgroundColor: NAVY_50, height: 44 }}
      >
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none"
          style={{ color: '#FFFFFF', fontSize: 14 }}
        />
        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}>{unit}</span>
      </span>
    </label>
  );
}
