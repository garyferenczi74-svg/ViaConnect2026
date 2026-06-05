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

import { useMemo, useState } from 'react';
import { Barcode, ChevronDown, CircleAlert } from 'lucide-react';

const ORANGE = '#B75E18';

export interface BarcodeConfirmRecord {
  name: string;
  brand: string;
  source: 'barcode';
  deliveryMethod: string;
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
  const [dosage, setDosage] = useState<string>('');
  const [unit, setUnit] = useState<string>('mg');
  const [frequency, setFrequency] = useState<string>('once_daily');
  const [reason, setReason] = useState<string>('');

  const isComplete = useMemo(
    () => name.trim().length > 0 && deliveryMethod !== '' && dosage !== '' && Number(dosage) > 0 && frequency !== '',
    [name, deliveryMethod, dosage, frequency],
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-5 mb-3">
      {/* Barcode chip, low-confidence Orange flag */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/30">Scanned barcode</p>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(183, 94, 24, 0.12)', color: ORANGE }}
          >
            <CircleAlert size={11} strokeWidth={1.5} aria-hidden="true" />
            Identity only, please confirm
          </span>
        </div>
        <div
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'rgba(183, 94, 24, 0.08)', border: `1px solid rgba(183, 94, 24, 0.3)` }}
        >
          <Barcode size={18} strokeWidth={1.5} aria-hidden="true" style={{ color: ORANGE }} />
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
              fetch('/api/caq/supplements/canonical-ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  upc: isNumericRetailUpc ? barcodeValue : null,
                  brand: brand.trim() || null,
                  productName: name.trim(),
                  primaryStrength: dosage && unit ? `${dosage} ${unit}` : null,
                  form: deliveryMethod || null,
                  structuredIngredients: [{
                    name: name.trim(),
                    amount: Number(dosage),
                    unit,
                    source: 'user_scan',
                  }],
                  source: 'user_scan',
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
