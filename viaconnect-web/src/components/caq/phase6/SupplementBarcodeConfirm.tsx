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
import { Barcode, Camera, ChevronDown, CircleAlert, Loader2 } from 'lucide-react';
import type {
  Frequency as TimingFrequency,
  TimeOfDay,
  TimingRecommendation,
} from '@/lib/caq/supplements/timing/types';

const ORANGE = '#B75E18';
const TEAL = '#2DA5A0';

export interface BarcodeConfirmRecord {
  name: string;
  brand: string;
  // Prompt 175h Section 2.3 (2026-06-05): the confirm panel now serves
  // both the barcode tier and the Photo AI tier. The source token
  // identifies which surface produced the record so downstream writers
  // can attribute capture_source correctly.
  source: 'barcode' | 'photo';
  deliveryMethod: string;
  form: string;
  dosage: string;
  unit: string;
  frequency: string;
  reason: string;
  // Prompt 175h Section 2.5 (2026-06-05): Hannah timing fields. The
  // confirm panel calls /api/caq/supplements/timing-recommend after the
  // ingredients + frequency are known and surfaces the recommendation as
  // a pre-selected chip set the user can adjust.
  time_of_day: ReadonlyArray<TimeOfDay>;
  with_food: boolean;
  timing_reason: string | null;
  timing_source: 'hannah_recommended' | 'user_set';
}

/**
 * Prompt 175h Section 2.3 (2026-06-05): initialDraft lets a non-barcode
 * tier (specifically the Photo AI path) seed the confirm panel with
 * pre-resolved values. Every field is optional; the panel keeps its own
 * defaults for anything the source did not supply.
 */
export interface SupplementConfirmInitialDraft {
  name?: string;
  brand?: string;
  deliveryMethod?: string;
  form?: string;
  dosage?: string;
  unit?: string;
  frequency?: TimingFrequency;
  /**
   * Resolved ingredient list (already normalized to name + amount + unit
   * + form). Used for the timing-recommend call so Hannah can class the
   * formulation correctly. Photo AI passes the full ingredient list it
   * read off the label; barcode tier leaves this undefined and the
   * panel synthesizes a single-ingredient stub from name + dosage.
   */
  ingredients?: ReadonlyArray<{ name: string; amount: number | null; unit: string | null; form: string | null }>;
  /**
   * Per-field provenance map carried over from the upstream resolver so
   * the panel can render the same "via <source>" microcopy as the
   * barcode flow.
   */
  fieldSources?: Record<string, string>;
}

export interface SupplementBarcodeConfirmProps {
  /**
   * The decoded barcode value, displayed as a chip at the top of the
   * panel. The format (EAN_13, UPC_A, EAN_8, ITF_14) is shown as a small
   * monospace badge so users can verify the read.
   *
   * Prompt 175h Section 2.3 (2026-06-05): when the panel is mounted from
   * the Photo AI path there is no barcode. Pass null for both and the
   * panel renders the photo chip instead.
   */
  barcodeValue: string | null;
  barcodeFormat: string | null;
  /**
   * Prompt 175h Section 2.3 (2026-06-05): identifies which tier
   * produced this confirmation. 'barcode' renders the scan resolve
   * flow; 'photo' skips the /resolve fetch and uses initialDraft.
   */
  source?: 'barcode' | 'photo';
  initialDraft?: SupplementConfirmInitialDraft;
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
  source = 'barcode',
  initialDraft,
  onConfirm,
  onCancel,
}: SupplementBarcodeConfirmProps): JSX.Element {
  const [name, setName] = useState<string>(initialDraft?.name ?? '');
  const [brand, setBrand] = useState<string>(initialDraft?.brand ?? '');
  const [deliveryMethod, setDeliveryMethod] = useState<string>(initialDraft?.deliveryMethod ?? '');
  const [form, setForm] = useState<string>(initialDraft?.form ?? '');
  const [dosage, setDosage] = useState<string>(initialDraft?.dosage ?? '');
  const [unit, setUnit] = useState<string>(initialDraft?.unit ?? 'mg');
  const [frequency, setFrequency] = useState<string>(initialDraft?.frequency ?? 'once_daily');
  const [reason, setReason] = useState<string>('');

  // Prompt 175h Section 2.5 (2026-06-05): Hannah timing state.
  const [timesSelected, setTimesSelected] = useState<ReadonlyArray<TimeOfDay>>(['morning']);
  const [withFood, setWithFood] = useState<boolean>(false);
  const [timingReason, setTimingReason] = useState<string | null>(null);
  const [timingConflicts, setTimingConflicts] = useState<ReadonlyArray<string>>([]);
  const [timingHannahTimes, setTimingHannahTimes] = useState<ReadonlyArray<TimeOfDay>>([]);
  const [timingHannahWithFood, setTimingHannahWithFood] = useState<boolean>(false);
  const [timingLoading, setTimingLoading] = useState<boolean>(false);

  // Prompt 175g (2026-06-05): per-field provenance map so the user can
  // see which source filled each pre-filled field. Empty when the
  // resolver returned identity_only or while the resolve fetch is in
  // flight.
  const [fieldSources, setFieldSources] = useState<Record<string, string>>(initialDraft?.fieldSources ?? {});
  // Prompt 175h Section 2.3 (2026-06-05): photo source skips the
  // barcode-resolve fetch because the upstream Photo AI pipeline
  // already supplied the draft.
  const [resolving, setResolving] = useState<boolean>(source === 'barcode');
  const [resolveStatus, setResolveStatus] = useState<'ok' | 'identity_only' | 'not_found' | null>(
    source === 'photo' ? 'ok' : null,
  );
  const [resolveSource, setResolveSource] = useState<string | null>(
    source === 'photo' ? 'photo_ai' : null,
  );

  // Prompt 175g (2026-06-05): fetch /api/caq/supplements/resolve on
  // mount so the panel pre-fills name + brand + form + dosage before
  // the user types anything. The resolver cascades: canonical first,
  // then DSLD, then OpenFoodFacts, then peptides. Identity-only
  // surfaces the OCR fallback prominently per Section 2.4.
  //
  // Prompt 175h Section 2.3: the photo path supplies its own draft via
  // initialDraft so we skip the barcode resolver entirely.
  useEffect(() => {
    if (source !== 'barcode' || !barcodeValue) return;
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
  }, [barcodeValue, source]);

  // Prompt 175h Section 2.5 (2026-06-05): call Hannah's timing engine
  // when the ingredient context + frequency are known. Re-runs on
  // frequency change so the user sees the morning/evening split flip
  // when they choose twice_daily. Photo path uses initialDraft.ingredients
  // for richer multi-active context; barcode path synthesizes a single
  // stub ingredient from name + dosage.
  useEffect(() => {
    const validFreqs: ReadonlyArray<string> = ['once_daily', 'twice_daily', 'three_daily', 'weekly', 'as_needed'];
    if (!validFreqs.includes(frequency)) return;
    const ingredients = initialDraft?.ingredients && initialDraft.ingredients.length > 0
      ? initialDraft.ingredients
      : (name.trim().length > 0
        ? [{ name: name.trim(), amount: Number(dosage) || null, unit, form: form || null }]
        : []);
    if (ingredients.length === 0) return;
    let cancelled = false;
    setTimingLoading(true);
    fetch('/api/caq/supplements/timing-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients, frequency }),
    })
      .then((r) => r.json())
      .then((json: TimingRecommendation | { error: string }) => {
        if (cancelled) return;
        if ('error' in json) return;
        setTimesSelected(json.times);
        setWithFood(json.with_food);
        setTimingReason(json.reason);
        setTimingConflicts(json.conflicts);
        setTimingHannahTimes(json.times);
        setTimingHannahWithFood(json.with_food);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setTimingLoading(false);
      });
    return () => { cancelled = true; };
  }, [name, dosage, unit, form, frequency, initialDraft]);

  function toggleTime(slot: TimeOfDay): void {
    setTimesSelected((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  }

  const isComplete = useMemo(
    () => name.trim().length > 0 && deliveryMethod !== '' && dosage !== '' && Number(dosage) > 0 && frequency !== '' && timesSelected.length > 0,
    [name, deliveryMethod, dosage, frequency, timesSelected],
  );

  const timingChanged = useMemo(() => {
    if (withFood !== timingHannahWithFood) return true;
    if (timesSelected.length !== timingHannahTimes.length) return true;
    const sorted = [...timesSelected].sort().join(',');
    const hannahSorted = [...timingHannahTimes].sort().join(',');
    return sorted !== hannahSorted;
  }, [timesSelected, withFood, timingHannahTimes, timingHannahWithFood]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-5 mb-3">
      {/* Source chip (175g for barcode, 175h for photo). Barcode shows
          the decoded value + resolve status; photo shows a "Read from
          photo" chip with the Camera icon. Both surfaces share the
          same status badge slot so Hannah's downstream UI stays
          consistent regardless of how the user arrived. */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/30">
            {source === 'photo' ? 'Read from photo' : 'Scanned barcode'}
          </p>
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
              {source === 'photo' ? 'Read by Photo AI' : `Found via ${resolveSource ?? 'catalog'}`}
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
        {source === 'barcode' && barcodeValue ? (
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
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              {barcodeFormat ? barcodeFormat.replace('_', '-') : ''}
            </span>
          </div>
        ) : (
          <div
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'rgba(45, 165, 160, 0.08)',
              border: '1px solid rgba(45, 165, 160, 0.3)',
            }}
          >
            <Camera size={18} strokeWidth={1.5} aria-hidden="true" style={{ color: TEAL }} />
            <span className="text-sm text-white">Photo label</span>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">vision</span>
          </div>
        )}
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

      {/* Prompt 175h Section 2.5 (2026-06-05): Hannah timing selector.
          Pre-selected from /api/caq/supplements/timing-recommend; user
          can adjust either time slots or with_food. When the user
          touches anything timing_source flips from 'hannah_recommended'
          to 'user_set'. Conflicts (iron + calcium etc.) render in
          Orange below. */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-white/40">
            When? <span className="text-red-400">*</span>
            {!timingChanged && timingHannahTimes.length > 0 ? (
              <span className="ml-2 text-[10px]" style={{ color: TEAL }}>via Hannah</span>
            ) : null}
          </label>
          {timingLoading ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium"
              style={{ color: TEAL }}
            >
              <Loader2 size={11} strokeWidth={1.5} aria-hidden="true" className="animate-spin" />
              Hannah is checking...
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['morning', 'afternoon', 'evening'] as const).map((slot) => {
            const selected = timesSelected.includes(slot);
            const labelMap = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' } as const;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleTime(slot)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selected
                    ? 'bg-teal-400/15 border border-teal-400/40 text-teal-400'
                    : 'bg-white/5 border border-white/10 text-white/50 hover:border-white/20'
                }`}
              >
                {labelMap[slot]}
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-white/60 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={withFood}
            onChange={(e) => setWithFood(e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-teal-400 focus:ring-teal-400/30"
          />
          <span>Take with food</span>
        </label>
        {timingReason ? (
          <p className="mt-2 text-xs text-white/45 leading-snug">{timingReason}</p>
        ) : null}
        {timingConflicts.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {timingConflicts.map((c) => (
              <li
                key={c}
                className="text-xs flex items-start gap-1.5"
                style={{ color: ORANGE }}
              >
                <CircleAlert size={12} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        ) : null}
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
            //
            // Prompt 175h Section 2.3: photo source still ingests so
            // canonical-match gets seeded; upc is null because there is
            // no scanned barcode in this path. The structuredIngredients
            // come from initialDraft.ingredients when supplied so the
            // canonical record captures the full multi-active formula.
            try {
              const isNumericRetailUpc = source === 'barcode' && barcodeValue
                ? /^\d{8,14}$/.test(barcodeValue)
                : false;
              const ingestStructured = initialDraft?.ingredients && initialDraft.ingredients.length > 0
                ? initialDraft.ingredients.map((i) => ({
                    name: i.name,
                    amount: i.amount,
                    unit: i.unit,
                    form: i.form,
                    source: source === 'photo' ? 'photo_ai' : 'user_scan',
                  }))
                : [{
                    name: name.trim(),
                    amount: Number(dosage),
                    unit,
                    form: form || null,
                    source: source === 'photo' ? 'photo_ai' : 'user_scan',
                  }];
              fetch('/api/caq/supplements/canonical-ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  upc: isNumericRetailUpc ? barcodeValue : null,
                  brand: brand.trim() || null,
                  productName: name.trim(),
                  primaryStrength: dosage && unit ? `${dosage} ${unit}` : null,
                  form: form || null,
                  structuredIngredients: ingestStructured,
                  source: source === 'photo' ? 'photo_ai' : 'user_scan',
                  fieldSources: {
                    ...fieldSources,
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
              source,
              deliveryMethod,
              form,
              dosage,
              unit,
              frequency,
              reason: reason.trim(),
              time_of_day: timesSelected,
              with_food: withFood,
              timing_reason: timingReason,
              timing_source: timingChanged ? 'user_set' : 'hannah_recommended',
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
