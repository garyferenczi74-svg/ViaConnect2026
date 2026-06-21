'use client';

// Prompt 207a Task 8: BeverageEditor component.
//
// Handles both CREATE (no existing row) and EDIT (row selected from the list)
// flows for beverage_catalog entries.
//
// Constraints:
//   - slug is LOCKED after the row exists (set on create, immutable on update).
//   - Disable = PATCH is_active:false (soft delete); no hard delete.
//   - compliance_note from the API is surfaced non-blockingly below the form.
//   - Lucide icons at strokeWidth 1.5; design tokens #1A2744/#1E3054/#2DA5A0/#B75E18.
//   - No em-dashes or en-dashes anywhere.

import { useState } from 'react';
import { getDisplayName } from '@/lib/getDisplayName';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Info,
  Lock,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import type {
  BeverageCatalogRow,
  BeverageCategory,
} from '@/components/nutrition/hydration/BeveragePicker/BeveragePicker.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS: ReadonlyArray<{ value: BeverageCategory; label: string }> = [
  { value: 'water', label: 'Water' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'tea', label: 'Tea' },
  { value: 'juice', label: 'Juice' },
  { value: 'pop', label: 'Pop / Soda' },
  { value: 'sports_energy', label: 'Sports / Energy' },
  { value: 'milk', label: 'Milk' },
  { value: 'functional', label: 'Functional' },
  { value: 'alcohol', label: 'Alcohol' },
];

const SOURCE_KIND_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'pure_water', label: 'Pure Water' },
  { value: 'coffee_tea', label: 'Coffee / Tea' },
  { value: 'juice_smoothie', label: 'Juice / Smoothie' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'soda', label: 'Soda' },
  { value: 'alcohol_low', label: 'Alcohol (Low)' },
  { value: 'alcohol_high', label: 'Alcohol (High)' },
  { value: 'sports_drink', label: 'Sports Drink' },
  { value: 'high_water_food', label: 'High-Water Food' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BeverageEditorProps {
  /** If null, the editor is in CREATE mode. If set, EDIT mode for that row. */
  beverage: BeverageCatalogRow | null;
  onSaved: (row: BeverageCatalogRow) => void;
  onClose: () => void;
}

type FormFields = {
  slug: string;
  display_name: string;
  category: string;
  hydration_source_kind: string;
  default_volume_ml: string;
  hydration_coefficient: string;
  caffeine_mg_per_serving: string;
  kcal_per_serving: string;
  sugar_g: string;
  sodium_mg: string;
  potassium_mg: string;
  magnesium_mg: string;
  is_alcoholic: boolean;
  abv: string;
  evidence_source: string;
  requires_claim_review: boolean;
  is_active: boolean;
  sort_order: string;
};

function rowToForm(row: BeverageCatalogRow | null): FormFields {
  if (!row) {
    return {
      slug: '',
      display_name: '',
      category: 'water',
      hydration_source_kind: 'pure_water',
      default_volume_ml: '240',
      hydration_coefficient: '1.00',
      caffeine_mg_per_serving: '0',
      kcal_per_serving: '0',
      sugar_g: '0',
      sodium_mg: '0',
      potassium_mg: '0',
      magnesium_mg: '0',
      is_alcoholic: false,
      abv: '',
      evidence_source: '',
      requires_claim_review: false,
      is_active: true,
      sort_order: '0',
    };
  }
  return {
    slug: row.slug,
    display_name: row.display_name,
    category: row.category,
    hydration_source_kind: row.hydration_source_kind,
    default_volume_ml: String(row.default_volume_ml),
    hydration_coefficient: row.hydration_coefficient.toFixed(2),
    caffeine_mg_per_serving: String(row.caffeine_mg_per_serving),
    kcal_per_serving: String(row.kcal_per_serving),
    sugar_g: String(row.sugar_g),
    sodium_mg: String(row.sodium_mg),
    potassium_mg: String(row.potassium_mg),
    magnesium_mg: String(row.magnesium_mg),
    is_alcoholic: row.is_alcoholic,
    abv: row.abv != null ? String(row.abv) : '',
    evidence_source: row.evidence_source ?? '',
    requires_claim_review: row.requires_claim_review,
    is_active: row.is_active,
    sort_order: String(row.sort_order),
  };
}

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------

const inputClass =
  'w-full rounded-lg border py-2 px-3 text-sm outline-none transition-colors placeholder:text-[#4a6090] focus:border-[#2DA5A0]';

const inputStyle = {
  background: '#0f1929',
  borderColor: '#1E3054',
  color: '#c8d8f4',
};

const labelStyle = { color: '#8099cc' };

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider" style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputClass + ' appearance-none pr-8'}
          style={inputStyle}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          strokeWidth={1.5}
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: '#8099cc' }}
        />
      </div>
    </Field>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step ?? '1'}
        min={min}
        max={max}
        className={inputClass}
        style={inputStyle}
      />
    </Field>
  );
}

// ---------------------------------------------------------------------------
// BeverageEditor
// ---------------------------------------------------------------------------

export function BeverageEditor({ beverage, onSaved, onClose }: BeverageEditorProps) {
  const isEdit = beverage !== null;
  const [form, setForm] = useState<FormFields>(() => rowToForm(beverage));
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [complianceNote, setComplianceNote] = useState<string | null>(null);

  function set<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setApiError(null);
    setComplianceNote(null);

    const body: Record<string, unknown> = {
      display_name: form.display_name,
      category: form.category,
      hydration_source_kind: form.hydration_source_kind,
      default_volume_ml: Number(form.default_volume_ml),
      hydration_coefficient: Number(form.hydration_coefficient),
      caffeine_mg_per_serving: Number(form.caffeine_mg_per_serving),
      kcal_per_serving: Number(form.kcal_per_serving),
      sugar_g: Number(form.sugar_g),
      sodium_mg: Number(form.sodium_mg),
      potassium_mg: Number(form.potassium_mg),
      magnesium_mg: Number(form.magnesium_mg),
      is_alcoholic: form.is_alcoholic,
      abv: form.abv !== '' ? Number(form.abv) : null,
      evidence_source: form.evidence_source !== '' ? form.evidence_source : null,
      requires_claim_review: form.requires_claim_review,
      is_active: form.is_active,
      sort_order: Number(form.sort_order),
    };

    let url: string;
    let method: string;

    if (isEdit) {
      // PATCH: slug in URL; do NOT include slug in body (immutable)
      url = `/api/admin/nutrition/beverages/${encodeURIComponent(beverage.slug)}`;
      method = 'PATCH';
    } else {
      // POST: include slug in body
      body.slug = form.slug;
      url = '/api/admin/nutrition/beverages';
      method = 'POST';
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        setApiError((json.error as string) ?? 'Save failed');
        setSaving(false);
        return;
      }

      if (typeof json.compliance_note === 'string') {
        setComplianceNote(json.compliance_note);
      }

      onSaved(json.beverage as BeverageCatalogRow);
    } catch {
      setApiError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!isEdit) return;
    setSaving(true);
    setApiError(null);
    try {
      const res = await fetch(
        `/api/admin/nutrition/beverages/${encodeURIComponent(beverage.slug)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !beverage.is_active }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setApiError((json.error as string) ?? 'Toggle failed');
        return;
      }
      onSaved(json.beverage as BeverageCatalogRow);
    } catch {
      setApiError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-xl border p-5 sm:p-6"
      style={{ background: '#1A2744', borderColor: '#1E3054' }}
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold" style={{ color: '#2DA5A0' }}>
          {isEdit ? `Edit: ${beverage.display_name}` : 'Add New Beverage'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
          aria-label="Close editor"
        >
          <X strokeWidth={1.5} className="h-4 w-4" style={{ color: '#8099cc' }} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Slug */}
        <Field label="Slug">
          <div className="relative">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => !isEdit && set('slug', e.target.value)}
              readOnly={isEdit}
              placeholder="e.g. green_tea_standard"
              className={inputClass + (isEdit ? ' cursor-not-allowed opacity-60' : '')}
              style={inputStyle}
              required={!isEdit}
            />
            {isEdit && (
              <Lock
                strokeWidth={1.5}
                className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                style={{ color: '#8099cc' }}
              />
            )}
          </div>
          {isEdit && (
            <p className="mt-1 text-xs" style={{ color: '#4a6090' }}>
              Slug is locked after creation and cannot be changed.
            </p>
          )}
        </Field>

        {/* Display name */}
        <Field label="Display Name">
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => set('display_name', e.target.value)}
            placeholder="e.g. Green Tea"
            className={inputClass}
            style={inputStyle}
            required
          />
        </Field>

        {/* Category + Source Kind */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Category"
            value={form.category}
            onChange={(v) => set('category', v)}
            options={CATEGORY_OPTIONS}
          />
          <SelectField
            label="Hydration Source Kind"
            value={form.hydration_source_kind}
            onChange={(v) => set('hydration_source_kind', v)}
            options={SOURCE_KIND_OPTIONS}
          />
        </div>

        {/* Volume + Hydration coefficient */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumField
            label="Default Volume (ml)"
            value={form.default_volume_ml}
            onChange={(v) => set('default_volume_ml', v)}
            step="1"
            min="1"
          />
          <NumField
            label="Hydration Coefficient (0.50 - 1.60)"
            value={form.hydration_coefficient}
            onChange={(v) => set('hydration_coefficient', v)}
            step="0.01"
            min="0.50"
            max="1.60"
          />
        </div>

        {/* Caffeine + Calories */}
        <div className="grid grid-cols-2 gap-4">
          <NumField
            label="Caffeine (mg / serving)"
            value={form.caffeine_mg_per_serving}
            onChange={(v) => set('caffeine_mg_per_serving', v)}
            min="0"
          />
          <NumField
            label="Calories (kcal / serving)"
            value={form.kcal_per_serving}
            onChange={(v) => set('kcal_per_serving', v)}
            min="0"
          />
        </div>

        {/* Sugar + Sodium */}
        <div className="grid grid-cols-2 gap-4">
          <NumField
            label="Sugar (g)"
            value={form.sugar_g}
            onChange={(v) => set('sugar_g', v)}
            step="0.1"
            min="0"
          />
          <NumField
            label="Sodium (mg)"
            value={form.sodium_mg}
            onChange={(v) => set('sodium_mg', v)}
            min="0"
          />
        </div>

        {/* Potassium + Magnesium */}
        <div className="grid grid-cols-2 gap-4">
          <NumField
            label="Potassium (mg)"
            value={form.potassium_mg}
            onChange={(v) => set('potassium_mg', v)}
            min="0"
          />
          <NumField
            label="Magnesium (mg)"
            value={form.magnesium_mg}
            onChange={(v) => set('magnesium_mg', v)}
            min="0"
          />
        </div>

        {/* Alcohol toggle + ABV */}
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_alcoholic}
              onChange={(e) => set('is_alcoholic', e.target.checked)}
              className="h-4 w-4 rounded accent-[#2DA5A0]"
            />
            <span className="text-sm" style={{ color: '#c8d8f4' }}>
              Is Alcoholic
            </span>
          </label>
          {form.is_alcoholic && (
            <div className="flex-1" style={{ minWidth: '120px' }}>
              <NumField
                label="ABV (%)"
                value={form.abv}
                onChange={(v) => set('abv', v)}
                step="0.1"
                min="0"
                max="100"
              />
            </div>
          )}
        </div>

        {/* Evidence source */}
        <Field label="Evidence Source (optional)">
          <input
            type="text"
            value={form.evidence_source}
            onChange={(e) => set('evidence_source', e.target.value)}
            placeholder="e.g. Maughan 2016"
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        {/* Requires claim review */}
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={form.requires_claim_review}
            onChange={(e) => set('requires_claim_review', e.target.checked)}
            className="h-4 w-4 rounded accent-[#2DA5A0]"
          />
          <span className="text-sm" style={{ color: '#c8d8f4' }}>
            Requires Claim Review
          </span>
        </label>

        {/* Sort order + Active toggle */}
        <div className="grid grid-cols-2 gap-4">
          <NumField
            label="Sort Order"
            value={form.sort_order}
            onChange={(v) => set('sort_order', v)}
          />
          <Field label="Status">
            <div className="flex items-center gap-2 py-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set('is_active', e.target.checked)}
                  className="h-4 w-4 rounded accent-[#2DA5A0]"
                />
                <span className="text-sm" style={{ color: '#c8d8f4' }}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>
          </Field>
        </div>

        {/* API error */}
        {apiError && (
          <div
            className="flex items-start gap-2 rounded-lg border p-3"
            style={{ background: 'rgba(183,94,24,0.10)', borderColor: '#B75E18', color: '#f5c09a' }}
          >
            <AlertCircle strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">{apiError}</p>
          </div>
        )}

        {/* Compliance note (non-blocking) */}
        {complianceNote && (
          <div
            className="flex items-start gap-2 rounded-lg border p-3"
            style={{
              background: 'rgba(45,165,160,0.08)',
              borderColor: '#2DA5A0',
              color: '#a8e0de',
            }}
          >
            <Info strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#2DA5A0' }} />
            <p className="text-sm">{complianceNote}</p>
          </div>
        )}

        {/* Requires claim review warning banner */}
        {form.requires_claim_review && !complianceNote && (
          <div
            className="flex items-start gap-2 rounded-lg border p-3"
            style={{
              background: 'rgba(183,94,24,0.08)',
              borderColor: '#B75E18',
              color: '#f5c09a',
            }}
          >
            <AlertTriangle strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">
              This beverage is flagged for claim review. After saving, {getDisplayName('kelsey')} and {getDisplayName('marshall')} will
              need to approve it before activation.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: '#2DA5A0', color: '#fff' }}
          >
            {saving ? (
              <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
            ) : (
              <Save strokeWidth={1.5} className="h-4 w-4" />
            )}
            {isEdit ? 'Save Changes' : 'Create Beverage'}
          </button>

          {/* Toggle active/inactive (edit only) */}
          {isEdit && (
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
              style={{
                borderColor: beverage.is_active ? '#B75E18' : '#2DA5A0',
                color: beverage.is_active ? '#B75E18' : '#2DA5A0',
              }}
            >
              {beverage.is_active ? 'Disable Beverage' : 'Enable Beverage'}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-white/5"
            style={{ borderColor: '#1E3054', color: '#8099cc' }}
          >
            Cancel
          </button>

          {!saving && complianceNote && (
            <span
              className="ml-auto flex items-center gap-1.5 text-xs"
              style={{ color: '#2DA5A0' }}
            >
              <Check strokeWidth={1.5} className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
