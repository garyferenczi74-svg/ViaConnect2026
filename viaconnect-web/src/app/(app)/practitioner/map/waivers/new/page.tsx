'use client';

// Prompt #101 Phase 4: new-waiver request form.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  WAIVER_TYPE_RULES,
  type MAPWaiverType,
  WAIVER_JUSTIFICATION_MIN_CHARS,
} from '@/lib/map/waivers/types';
import {
  validateJustification,
  validateWaiverWindow,
} from '@/lib/map/waivers/validation';

const WAIVER_TYPE_OPTIONS: Array<{ value: MAPWaiverType; label: string }> = [
  { value: 'seasonal_promotion', label: 'Seasonal promotion' },
  { value: 'charity_event', label: 'Charity event' },
  { value: 'clinic_in_person_only', label: 'Clinic in-person only' },
  { value: 'clinical_study_recruitment', label: 'Clinical study recruitment' },
  { value: 'new_patient_onboarding', label: 'New patient onboarding' },
];

export default function NewWaiverPage() {
  const router = useRouter();
  const [waiverType, setWaiverType] = useState<MAPWaiverType>('seasonal_promotion');
  const [scopeDescription, setScopeDescription] = useState('');
  const [scopeUrlsRaw, setScopeUrlsRaw] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rule = WAIVER_TYPE_RULES[waiverType];

  const windowError = useMemo(() => {
    if (!startDate || !endDate) return null;
    return validateWaiverWindow({
      waiverType,
      startAt: new Date(startDate),
      endAt: new Date(endDate),
    });
  }, [waiverType, startDate, endDate]);

  const justificationError = useMemo(() => {
    if (justification.length === 0) return null;
    return validateJustification(justification);
  }, [justification]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (windowError) throw new Error(windowError);
      const jErr = validateJustification(justification);
      if (jErr) throw new Error(jErr);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      const { data: userResp } = await supabase.auth.getUser();
      const userId = userResp?.user?.id;
      if (!userId) throw new Error('Not authenticated.');

      const { data: prac } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (!prac) throw new Error('Practitioner record not found.');

      const scopeUrls = scopeUrlsRaw
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const { error: insertError } = await supabase.from('map_waivers').insert({
        practitioner_id: prac.id,
        waiver_type: waiverType,
        status: 'pending_approval',
        scope_description: scopeDescription,
        scope_urls: scopeUrls,
        waiver_start_at: new Date(startDate).toISOString(),
        waiver_end_at: new Date(endDate).toISOString(),
        justification,
        requested_by: userId,
      });
      if (insertError) throw insertError;

      router.push('/practitioner/map/waivers');
    } catch (err) {
      setError((err as Error).message ?? 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4"
      >
        <Link href="/practitioner/map/waivers" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Waivers
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Request a MAP waiver
        </h1>

        <label className="block">
          <span className="text-[11px] text-white/55">Waiver type</span>
          <select
            value={waiverType}
            onChange={(e) => setWaiverType(e.target.value as MAPWaiverType)}
            className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white"
          >
            {WAIVER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-white/45 mt-1">
            Max duration: {rule.maxDurationDays} days. Max discount below MAP: {rule.maxDiscountPctBelowMAP}%.
            {rule.evidenceRequired ? ' Evidence required at upload.' : ''}
          </p>
        </label>

        <label className="block">
          <span className="text-[11px] text-white/55">Scope description</span>
          <input
            value={scopeDescription}
            onChange={(e) => setScopeDescription(e.target.value)}
            placeholder="e.g., anniversary sale on my clinic site only"
            className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white"
          />
        </label>

        <label className="block">
          <span className="text-[11px] text-white/55">Scope URLs (one per line; leave empty for all)</span>
          <textarea
            value={scopeUrlsRaw}
            onChange={(e) => setScopeUrlsRaw(e.target.value)}
            rows={3}
            placeholder="https://my-practitioner-site.com/shop"
            className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white font-mono"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] text-white/55">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-white/55">End date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white"
            />
          </label>
        </div>
        {windowError && <p className="text-[11px] text-red-300">{windowError}</p>}

        <label className="block">
          <span className="text-[11px] text-white/55">
            Justification ({justification.length} / {WAIVER_JUSTIFICATION_MIN_CHARS} min, 2000 max)
          </span>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white"
          />
        </label>
        {justificationError && <p className="text-[11px] text-red-300">{justificationError}</p>}

        {error && <p className="text-[11px] text-red-300">{error}</p>}

        <div className="flex items-center justify-end gap-2">
          <Link href="/practitioner/map/waivers" className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-[11px] text-white/70 hover:text-white">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !!windowError || !!justificationError}
            className="rounded-lg bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-[11px] font-semibold text-[#0B1520]"
          >
            {submitting ? 'Submitting...' : 'Submit for approval'}
          </button>
        </div>
      </form>
    </div>
  );
}
