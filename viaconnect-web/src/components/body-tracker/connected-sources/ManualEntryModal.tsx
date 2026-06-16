'use client';

// Prompt 201: manual entry of a single body-composition reading.
//
// One measurement date plus optional fields for the full metric set. Core
// metrics (the four Apple Health can deliver) and the extended Hume Body Pod
// only metrics are grouped separately, each labeled with its canonical unit.
//
// On submit we build a NormalizedSample[] for ONLY the filled fields, each in
// the metric's canonical unit, and POST through the same ingestion funnel every
// connected source uses (the ingest-body-composition edge function). Fields the
// user leaves blank are omitted, so they persist as UNKNOWN downstream, never
// zero. Each sample carries a fresh externalId so re-submitting builds a new
// distinct record.
//
// Resilience: the network call is wrapped; failures surface a toast and leave
// the modal open with the entered values intact. Design tokens: Card #1E3054 on
// Deep Navy #1A2744, Teal #2DA5A0, Orange #B75E18. Lucide at strokeWidth 1.5.
// No emojis. No em or en dashes anywhere.

import { useCallback, useMemo, useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import {
  METRIC_DEFS,
  CORE_METRIC_KEYS,
  EXTENDED_METRIC_KEYS,
  type BodyMetricKey,
} from '@/lib/body-tracker/connected-sources/metrics';

const INGEST_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://nnhkcufyqjojdbvdrpky.supabase.co'}/functions/v1/ingest-body-composition`;

interface NormalizedSample {
  metricKey: BodyMetricKey;
  value: number;
  unit: string;
  measuredAt: string;
  externalId: string;
}

interface ManualEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function todayLocalISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// The chosen calendar day, anchored at noon UTC so it lands on the intended day
// in every timezone rather than slipping across midnight.
function dateToNoonUtcIso(dateStr: string): string {
  return `${dateStr}T12:00:00.000Z`;
}

function MetricField({
  metricKey,
  value,
  onChange,
}: {
  metricKey: BodyMetricKey;
  value: string;
  onChange: (key: BodyMetricKey, raw: string) => void;
}) {
  const def = METRIC_DEFS[metricKey];
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-white/55">
        {def.label}
        {def.unitLabel ? <span className="text-white/35"> ({def.unitLabel})</span> : null}
      </span>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        value={value}
        onChange={(e) => onChange(metricKey, e.target.value)}
        placeholder="Optional"
        aria-label={`${def.label}${def.unitLabel ? ` in ${def.unitLabel}` : ''}`}
        className="min-h-[44px] rounded-xl border border-white/[0.1] bg-[#1A2744] px-3 text-sm text-white placeholder:text-white/25 focus:border-[#2DA5A0]/60 focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]/40"
      />
    </label>
  );
}

export function ManualEntryModal({ open, onClose, onSaved }: ManualEntryModalProps) {
  const [measuredDate, setMeasuredDate] = useState<string>(todayLocalISODate());
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const setField = useCallback((key: BodyMetricKey, raw: string) => {
    setValues((prev) => ({ ...prev, [key]: raw }));
  }, []);

  const filledCount = useMemo(
    () =>
      Object.values(values).filter((v) => v.trim() !== '' && Number.isFinite(Number(v))).length,
    [values],
  );

  const reset = useCallback(() => {
    setMeasuredDate(todayLocalISODate());
    setValues({});
    setSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    if (saving) return;
    reset();
    onClose();
  }, [saving, reset, onClose]);

  const handleSubmit = useCallback(async () => {
    const measuredAt = dateToNoonUtcIso(measuredDate);

    const samples: NormalizedSample[] = [];
    for (const key of [...CORE_METRIC_KEYS, ...EXTENDED_METRIC_KEYS]) {
      const raw = values[key];
      if (raw === undefined || raw.trim() === '') continue; // unfilled stays UNKNOWN
      const num = Number(raw);
      if (!Number.isFinite(num)) continue;
      samples.push({
        metricKey: key,
        value: num,
        unit: METRIC_DEFS[key].canonicalUnit,
        measuredAt,
        externalId: crypto.randomUUID(),
      });
    }

    if (samples.length === 0) {
      toast.error('Enter at least one measurement.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error('Please sign in again to save your reading.');
        setSaving(false);
        return;
      }

      const res = await fetch(INGEST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ sourceId: 'manual_entry', samples }),
      });

      if (!res.ok) {
        toast.error('We could not save your reading. Please try again.');
        setSaving(false);
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (json?.error) {
        toast.error('We could not save your reading. Please try again.');
        setSaving(false);
        return;
      }

      toast.success('Reading saved');
      reset();
      onSaved?.();
      onClose();
    } catch {
      toast.error('We could not save your reading. Please try again.');
      setSaving(false);
    }
  }, [measuredDate, values, reset, onSaved, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add a reading"
      onClick={handleClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/[0.08] bg-[#1A2744] p-5 sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Add a reading</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-white/55">
              Fill only what you have. Blank fields stay marked Not available, never zero.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Measurement date */}
        <label className="mb-5 flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">
            Measurement date
          </span>
          <input
            type="date"
            value={measuredDate}
            max={todayLocalISODate()}
            onChange={(e) => setMeasuredDate(e.target.value)}
            aria-label="Measurement date"
            className="min-h-[44px] rounded-xl border border-white/[0.1] bg-[#1E3054] px-3 text-sm text-white focus:border-[#2DA5A0]/60 focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]/40"
          />
        </label>

        {/* Core metrics */}
        <fieldset className="mb-5">
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Core metrics
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CORE_METRIC_KEYS.map((key) => (
              <MetricField key={key} metricKey={key} value={values[key] ?? ''} onChange={setField} />
            ))}
          </div>
        </fieldset>

        {/* Extended Hume Body Pod metrics */}
        <fieldset className="mb-6">
          <legend className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Extended metrics
            <span className="inline-flex items-center rounded-full bg-[#2DA5A0]/15 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[#2DA5A0] ring-1 ring-inset ring-[#2DA5A0]/30">
              Hume Body Pod
            </span>
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {EXTENDED_METRIC_KEYS.map((key) => (
              <MetricField key={key} metricKey={key} value={values[key] ?? ''} onChange={setField} />
            ))}
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || filledCount === 0}
            className="flex min-h-[44px] flex-[1.4] items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/85 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                Saving
              </>
            ) : (
              <>
                <Save className="h-4 w-4" strokeWidth={1.5} />
                Save reading
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManualEntryModal;
