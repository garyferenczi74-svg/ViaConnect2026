'use client';

// Prompt #96 Phase 3: Brand setup wizard client.
//
// Single-page stepped wizard. We deliberately avoid a separate route per
// step so the practitioner can navigate freely back and forth without
// losing partially-entered data. The form state is local; submit on the
// final step does a single POST (or PATCH on a follow-up edit).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Save,
} from 'lucide-react';

interface BrandFields {
  brand_name: string;
  brand_tagline: string;
  brand_description: string;
  primary_color_hex: string;
  secondary_color_hex: string;
  accent_color_hex: string;
  background_color_hex: string;
  text_color_hex: string;
  brand_font_primary: string;
  brand_font_secondary: string;
  practice_legal_name: string;
  practice_address_line_1: string;
  practice_address_line_2: string;
  practice_city: string;
  practice_state: string;
  practice_postal_code: string;
  practice_country: string;
  practice_phone: string;
  practice_email: string;
  practice_website: string;
  product_naming_scheme: 'viacura_name' | 'practice_prefix_plus_viacura' | 'fully_custom';
  practice_prefix: string;
}

const EMPTY: BrandFields = {
  brand_name: '', brand_tagline: '', brand_description: '',
  primary_color_hex: '#1a3b6e', secondary_color_hex: '#c69447',
  accent_color_hex: '', background_color_hex: '#FFFFFF', text_color_hex: '#000000',
  brand_font_primary: 'Instrument Sans', brand_font_secondary: '',
  practice_legal_name: '', practice_address_line_1: '', practice_address_line_2: '',
  practice_city: '', practice_state: '', practice_postal_code: '',
  practice_country: 'US', practice_phone: '', practice_email: '', practice_website: '',
  product_naming_scheme: 'viacura_name', practice_prefix: '',
};

type StepId = 'identity' | 'visual' | 'palette' | 'typography' | 'contact' | 'naming' | 'review';

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'identity',   label: 'Brand identity' },
  { id: 'visual',     label: 'Visual assets' },
  { id: 'palette',    label: 'Color palette' },
  { id: 'typography', label: 'Typography' },
  { id: 'contact',    label: 'Practice contact' },
  { id: 'naming',     label: 'Product naming' },
  { id: 'review',     label: 'Review and submit' },
];

const FONT_CHOICES = ['Instrument Sans', 'Playfair Display', 'Inter', 'Work Sans', 'Lora', 'Source Sans Pro'];

interface ValidationError { field: string; message: string }

export default function BrandSetupClient() {
  const [fields, setFields] = useState<BrandFields>(EMPTY);
  const [stepIdx, setStepIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/practitioner/white-label/brand');
        const json = await r.json();
        if (json.brand) {
          setExistingId(json.brand.id);
          setFields((prev) => ({
            ...prev,
            ...Object.fromEntries(
              Object.entries(json.brand).filter(([k, v]) => k in prev && v != null),
            ),
          }) as BrandFields);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const step = STEPS[stepIdx];

  function update<K extends keyof BrandFields>(key: K, value: BrandFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setErrors([]);
    setGlobalError(null);
    try {
      const r = await fetch('/api/practitioner/white-label/brand', {
        method: existingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fields,
          accent_color_hex: fields.accent_color_hex || null,
          practice_prefix: fields.practice_prefix || null,
        }),
      });
      const json = await r.json();
      if (!r.ok) {
        if (Array.isArray(json.errors)) setErrors(json.errors);
        setGlobalError(json.error ?? `HTTP ${r.status}`);
        return;
      }
      setExistingId(json.brand?.id ?? null);
      setSubmittedAt(new Date().toISOString());
    } catch (e) {
      setGlobalError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const errorByField = useMemo(() => Object.fromEntries(errors.map((e) => [e.field, e.message])), [errors]);
  const canSubmit = step.id === 'review';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white p-8">
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-8 md:px-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <Link href="/practitioner/white-label/enroll" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Enrollment
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">Brand setup</h1>
          <p className="text-sm text-gray-400 mt-1">
            One-time configuration. Used by every label you produce.
          </p>
        </header>

        <Stepper steps={STEPS} active={stepIdx} onJump={(i) => setStepIdx(i)} />

        {globalError && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {globalError}
          </div>
        )}

        <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          {step.id === 'identity' && (
            <>
              <Field label="Brand name" required error={errorByField.brand_name}>
                <input className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.brand_name} onChange={(e) => update('brand_name', e.target.value)} />
              </Field>
              <Field label="Brand tagline (optional)">
                <input className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.brand_tagline} onChange={(e) => update('brand_tagline', e.target.value)} />
              </Field>
              <Field label="Brand description (optional)">
                <textarea rows={3} maxLength={500}
                  className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.brand_description} onChange={(e) => update('brand_description', e.target.value)} />
              </Field>
            </>
          )}

          {step.id === 'visual' && (
            <p className="text-sm text-gray-300">
              Logo upload arrives in Phase 3 final polish. For now, configure colors and typography; you will be able to upload a logo before submitting your first label for compliance review.
            </p>
          )}

          {step.id === 'palette' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorField label="Primary"     value={fields.primary_color_hex}
                onChange={(v) => update('primary_color_hex', v)} error={errorByField.primary_color_hex} />
              <ColorField label="Secondary"   value={fields.secondary_color_hex}
                onChange={(v) => update('secondary_color_hex', v)} error={errorByField.secondary_color_hex} />
              <ColorField label="Accent (optional)" value={fields.accent_color_hex}
                onChange={(v) => update('accent_color_hex', v)} error={errorByField.accent_color_hex} />
              <ColorField label="Background"  value={fields.background_color_hex}
                onChange={(v) => update('background_color_hex', v)} error={errorByField.background_color_hex} />
              <ColorField label="Text"        value={fields.text_color_hex}
                onChange={(v) => update('text_color_hex', v)} error={errorByField.text_color_hex} />
            </div>
          )}

          {step.id === 'typography' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Primary font">
                <select className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.brand_font_primary} onChange={(e) => update('brand_font_primary', e.target.value)}>
                  {FONT_CHOICES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Secondary font (optional)">
                <select className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.brand_font_secondary} onChange={(e) => update('brand_font_secondary', e.target.value)}>
                  <option value="">(none)</option>
                  {FONT_CHOICES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
            </div>
          )}

          {step.id === 'contact' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Practice legal name" required error={errorByField.practice_legal_name}>
                <input className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.practice_legal_name} onChange={(e) => update('practice_legal_name', e.target.value)} />
              </Field>
              <Field label="Address line 1" required error={errorByField.practice_address_line_1}>
                <input className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.practice_address_line_1} onChange={(e) => update('practice_address_line_1', e.target.value)} />
              </Field>
              <Field label="Address line 2 (optional)">
                <input className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.practice_address_line_2} onChange={(e) => update('practice_address_line_2', e.target.value)} />
              </Field>
              <Field label="City" required error={errorByField.practice_city}>
                <input className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.practice_city} onChange={(e) => update('practice_city', e.target.value)} />
              </Field>
              <Field label="State" required error={errorByField.practice_state}>
                <input className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.practice_state} onChange={(e) => update('practice_state', e.target.value)} />
              </Field>
              <Field label="Postal code" required error={errorByField.practice_postal_code}>
                <input className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.practice_postal_code} onChange={(e) => update('practice_postal_code', e.target.value)} />
              </Field>
              <Field label="Phone" required error={errorByField.practice_phone}>
                <input className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.practice_phone} onChange={(e) => update('practice_phone', e.target.value)} />
              </Field>
              <Field label="Email" required error={errorByField.practice_email}>
                <input type="email" className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.practice_email} onChange={(e) => update('practice_email', e.target.value)} />
              </Field>
              <Field label="Website (optional)">
                <input className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.practice_website} onChange={(e) => update('practice_website', e.target.value)} />
              </Field>
            </div>
          )}

          {step.id === 'naming' && (
            <>
              <Field label="Naming scheme" required>
                <select className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                  value={fields.product_naming_scheme}
                  onChange={(e) => update('product_naming_scheme', e.target.value as BrandFields['product_naming_scheme'])}>
                  <option value="viacura_name">Use the ViaCura product name (e.g., NAD+)</option>
                  <option value="practice_prefix_plus_viacura">Practice prefix + ViaCura name (e.g., Dr. Smith NAD+)</option>
                  <option value="fully_custom">Fully custom per product (set on each label)</option>
                </select>
              </Field>
              {fields.product_naming_scheme === 'practice_prefix_plus_viacura' && (
                <Field label="Practice prefix" required error={errorByField.practice_prefix}>
                  <input className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm"
                    placeholder="Dr. Smith"
                    value={fields.practice_prefix} onChange={(e) => update('practice_prefix', e.target.value)} />
                </Field>
              )}
            </>
          )}

          {step.id === 'review' && (
            <div className="space-y-4 text-sm">
              <p className="text-gray-300">
                Review your brand and submit. After submission your brand enters admin review; it must be approved before you can submit any label for compliance review.
              </p>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="font-semibold mb-1">{fields.brand_name || 'Brand name not set'}</p>
                <p className="text-xs text-gray-400">{fields.brand_tagline || 'No tagline'}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400">Practice</p>
                    <p>{fields.practice_legal_name}</p>
                    <p>{fields.practice_address_line_1}</p>
                    <p>{fields.practice_city}, {fields.practice_state} {fields.practice_postal_code}</p>
                    <p>{fields.practice_phone}</p>
                    <p>{fields.practice_email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Palette</p>
                    <div className="flex gap-2 mt-1">
                      <Swatch hex={fields.primary_color_hex} />
                      <Swatch hex={fields.secondary_color_hex} />
                      {fields.accent_color_hex && <Swatch hex={fields.accent_color_hex} />}
                      <Swatch hex={fields.background_color_hex} border />
                      <Swatch hex={fields.text_color_hex} />
                    </div>
                    <p className="text-gray-400 mt-3">Naming scheme</p>
                    <p>{fields.product_naming_scheme.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </div>
              {submittedAt && (
                <div className="rounded-lg border border-portal-green/30 bg-portal-green/10 p-3 text-sm text-portal-green inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} /> Saved {new Date(submittedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <button
            disabled={stepIdx === 0}
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            className="text-sm px-3 py-2 rounded border border-white/10 text-gray-300 disabled:opacity-30 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
          </button>

          <div className="flex gap-2">
            {!canSubmit && (
              <button
                onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}
                className="text-sm px-4 py-2 rounded bg-copper hover:bg-amber-600 text-white inline-flex items-center gap-1"
              >
                Next <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
            {canSubmit && (
              <button
                disabled={saving}
                onClick={save}
                className="text-sm px-4 py-2 rounded bg-copper hover:bg-amber-600 text-white inline-flex items-center gap-1 disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Save className="w-3.5 h-3.5" strokeWidth={1.5} />}
                {existingId ? 'Update brand' : 'Save brand'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function Stepper({ steps, active, onJump }: { steps: typeof STEPS; active: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex flex-wrap gap-1 text-xs">
      {steps.map((s, i) => (
        <li key={s.id}>
          <button
            onClick={() => onJump(i)}
            className={`px-2 py-1 rounded ${
              i === active
                ? 'bg-copper text-white'
                : i < active
                  ? 'bg-portal-green/20 text-portal-green'
                  : 'bg-white/[0.04] text-gray-400 hover:text-white'
            }`}
          >
            {i + 1}. {s.label}
          </button>
        </li>
      ))}
    </ol>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-400 mb-1">
        {label}{required && <span className="text-rose-300"> *</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-300 mt-1">{error}</p>}
    </div>
  );
}

function ColorField({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field label={label} error={error}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border border-white/10 bg-transparent" />
        <input type="text" value={value} placeholder="#000000"
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm font-mono" />
      </div>
    </Field>
  );
}

function Swatch({ hex, border }: { hex: string; border?: boolean }) {
  return (
    <span
      title={hex}
      className={`inline-block w-6 h-6 rounded ${border ? 'border border-white/20' : ''}`}
      style={{ backgroundColor: hex }}
    />
  );
}
