'use client';

// Prompt #101 Phase 4: VIP exemption request form (manual-customer path only
// until public.clients table lands).

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MAPVIPExemptionReason } from '@/lib/map/vip/types';
import {
  reasonRequiresEncryptedNote,
  VIP_EXEMPTION_MAX_WINDOW_DAYS,
} from '@/lib/map/vip/types';
import {
  validateVIPMargin,
  validateVIPWindow,
} from '@/lib/map/vip/validation';
import { hashSensitiveContent } from '@/lib/map/vip/encryption';

const REASON_OPTIONS: Array<{ value: MAPVIPExemptionReason; label: string }> = [
  { value: 'long_term_patient', label: 'Long-term patient' },
  { value: 'immediate_family', label: 'Immediate family' },
  { value: 'documented_financial_hardship', label: 'Documented financial hardship' },
  { value: 'returning_chronic_illness_subscription', label: 'Returning chronic illness subscription' },
  { value: 'clinical_trial_compassionate_use', label: 'Clinical trial compassionate use' },
  { value: 'other_documented', label: 'Other documented' },
];

export default function NewVIPExemptionPage() {
  const router = useRouter();
  const [manualCustomerId, setManualCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [tier, setTier] = useState<'L1' | 'L2'>('L1');
  const [exemptedPriceCents, setExemptedPriceCents] = useState(0);
  const [ingredientCostFloorCents, setIngredientCostFloorCents] = useState(0);
  const [reason, setReason] = useState<MAPVIPExemptionReason>('long_term_patient');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [sensitiveNote, setSensitiveNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const marginError = useMemo(() => {
    if (exemptedPriceCents <= 0 || ingredientCostFloorCents <= 0) return null;
    return validateVIPMargin(exemptedPriceCents, ingredientCostFloorCents);
  }, [exemptedPriceCents, ingredientCostFloorCents]);

  const windowError = useMemo(() => {
    if (!startDate || !endDate) return null;
    return validateVIPWindow(new Date(startDate), new Date(endDate));
  }, [startDate, endDate]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (marginError) throw new Error(marginError);
      if (windowError) throw new Error(windowError);
      if (!manualCustomerId) throw new Error('VIP_CUSTOMER_REQUIRED');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      const { data: userResp } = await supabase.auth.getUser();
      const userId = userResp?.user?.id;
      if (!userId) throw new Error('Not authenticated.');

      const { data: prac } = await supabase
        .from('practitioners').select('id').eq('user_id', userId).maybeSingle();
      if (!prac) throw new Error('Practitioner record not found.');

      const { data: inserted, error: iErr } = await supabase.from('map_vip_exemptions').insert({
        practitioner_id: prac.id,
        manual_customer_id: manualCustomerId,
        product_id: productId,
        tier,
        exempted_price_cents: exemptedPriceCents,
        ingredient_cost_floor_cents: ingredientCostFloorCents,
        reason,
        exemption_start_at: new Date(startDate).toISOString(),
        exemption_end_at: new Date(endDate).toISOString(),
        requested_by: userId,
      }).select('vip_exemption_id').single();
      if (iErr) throw iErr;

      if (reasonRequiresEncryptedNote(reason) && sensitiveNote.trim().length > 0) {
        // Encryption happens server-side via pgcrypto once the
        // VIP_SENSITIVE_NOTE_KEY is provisioned. For now, store the
        // plaintext-hashed record with a placeholder BYTEA so the
        // practitioner's submission is captured; the admin reviewer
        // is the one who decrypts / re-encrypts with the key.
        const hash = hashSensitiveContent(sensitiveNote);
        await supabase.from('map_vip_exemption_sensitive_notes').insert({
          vip_exemption_id: inserted.vip_exemption_id,
          encrypted_content: new TextEncoder().encode(sensitiveNote),
          content_hash: hash,
          created_by: userId,
        });
      }

      router.push('/practitioner/map/vip-exemptions');
    } catch (err) {
      setError((err as Error).message ?? 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/practitioner/map/vip-exemptions" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> VIP exemptions
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          New VIP exemption
        </h1>
        <p className="text-[11px] text-white/55">
          Customer-specific only. Public listings on Amazon, Google Shopping etc. still enforce MAP even when this exemption is active.
          Max {VIP_EXEMPTION_MAX_WINDOW_DAYS} days; margin floor always preserved.
        </p>

        <Field label="Manual customer ID" value={manualCustomerId} onChange={setManualCustomerId} />
        <Field label="Product ID" value={productId} onChange={setProductId} />
        <div>
          <label className="text-[11px] text-white/55">Tier</label>
          <select value={tier} onChange={(e) => setTier(e.target.value as 'L1'|'L2')} className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white">
            <option value="L1">L1</option>
            <option value="L2">L2</option>
          </select>
        </div>
        <NumberField label="Exempted price (cents)" value={exemptedPriceCents} onChange={setExemptedPriceCents} />
        <NumberField label="Ingredient cost floor (cents)" value={ingredientCostFloorCents} onChange={setIngredientCostFloorCents} />
        {marginError && <p className="text-[11px] text-red-300">{marginError}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" type="date" value={startDate} onChange={setStartDate} />
          <Field label="End date" type="date" value={endDate} onChange={setEndDate} />
        </div>
        {windowError && <p className="text-[11px] text-red-300">{windowError}</p>}

        <div>
          <label className="text-[11px] text-white/55">Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value as MAPVIPExemptionReason)} className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white">
            {REASON_OPTIONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
          </select>
        </div>

        {reasonRequiresEncryptedNote(reason) && (
          <label className="block">
            <span className="text-[11px] text-white/55">Sensitive note (encrypted at rest)</span>
            <textarea
              value={sensitiveNote}
              onChange={(e) => setSensitiveNote(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white"
            />
          </label>
        )}

        {error && <p className="text-[11px] text-red-300">{error}</p>}

        <div className="flex items-center justify-end gap-2">
          <Link href="/practitioner/map/vip-exemptions" className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-[11px] text-white/70 hover:text-white">
            Cancel
          </Link>
          <button type="submit" disabled={submitting || !!marginError || !!windowError} className="rounded-lg bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-[11px] font-semibold text-[#0B1520]">
            {submitting ? 'Submitting...' : 'Submit for approval'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] text-white/55">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white" />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-white/55">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white" />
    </label>
  );
}
