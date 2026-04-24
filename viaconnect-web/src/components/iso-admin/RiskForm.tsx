'use client';

// Prompt #127 P6: ISO risk register entry form.
// Likelihood and impact are integer 1 to 5 to match the iso_risk_register
// CHECK constraints; inherent_risk is computed server-side as likelihood*impact.

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2, ShieldAlert, Gauge } from 'lucide-react';

export default function RiskForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const resLike = Number.parseInt(String(fd.get('residualLikelihood') ?? ''), 10);
    const resImp = Number.parseInt(String(fd.get('residualImpact') ?? ''), 10);
    const payload = {
      riskRef: String(fd.get('riskRef') ?? '').trim(),
      asset: String(fd.get('asset') ?? '').trim() || null,
      threat: String(fd.get('threat') ?? '').trim(),
      vulnerability: String(fd.get('vulnerability') ?? '').trim(),
      description: String(fd.get('description') ?? '').trim(),
      likelihood,
      impact,
      treatmentOption: String(fd.get('treatmentOption') ?? '').trim(),
      residualLikelihood: Number.isFinite(resLike) ? resLike : null,
      residualImpact: Number.isFinite(resImp) ? resImp : null,
      status: String(fd.get('status') ?? '').trim(),
      identifiedAt: String(fd.get('identifiedAt') ?? '').trim(),
      nextReviewDate: String(fd.get('nextReviewDate') ?? '').trim() || null,
    };
    setSubmitting(true);
    try {
      const res = await fetch('/api/iso/risks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      form.reset();
      setLikelihood(3);
      setImpact(3);
      router.refresh();
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const inherent = likelihood * impact;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="riskRef" className="block text-xs font-medium text-white/80 mb-1.5">Risk identifier *</label>
          <input id="riskRef" name="riskRef" type="text" required disabled={submitting}
                 placeholder="R-2026-001" className={inputClasses} />
        </div>
        <div>
          <label htmlFor="asset" className="block text-xs font-medium text-white/80 mb-1.5">Asset (optional)</label>
          <input id="asset" name="asset" type="text" disabled={submitting}
                 placeholder="Production Supabase" className={inputClasses} />
        </div>
      </div>

      <div>
        <label htmlFor="threat" className="block text-xs font-medium text-white/80 mb-1.5">Threat *</label>
        <textarea id="threat" name="threat" rows={2} required minLength={10} disabled={submitting}
                  placeholder="Unauthorized external actor accessing sensitive data" className={inputClasses} />
      </div>

      <div>
        <label htmlFor="vulnerability" className="block text-xs font-medium text-white/80 mb-1.5">Vulnerability *</label>
        <textarea id="vulnerability" name="vulnerability" rows={2} required minLength={10} disabled={submitting}
                  placeholder="Weakness that could be exploited by the threat" className={inputClasses} />
      </div>

      <div>
        <label htmlFor="description" className="block text-xs font-medium text-white/80 mb-1.5">Risk description *</label>
        <textarea id="description" name="description" rows={2} required minLength={20} disabled={submitting}
                  placeholder="Full risk statement combining the threat and vulnerability" className={inputClasses} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="likelihood" className="block text-xs font-medium text-white/80 mb-1.5">Likelihood * (1 to 5)</label>
          <select id="likelihood" name="likelihood" required disabled={submitting}
                  value={likelihood} onChange={(e) => setLikelihood(Number.parseInt(e.target.value, 10))}
                  className={inputClasses}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="impact" className="block text-xs font-medium text-white/80 mb-1.5">Impact * (1 to 5)</label>
          <select id="impact" name="impact" required disabled={submitting}
                  value={impact} onChange={(e) => setImpact(Number.parseInt(e.target.value, 10))}
                  className={inputClasses}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/80 mb-1.5">Inherent risk</label>
          <div className={`${inputClasses} flex items-center justify-center font-bold text-base ${inherent >= 15 ? 'text-red-300' : inherent >= 9 ? 'text-amber-300' : 'text-emerald-300'}`}>
            {inherent}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="treatmentOption" className="block text-xs font-medium text-white/80 mb-1.5">Treatment option *</label>
          <select id="treatmentOption" name="treatmentOption" required disabled={submitting} className={inputClasses}>
            <option value="">Pick one</option>
            <option value="modify">Modify (apply controls)</option>
            <option value="retain">Retain (accept)</option>
            <option value="avoid">Avoid</option>
            <option value="share">Share (transfer)</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-xs font-medium text-white/80 mb-1.5">Status *</label>
          <select id="status" name="status" required disabled={submitting} className={inputClasses}>
            <option value="">Pick one</option>
            <option value="open">Open</option>
            <option value="treated">Treated</option>
            <option value="accepted">Accepted</option>
            <option value="closed">Closed</option>
            <option value="superseded">Superseded</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="residualLikelihood" className="block text-xs font-medium text-white/80 mb-1.5">Residual likelihood (optional)</label>
          <select id="residualLikelihood" name="residualLikelihood" disabled={submitting} className={inputClasses}>
            <option value="">Not yet scored</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="residualImpact" className="block text-xs font-medium text-white/80 mb-1.5">Residual impact (optional)</label>
          <select id="residualImpact" name="residualImpact" disabled={submitting} className={inputClasses}>
            <option value="">Not yet scored</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="identifiedAt" className="block text-xs font-medium text-white/80 mb-1.5">Identified at *</label>
          <input id="identifiedAt" name="identifiedAt" type="date" required disabled={submitting} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="nextReviewDate" className="block text-xs font-medium text-white/80 mb-1.5">Next review (optional)</label>
          <input id="nextReviewDate" name="nextReviewDate" type="date" disabled={submitting} className={inputClasses} />
        </div>
      </div>

      {err ? (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <span>{err}</span>
        </div>
      ) : null}

      <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] disabled:opacity-50 transition px-4 py-2 text-sm font-medium text-white">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : <Gauge className="w-4 h-4" strokeWidth={1.5} aria-hidden />}
        {submitting ? 'Recording' : 'Record risk'}
      </button>
    </form>
  );
}

const inputClasses = 'w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30';
