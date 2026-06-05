/**
 * Prompt 175a Part 2 (2026-06-04): supplement barcode confirmation panel.
 *
 * This is the single confirmation surface the barcode tier lands on. For
 * batch 1 (175a) there is no LNHPD or DSLD resolver yet, so the only
 * "resolved" field is the barcode value itself. Everything else (name,
 * brand, dose, frequency) starts empty and is flagged as low confidence
 * (Orange #B75E18) until the user fills it in. Nothing is written until
 * the user taps "Add to My Supplements".
 *
 * Shape contract: onConfirm receives a record that the Phase 3 page's
 * existing commitSupplement function consumes directly. No new persistence
 * path; this batch reuses the manual-entry write path. The barcode value
 * is not yet persisted (175a batch 1 is intentionally migration-free); a
 * later batch adds capture_source + upc columns and starts persisting the
 * identity.
 *
 * Brand tokens locked: Navy #1A2744, Card #1E3054, Teal #2DA5A0
 * (high-confidence accent), Orange #B75E18 (low-confidence flag).
 * Lucide React strokeWidth 1.5. Instrument Sans inherited from the parent.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Barcode, ChevronDown, CircleAlert, Loader2 } from 'lucide-react';

const ORANGE = '#B75E18';
const TEAL = '#2DA5A0';

export interface BarcodeConfirmRecord {
  name: string;
  brand: string;
  source: 'barcode';
  deliveryMethod: string;
  form: string;
  dosage: string;
  unit: string;
  frequency: string;
  reason: string;
}

export interface SupplementBarcodeConfirmProps {
  /**
   * The decoded barcode value, displayed as a chip at the top of the
   * panel. The format (EAN_13, UPC_A, EAN_8, ITF_14) is shown as a small
   * monospace badge so users can verify the read.
   */
  barcodeValue: string;
  barcodeFormat: string;
  onConfirm: (record: BarcodeConfirmRecord) => void;
  onCancel: () => void;
}

// Prompt 175g (2026-06-05): physical form of the product, distinct
// from the existing Delivery Method which is a treatment category
// (Methylated Vitamins, Liposomal, etc.). Auto-filled from the
// resolver when a source returned it.
const FORM_OPTIONS: ReadonlyArray<{ v: string; l: string }> = [
  { v: 'capsule', l: 'Capsule' },
  { v: 'tablet', l: 'Tablet' },
  { v: 'softgel', l: 'Softgel' },
  { v: 'powder', l: 'Powder' },
  { v: 'liquid', l: 'Liquid' },
  { v: 'tincture', l: 'Tincture' },
  { v: 'gummy', l: 'Gummy' },
  { v: 'lozenge', l: 'Lozenge' },
  { v: 'spray', l: 'Spray' },
];

const DELIVERY_METHODS: ReadonlyArray<{ v: string; l: string }> = [
  { v: 'standard_actives', l: 'Standard Actives' },
  { v: 'liposomal_delivery', l: 'Liposomal Delivery' },
  { v: 'micellar_delivery', l: 'Micellar Delivery' },
  { v: 'methylated_vitamins', l: 'Methylated Vitamins' },
  { v: 'minerals_cofactors', l: 'Minerals & Cofactors' },
  { v: 'amino_acids', l: 'Amino Acids' },
  { v: 'peptides', l: 'Peptides' },
  { v: 'plant_extracts_botanicals', l: 'Plant Extracts & Botanicals' },
  { v: 'enzymes_probiotics', l: 'Enzymes & Probiotics' },
  { v: 'specialty_compounds', l: 'Specialty Compounds' },
];

const UNITS = ['mg', 'mcg', 'g', 'IU', 'CFU', 'ml'] as const;

const FREQUENCIES: ReadonlyArray<{ v: string; l: string }> = [
  { v: 'once_daily', l: 'Once daily' },
  { v: 'twice_daily', l: 'Twice daily' },
  { v: 'three_daily', l: '3x daily' },
  { v: 'weekly', l: 'Weekly' },
  { v: 'as_needed', l: 'As needed' },
];

export function SupplementBarcodeConfirm({
  barcodeValue,
  barcodeFormat,
  onConfirm,
  onCancel,
}: SupplementBarcodeConfirmProps): JSX.Element {
  const [name, setName] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<string>('');
  const [form, setForm] = useState<string>('');
  const [dosage, setDosage] = useState<string>('');
  const [unit, setUnit] = useState<string>('mg');
  const [frequency, setFrequency] = useState<string>('once_daily');
  const [reason, setReason] = useState<string>('');

  // Prompt 175g (2026-06-05): per-field provenance map so the user can
  // see which source filled each pre-filled field. Empty when the
  // resolver returned identity_only or while the resolve fetch is in
  // flight.
  const [fieldSources, setFieldSources] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState<boolean>(true);
  const [resolveStatus, setResolveStatus] = useState<'ok' | 'identity_only' | 'not_found' | null>(null);
  const [resolveSource, setResolveSource] = useState<string | null>(null);

  // Prompt 175g (2026-06-05): fetch /api/caq/supplements/resolve on
  // mount so the panel pre-fills name + brand + form + dosage before
  // the user types anything. The resolver cascades: canonical first,
  // then DSLD, then OpenFoodFacts, then peptides. Identity-only
  // surfaces the OCR fallback prominently per Section 2.4.
  useEffect(() => {
    let cancelled = false;
    setResolving(true);
    setResolveStatus(null);
    setResolveSource(null);
    fetch('/api/caq/supplements/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: barcodeValue }),
    })
      .then((r) => r.json())
      .then((json: { status: string; source?: string; draft?: Record<string, unknown> }) => {
        if (cancelled) return;
        setResolveStatus(json.status === 'ok' || json.status === 'identity_only' || json.status === 'not_found' ? json.status : 'not_found');
        setResolveSource(json.source ?? null);
        if (json.status === 'ok' && json.draft) {
          const d = json.draft;
          const dProductName = typeof d.product_name === 'string' ? d.product_name : '';
          const dBrand = typeof d.brand === 'string' ? d.brand : '';
          const dForm = typeof d.form === 'string' ? d.form : '';
          const dStrength = typeof d.primary_strength === 'string' ? d.primary_strength : '';
          const dSources = (d.field_sources && typeof d.field_sources === 'object')
            ? d.field_sources as Record<string, string>
            : {};
          if (dProductName) setName(dProductName);
          if (dBrand) setBrand(dBrand);
          if (dForm) setForm(dForm);
          if (dStrength) {
            // primary_strength is "<amount> <unit>"; split for the
            // existing dosage + unit fields.
            const match = dStrength.match(/^([\d.]+)\s*([A-Za-z]+)/);
            if (match) {
              setDosage(match[1]);
              setUnit(match[2]);
            }
          }
          setFieldSources(dSources);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setResolveStatus('not_found');
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => { cancelled = true; };
  }, [barcodeValue]);

  const isComplete = useMemo(
    () => name.trim().length > 0 && deliveryMethod !== '' && dosage !== '' && Number(dosage) > 0 && frequency !== '',
    [name, deliveryMethod, dosage, frequency],
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-5 mb-3">
      {/* Barcode chip with resolve status (175g). While resolving, show
          a small spinner. On success, show source badge in Teal. On
          identity_only or not_found, surface the orange "confirm by
          hand" badge as before. */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/30">Scanned barcode</p>
          {resolving ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(45, 165, 160, 0.12)', color: TEAL }}
            >
              <Loader2 size={11} strokeWidth={1.5} aria-hidden="true" className="animate-spin" />
              Looking up product...
            </span>
          ) : resolveStatus === 'ok' ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(45, 165, 160, 0.12)', color: TEAL }}
            >
              Found via {resolveSource ?? 'catalog'}
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(183, 94, 24, 0.12)', color: ORANGE }}
            >
              <CircleAlert size={11} strokeWidth={1.5} aria-hidden="true" />
              Identity only, please confirm
            </span>
          )}
        </div>
        <div
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: resolveStatus === 'ok' ? 'rgba(45, 165, 160, 0.08)' : 'rgba(183, 94, 24, 0.08)',
            border: `1px solid ${resolveStatus === 'ok' ? 'rgba(45, 165, 160, 0.3)' : 'rgba(183, 94, 24, 0.3)'}`,
          }}
        >
          <Barcode
            size={18}
            strokeWidth={1.5}
            aria-hidden="true"
            style={{ color: resolveStatus === 'ok' ? TEAL : ORANGE }}
          />
          <span className="font-mono text-sm text-white">{barcodeValue}</span>
          <span className="text-[10px] text-white/40 uppercase tracking-wider">{barcodeFormat.replace('_', '-')}</span>
        </div>
      </div>

      {/* Product Name + Brand */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">
            Product name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            placeholder="e.g., Alpha GPC"
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none transition-all text-sm"
            required
          />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">
            Brand <span className="text-white/15">(optional)</span>
          </label>
          <input
            type="text"
            value={brand}
            placeholder="e.g., Vibrant Naturals"
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Delivery Method + Dose */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">
            Delivery Method <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <select
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none transition-all [&>option]:bg-[#1E2D4A] [&>option]:text-white text-sm"
              required
            >
              <option value="" disabled>Select method...</option>
              {DELIVERY_METHODS.map((m) => (
                <option key={m.v} value={m.v}>{m.l}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" strokeWidth={1.5} />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 mb-1.5 block">
            Dosage <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={dosage}
              placeholder="600"
              min={0}
              step="any"
              onChange={(e) => setDosage(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none transition-all text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              required
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-20 px-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center appearance-none cursor-pointer focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none transition-all text-sm [&>option]:bg-[#1E2D4A] [&>option]:text-white"
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Prompt 175g (2026-06-05): physical Form select, distinct from
          Delivery Method (treatment category). Auto-fills from the
          resolver. Optional; users can leave it blank if the bottle
          does not match the listed forms. */}
      <div>
        <label className="text-xs text-white/40 mb-1.5 block">
          Form <span className="text-white/15">(optional)</span>
          {fieldSources.form ? (
            <span className="ml-2 text-[10px]" style={{ color: TEAL }}>via {fieldSources.form}</span>
          ) : null}
        </label>
        <div className="relative">
          <select
            value={form}
            onChange={(e) => setForm(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none transition-all [&>option]:bg-[#1E2D4A] [&>option]:text-white text-sm"
          >
            <option value="">Select form...</option>
            {FORM_OPTIONS.map((f) => (
              <option key={f.v} value={f.v}>{f.l}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" strokeWidth={1.5} />
        </div>
      </div>

      {/* Frequency */}
      <div>
        <label className="text-xs text-white/40 mb-2 block">
          How often? <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {FREQUENCIES.map((freq) => (
            <button
              key={freq.v}
              type="button"
              onClick={() => setFrequency(freq.v)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                frequency === freq.v
                  ? 'bg-teal-400/15 border border-teal-400/40 text-teal-400'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:border-white/20'
              }`}
            >
              {freq.l}
            </button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="text-xs text-white/30 mb-1.5 block">
          Why do you take this? <span className="text-white/15">(optional)</span>
        </label>
        <input
          type="text"
          value={reason}
          placeholder="e.g., for energy, doctor recommended, sleep support..."
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white/70 placeholder:text-white/20 focus:border-teal-400/30 focus:ring-1 focus:ring-teal-400/20 focus:outline-none transition-all"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={!isComplete}
          onClick={() => {
            // Prompt 175l (2026-06-05): fire-and-forget POST to
            // /api/caq/supplements/canonical-ingest so the confirmed
            // product upserts into supplement_reference_canonical.
            // PHI-free: product catalog fields only. Idempotent on the
            // server via ON CONFLICT (identity_key).
            try {
              const isNumericRetailUpc = /^\d{8,14}$/.test(barcodeValue);
              // Prompt 175g (2026-06-05): pass the physical form (175g
              // new field) AND the per-field provenance map captured
              // from /resolve so upstream readers can see which source
              // contributed each value.
              fetch('/api/caq/supplements/canonical-ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  upc: isNumericRetailUpc ? barcodeValue : null,
                  brand: brand.trim() || null,
                  productName: name.trim(),
                  primaryStrength: dosage && unit ? `${dosage} ${unit}` : null,
                  form: form || null,
                  structuredIngredients: [{
                    name: name.trim(),
                    amount: Number(dosage),
                    unit,
                    form: form || null,
                    source: 'user_scan',
                  }],
                  source: 'user_scan',
                  fieldSources: {
                    ...fieldSources,
                    // Any fields the user typed override the resolver
                    // provenance with 'manual'.
                    product_name: name !== '' && !fieldSources.product_name ? 'manual' : (fieldSources.product_name ?? 'manual'),
                    brand: brand !== '' && !fieldSources.brand ? 'manual' : (fieldSources.brand ?? 'manual'),
                    form: form !== '' && !fieldSources.form ? 'manual' : (fieldSources.form ?? 'manual'),
                  },
                }),
                keepalive: true,
              }).catch(() => undefined);
            } catch {
              // Best effort.
            }
            onConfirm({
              name: name.trim(),
              brand: brand.trim(),
              source: 'barcode',
              deliveryMethod,
              form,
              dosage,
              unit,
              frequency,
              reason: reason.trim(),
            });
          }}
          className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
            isComplete
              ? 'bg-teal-400/15 border border-teal-400/40 text-teal-400 hover:bg-teal-400/20 cursor-pointer'
              : 'bg-white/[0.02] border border-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {isComplete ? 'Add to My Supplements' : 'Enter name, delivery method and dosage to add'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="py-3 px-6 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:text-white/70 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
