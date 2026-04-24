'use client';

// Prompt #127 P6: ISO SoA determination form.
// Writes a new version of the applicability row for a given Annex A /
// clause control_ref. Shows a live preview of which narrator section
// will fire (implementation vs. exclusion justification).

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2, ShieldAlert, ListTree } from 'lucide-react';

export interface SoaControlOption {
  value: string;
  label: string;
}

export default function SoaForm({ controls }: { controls: SoaControlOption[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applicability, setApplicability] = useState<'applicable' | 'excluded'>('applicable');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      controlRef: String(fd.get('controlRef') ?? '').trim(),
      applicability: String(fd.get('applicability') ?? '').trim(),
      justification: String(fd.get('justification') ?? '').trim(),
      implementationStatus: String(fd.get('implementationStatus') ?? '').trim(),
      effectiveFrom: String(fd.get('effectiveFrom') ?? '').trim(),
      effectiveUntil: String(fd.get('effectiveUntil') ?? '').trim() || null,
    };
    setSubmitting(true);
    try {
      const res = await fetch('/api/iso/soa', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      form.reset();
      setApplicability('applicable');
      router.refresh();
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor="controlRef" className="block text-xs font-medium text-white/80 mb-1.5">Control *</label>
        <select id="controlRef" name="controlRef" required disabled={submitting} className={inputClasses}>
          <option value="">Pick a control</option>
          {controls.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="applicability" className="block text-xs font-medium text-white/80 mb-1.5">Applicability *</label>
          <select
            id="applicability" name="applicability" required disabled={submitting}
            value={applicability}
            onChange={(e) => setApplicability(e.target.value as 'applicable' | 'excluded')}
            className={inputClasses}
          >
            <option value="applicable">Applicable</option>
            <option value="excluded">Excluded</option>
          </select>
        </div>
        <div>
          <label htmlFor="implementationStatus" className="block text-xs font-medium text-white/80 mb-1.5">Implementation status *</label>
          <select id="implementationStatus" name="implementationStatus" required disabled={submitting} className={inputClasses}>
            <option value="implemented">Implemented</option>
            <option value="in_progress">In progress</option>
            <option value="planned">Planned</option>
            <option value="not_applicable">Not applicable</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="effectiveFrom" className="block text-xs font-medium text-white/80 mb-1.5">Effective from *</label>
          <input id="effectiveFrom" name="effectiveFrom" type="date" required disabled={submitting} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="effectiveUntil" className="block text-xs font-medium text-white/80 mb-1.5">Effective until (optional)</label>
          <input id="effectiveUntil" name="effectiveUntil" type="date" disabled={submitting} className={inputClasses} />
        </div>
      </div>

      <div>
        <label htmlFor="justification" className="block text-xs font-medium text-white/80 mb-1.5">
          {applicability === 'applicable' ? 'Inclusion justification *' : 'Exclusion justification *'}
        </label>
        <textarea
          id="justification" name="justification" rows={3} required minLength={20} disabled={submitting}
          placeholder={applicability === 'applicable'
            ? 'Why this control applies to the ISMS and how it is operated'
            : 'Why this control is excluded from the ISMS; auditors look closely here'}
          className={inputClasses}
        />
      </div>

      {applicability === 'excluded' ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <ListTree className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <span>Excluding an Annex A control requires explicit auditor review. Justification must cite why the control is not applicable to your ISMS scope.</span>
        </div>
      ) : null}

      {err ? (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <span>{err}</span>
        </div>
      ) : null}

      <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] disabled:opacity-50 transition px-4 py-2 text-sm font-medium text-white">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : <ListTree className="w-4 h-4" strokeWidth={1.5} aria-hidden />}
        {submitting ? 'Recording' : 'Record SoA determination'}
      </button>
    </form>
  );
}

const inputClasses = 'w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30';
