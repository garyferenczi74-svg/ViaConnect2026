'use client';

// Prompt #114 P2b: New recordation form.
//
// Type toggle (trademark vs copyright) drives conditional field visibility.
// Live fee preview uses cbpFeeCalculator; CEO approval warning shows up
// whenever the initial fee crosses the $1K threshold. Submit posts to
// /api/admin/legal/customs/recordations; redirects to /[id] on 201.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  computeRecordationFees,
  formatCents,
  MIN_INTERNATIONAL_CLASS,
  MAX_INTERNATIONAL_CLASS,
  CEO_APPROVAL_THRESHOLD_CENTS,
} from '@/lib/customs/cbpFeeCalculator';
import type { CustomsRecordationType } from '@/lib/customs/types';
import HannahWalkthrough from '@/components/admin/hannah/HannahWalkthrough';

export default function NewRecordationPage() {
  const router = useRouter();
  const [recordationType, setRecordationType] = useState<CustomsRecordationType>('trademark');
  const [markText, setMarkText] = useState('');
  const [copyrightReg, setCopyrightReg] = useState('');
  const [usptoReg, setUsptoReg] = useState('');
  const [usptoRegDate, setUsptoRegDate] = useState('');
  const [copyrightRegDate, setCopyrightRegDate] = useState('');
  const [icCount, setIcCount] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feeQuote = useMemo(() => {
    try {
      return computeRecordationFees({
        recordation_type: recordationType,
        ic_count: recordationType === 'trademark' ? icCount : 1,
      });
    } catch {
      return null;
    }
  }, [recordationType, icCount]);

  const ceoApprovalRequired = feeQuote?.ceo_approval_required === true;

  const canSubmit =
    (recordationType === 'trademark' && markText.trim().length > 0 && icCount >= 1) ||
    (recordationType === 'copyright' && copyrightReg.trim().length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        recordation_type: recordationType,
        notes: notes.trim() || null,
      };
      if (recordationType === 'trademark') {
        body.mark_text = markText.trim();
        body.total_ic_count = icCount;
        if (feeQuote) {
          body.total_fee_cents = feeQuote.initial_fee_cents;
          body.renewal_fee_cents = feeQuote.renewal_fee_cents;
        }
        if (usptoReg.trim()) body.uspto_registration_number = usptoReg.trim();
        if (usptoRegDate) body.uspto_registration_date = usptoRegDate;
      } else {
        body.copyright_registration_number = copyrightReg.trim();
        if (copyrightRegDate) body.copyright_registration_date = copyrightRegDate;
        if (feeQuote) {
          body.total_fee_cents = feeQuote.initial_fee_cents;
          body.renewal_fee_cents = feeQuote.renewal_fee_cents;
        }
      }

      const r = await fetch('/api/admin/legal/customs/recordations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      router.push(`/admin/legal/customs/recordations/${json.recordation.recordation_id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link
          href="/admin/legal/customs/recordations"
          className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Recordations
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 inline-flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" strokeWidth={1.5} />
          New recordation
        </h1>
        <p className="text-sm text-gray-400 mt-1 max-w-3xl">
          Draft a CBP IPRR filing under 19 C.F.R. Part 133. Row starts at status draft. Counsel must review before you mark counsel_reviewed; if the initial fee exceeds $1,000, CEO sign off is required through the dedicated approval endpoint before you move status past pending_fee.
        </p>
        <HannahWalkthrough target="customs.recordation.new" />
      </header>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5 lg:col-span-2">
          <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3">Filing type</h2>
          <div className="flex gap-2 flex-wrap">
            <TypeToggle
              value="trademark"
              label="Trademark (19 C.F.R. 133.1)"
              selected={recordationType === 'trademark'}
              onClick={() => setRecordationType('trademark')}
            />
            <TypeToggle
              value="copyright"
              label="Copyright (19 C.F.R. 133.31)"
              selected={recordationType === 'copyright'}
              onClick={() => setRecordationType('copyright')}
            />
          </div>

          {recordationType === 'trademark' && (
            <>
              <FormField
                label="Mark text"
                required
                helper="Exact mark as recorded with USPTO (e.g. VIACURA, FARMCEUTICA, GENEX360)."
              >
                <input
                  type="text"
                  value={markText}
                  onChange={(e) => setMarkText(e.target.value)}
                  className="w-full bg-[#0E1A30] border border-white/10 rounded px-3 py-2 text-base"
                  placeholder="VIACURA"
                  autoComplete="off"
                />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="USPTO registration number" helper="Optional at draft; required before active status.">
                  <input
                    type="text"
                    value={usptoReg}
                    onChange={(e) => setUsptoReg(e.target.value)}
                    className="w-full bg-[#0E1A30] border border-white/10 rounded px-3 py-2 text-base font-mono"
                    placeholder="7,123,456"
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="USPTO registration date">
                  <input
                    type="date"
                    value={usptoRegDate}
                    onChange={(e) => setUsptoRegDate(e.target.value)}
                    className="w-full bg-[#0E1A30] border border-white/10 rounded px-3 py-2 text-base"
                  />
                </FormField>
              </div>
              <FormField
                label="International Class count"
                required
                helper={`Between ${MIN_INTERNATIONAL_CLASS} and ${MAX_INTERNATIONAL_CLASS}. Fee is $190 per IC initial, $80 per IC renewal. Individual classes get added after creation.`}
              >
                <input
                  type="number"
                  min={MIN_INTERNATIONAL_CLASS}
                  max={MAX_INTERNATIONAL_CLASS}
                  step={1}
                  value={icCount}
                  onChange={(e) => setIcCount(Math.max(1, Math.min(45, parseInt(e.target.value, 10) || 1)))}
                  className="w-full bg-[#0E1A30] border border-white/10 rounded px-3 py-2 text-base"
                />
              </FormField>
            </>
          )}

          {recordationType === 'copyright' && (
            <>
              <FormField
                label="Copyright registration number"
                required
                helper="U.S. Copyright Office registration (e.g. TX0009876543)."
              >
                <input
                  type="text"
                  value={copyrightReg}
                  onChange={(e) => setCopyrightReg(e.target.value)}
                  className="w-full bg-[#0E1A30] border border-white/10 rounded px-3 py-2 text-base font-mono"
                  placeholder="TX0009876543"
                  autoComplete="off"
                />
              </FormField>
              <FormField label="Copyright registration date">
                <input
                  type="date"
                  value={copyrightRegDate}
                  onChange={(e) => setCopyrightRegDate(e.target.value)}
                  className="w-full bg-[#0E1A30] border border-white/10 rounded px-3 py-2 text-base"
                />
              </FormField>
            </>
          )}

          <FormField label="Notes" helper="Internal notes; not transmitted to CBP.">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-[#0E1A30] border border-white/10 rounded px-3 py-2 text-base"
              placeholder="Optional context for counsel."
            />
          </FormField>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
          <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3 inline-flex items-center gap-2">
            <FileText className="w-4 h-4" strokeWidth={1.5} /> Fee preview
          </h2>
          {feeQuote ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Initial filing</span>
                <span className="font-semibold">{formatCents(feeQuote.initial_fee_cents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Renewal (every 10 years)</span>
                <span>{formatCents(feeQuote.renewal_fee_cents)}</span>
              </div>
              {recordationType === 'trademark' && (
                <div className="text-xs text-gray-500 pt-2 border-t border-white/5">
                  {icCount} International Class{icCount === 1 ? '' : 'es'} at $190 per IC initial + $80 per IC renewal.
                </div>
              )}
              {recordationType === 'copyright' && (
                <div className="text-xs text-gray-500 pt-2 border-t border-white/5">
                  Copyright flat fee per 19 C.F.R. 133.31.
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">Enter valid inputs to see a quote.</div>
          )}

          {ceoApprovalRequired && (
            <div className="mt-4 rounded-lg border border-[#B75E18]/50 bg-[#B75E18]/15 p-3 text-xs text-orange-200 inline-flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.5} />
              <div>
                Initial fee is over {formatCents(CEO_APPROVAL_THRESHOLD_CENTS)}. CEO sign off is required before status can leave draft. CEO approval runs through the dedicated MFA-verified endpoint; compliance officers cannot record the approval.
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="lg:col-span-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
          </div>
        )}

        <div className="lg:col-span-3 flex gap-2 justify-end">
          <Link
            href="/admin/legal/customs/recordations"
            className="text-sm px-4 py-2 rounded border border-white/10 text-gray-300 hover:text-white min-h-[44px] inline-flex items-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="text-sm px-4 py-2 rounded border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#2DA5A0] hover:bg-[#2DA5A0]/25 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />}
            Create draft
          </button>
        </div>
      </form>
    </div>
  );
}

function TypeToggle({
  label,
  selected,
  onClick,
}: {
  value: CustomsRecordationType;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm px-3 py-2 rounded border min-h-[44px] md:min-h-0 ${
        selected
          ? 'border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
          : 'border-white/10 text-gray-300 hover:border-white/20'
      }`}
    >
      {label}
    </button>
  );
}

function FormField({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
        {label} {required && <span className="text-[#B75E18]">required</span>}
      </label>
      {children}
      {helper && <p className="text-xs text-gray-500 mt-1">{helper}</p>}
    </div>
  );
}
