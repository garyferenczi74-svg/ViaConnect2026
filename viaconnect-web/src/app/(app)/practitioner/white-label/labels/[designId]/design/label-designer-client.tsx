'use client';

// Prompt #96 Phase 3: Label designer client.
//
// Three-pane layout:
//   left   layout selector + editable text fields + claims
//   center live SVG preview (front + back)
//   right  required-elements checklist + advisory flags
//
// Saves PATCH the design row; submit-for-review flips status to
// ready_for_review (Phase 4 picks it up).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { LabelPreview, type LabelPreviewBrand, type LabelPreviewDesign } from '@/components/white-label/LabelPreview';

const LAYOUTS = [
  { id: 'classic_vertical',   label: 'Classic vertical' },
  { id: 'modern_horizontal',  label: 'Modern horizontal' },
  { id: 'premium_wrap',       label: 'Premium wrap' },
  { id: 'clinical_minimal',   label: 'Clinical minimal' },
] as const;

interface DesignRow {
  id: string;
  display_product_name: string;
  short_description: string | null;
  long_description: string | null;
  tagline: string | null;
  layout_template: typeof LAYOUTS[number]['id'];
  structure_function_claims: string[];
  usage_directions: string | null;
  warning_text: string | null;
  manufacturer_line: string;
  supplement_facts_panel_data: any;
  allergen_statement: string | null;
  other_ingredients: string | null;
  status: string;
  version_number: number;
}

interface BrandRow {
  brand_name: string;
  primary_color_hex: string | null;
  secondary_color_hex: string | null;
  background_color_hex: string | null;
  text_color_hex: string | null;
  brand_font_primary: string | null;
  practice_legal_name: string;
  practice_city: string;
  practice_state: string;
  brand_config_approved: boolean;
}

export default function LabelDesignerClient({ designId }: { designId: string }) {
  const [design, setDesign] = useState<DesignRow | null>(null);
  const [brand, setBrand] = useState<BrandRow | null>(null);
  const [product, setProduct] = useState<{ name: string; sku: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advisoryFlags, setAdvisoryFlags] = useState<string[]>([]);
  const [claimText, setClaimText] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/practitioner/white-label/labels/${designId}`);
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        setDesign(json.design);
        setBrand(json.brand);
        setProduct(json.product);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [designId]);

  function update<K extends keyof DesignRow>(key: K, value: DesignRow[K]) {
    setDesign((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save(nextStatus?: string) {
    if (!design) return;
    nextStatus ? setSubmitting(true) : setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/practitioner/white-label/labels/${designId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_product_name: design.display_product_name,
          short_description: design.short_description,
          long_description: design.long_description,
          tagline: design.tagline,
          layout_template: design.layout_template,
          structure_function_claims: design.structure_function_claims,
          usage_directions: design.usage_directions,
          warning_text: design.warning_text,
          allergen_statement: design.allergen_statement,
          other_ingredients: design.other_ingredients,
          ...(nextStatus ? { status: nextStatus } : {}),
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setDesign(json.design);
      setAdvisoryFlags(json.advisory_flags ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      nextStatus ? setSubmitting(false) : setSaving(false);
    }
  }

  function addClaim() {
    if (!design || !claimText.trim()) return;
    update('structure_function_claims', [...design.structure_function_claims, claimText.trim()]);
    setClaimText('');
  }
  function removeClaim(i: number) {
    if (!design) return;
    update('structure_function_claims', design.structure_function_claims.filter((_, idx) => idx !== i));
  }

  const previewBrand: LabelPreviewBrand | null = useMemo(() =>
    brand ? {
      brand_name: brand.brand_name,
      primary_color_hex: brand.primary_color_hex,
      secondary_color_hex: brand.secondary_color_hex,
      background_color_hex: brand.background_color_hex,
      text_color_hex: brand.text_color_hex,
      brand_font_primary: brand.brand_font_primary,
      practice_legal_name: brand.practice_legal_name,
      practice_city: brand.practice_city,
      practice_state: brand.practice_state,
    } : null,
  [brand]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white p-8">
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      </div>
    );
  }
  if (!design || !brand || !previewBrand) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white p-8 text-sm text-rose-300">
        {error ?? 'Design not found.'}
      </div>
    );
  }

  const cannotEdit = !['draft', 'revision_requested'].includes(design.status);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-4">
        <Link href="/practitioner/white-label/enroll" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> White-label
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <p className="text-xs text-gray-400">{product?.name} ({product?.sku}) ; v{design.version_number}</p>
            <h1 className="text-xl md:text-2xl font-bold">{design.display_product_name}</h1>
          </div>
          <div className="flex gap-2">
            <button
              disabled={saving || submitting || cannotEdit}
              onClick={() => save()}
              className="text-sm px-3 py-2 rounded border border-white/10 hover:bg-white/[0.06] inline-flex items-center gap-1 disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Save className="w-3.5 h-3.5" strokeWidth={1.5} />}
              Save draft
            </button>
            <button
              disabled={saving || submitting || cannotEdit || !brand.brand_config_approved}
              onClick={() => save('ready_for_review')}
              title={!brand.brand_config_approved ? 'Brand must be admin-approved first' : ''}
              className="text-sm px-3 py-2 rounded bg-copper hover:bg-amber-600 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Send className="w-3.5 h-3.5" strokeWidth={1.5} />}
              Submit for review
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {!brand.brand_config_approved && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          Brand awaits admin approval. You can edit the design but cannot submit for compliance review until the brand is approved.
        </div>
      )}

      {cannotEdit && (
        <div className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-300 inline-flex items-center gap-2">
          <Lock className="w-4 h-4" strokeWidth={1.5} /> This design is locked while in status {design.status}.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: editor */}
        <section className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Layout</p>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  disabled={cannotEdit}
                  onClick={() => update('layout_template', l.id)}
                  className={`text-xs px-2 py-1.5 rounded border ${
                    design.layout_template === l.id
                      ? 'border-copper text-copper bg-copper/10'
                      : 'border-white/10 text-gray-300 hover:text-white'
                  } disabled:opacity-40`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Display product name">
            <input disabled={cannotEdit}
              className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
              value={design.display_product_name} onChange={(e) => update('display_product_name', e.target.value)} />
          </Field>

          <Field label="Tagline (optional, front panel)">
            <input disabled={cannotEdit} maxLength={60}
              className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
              value={design.tagline ?? ''} onChange={(e) => update('tagline', e.target.value)} />
          </Field>

          <Field label="Short description (front panel, 5 to 15 words)">
            <input disabled={cannotEdit} maxLength={120}
              className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
              value={design.short_description ?? ''} onChange={(e) => update('short_description', e.target.value)} />
          </Field>

          <Field label="Usage directions">
            <textarea disabled={cannotEdit} rows={3}
              className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
              value={design.usage_directions ?? ''} onChange={(e) => update('usage_directions', e.target.value)} />
          </Field>

          <Field label="Allergen statement">
            <input disabled={cannotEdit}
              className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
              value={design.allergen_statement ?? ''} onChange={(e) => update('allergen_statement', e.target.value)} />
          </Field>

          <Field label="Other ingredients">
            <input disabled={cannotEdit}
              className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
              value={design.other_ingredients ?? ''} onChange={(e) => update('other_ingredients', e.target.value)} />
          </Field>

          <Field label="Warnings (additional)">
            <textarea disabled={cannotEdit} rows={2}
              className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
              value={design.warning_text ?? ''} onChange={(e) => update('warning_text', e.target.value)} />
          </Field>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Structure / function claims</p>
            <p className="text-xs text-gray-500 mb-2">Each claim triggers medical-director review when you submit.</p>
            <ul className="space-y-1 mb-2">
              {design.structure_function_claims.map((c, i) => (
                <li key={i} className="flex items-center justify-between text-sm bg-white/[0.04] rounded px-2 py-1">
                  <span>{c}</span>
                  <button disabled={cannotEdit} onClick={() => removeClaim(i)} className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-40">remove</button>
                </li>
              ))}
              {design.structure_function_claims.length === 0 && (
                <li className="text-xs text-gray-500 italic">No claims; medical review not required.</li>
              )}
            </ul>
            <div className="flex gap-2">
              <input
                disabled={cannotEdit}
                value={claimText}
                onChange={(e) => setClaimText(e.target.value)}
                placeholder="Supports cellular energy"
                className="flex-1 bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-sm disabled:opacity-50"
              />
              <button
                disabled={cannotEdit || !claimText.trim()}
                onClick={addClaim}
                className="text-xs px-2 py-1 rounded border border-white/10 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        </section>

        {/* Center: preview */}
        <section className="lg:col-span-1">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Preview</p>
          <LabelPreview brand={previewBrand} design={design as unknown as LabelPreviewDesign} />
        </section>

        {/* Right: required + advisory */}
        <section className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Required elements (system-populated)</p>
            <ul className="space-y-2 text-sm">
              <RequiredItem ok={!!design.display_product_name} label="Statement of identity" />
              <RequiredItem ok={!!design.supplement_facts_panel_data?.net_quantity} label="Net quantity" />
              <RequiredItem ok={design.manufacturer_line === 'Manufactured by FarmCeutica Wellness LLC, Buffalo NY'} label="Manufacturer of record" />
              <RequiredItem
                ok={Array.isArray(design.supplement_facts_panel_data?.ingredients) && design.supplement_facts_panel_data.ingredients.length > 0}
                label="Supplement facts panel"
              />
              <RequiredItem ok={!!design.other_ingredients} label="Other ingredients" />
              <RequiredItem ok={!!design.allergen_statement} label="Allergen statement" />
            </ul>
            <p className="text-xs text-gray-500 mt-3 inline-flex items-center gap-1">
              <Lock className="w-3 h-3" strokeWidth={1.5} /> Manufacturer line is non-editable.
            </p>
          </div>

          {advisoryFlags.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-xs uppercase tracking-wider text-amber-300 mb-2 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" strokeWidth={1.5} /> Advisory
              </p>
              <ul className="text-sm text-amber-200 space-y-1">
                {advisoryFlags.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function RequiredItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-portal-green shrink-0" strokeWidth={1.5} />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" strokeWidth={1.5} />
      )}
      <span className={ok ? 'text-gray-300' : 'text-rose-300'}>{label}</span>
    </li>
  );
}
