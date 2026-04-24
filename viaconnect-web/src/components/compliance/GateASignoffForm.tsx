'use client';

// Prompt #127 P8: Gate A sign-off form component.

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2, ShieldAlert, FileSignature } from 'lucide-react';

export interface GateAFormProps {
  frameworkId: string;
  frameworkLabel: string;
  attestorRole: string;
  suggestedScope: string;
  suggestedAttestationText: string;
}

export default function GateASignoffForm({
  frameworkId,
  frameworkLabel,
  attestorRole,
  suggestedScope,
  suggestedAttestationText,
}: GateAFormProps) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      frameworkId,
      signedName: String(fd.get('signedName') ?? '').trim(),
      scopeSummary: String(fd.get('scopeSummary') ?? '').trim(),
      attestationText: String(fd.get('attestationText') ?? '').trim(),
      outstandingFlagsCritical: Number.parseInt(String(fd.get('outstandingFlagsCritical') ?? '0'), 10) || 0,
      outstandingFlagsWarning: Number.parseInt(String(fd.get('outstandingFlagsWarning') ?? '0'), 10) || 0,
    };
    setSubmitting(true);
    try {
      const res = await fetch('/api/compliance/gate-a/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      form.reset();
      router.refresh();
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="rounded-md border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-white/70">
        <div><span className="text-white/40">Framework:</span> <span className="font-semibold text-white">{frameworkLabel}</span></div>
        <div><span className="text-white/40">Attestor role:</span> <span className="font-mono text-white">{attestorRole}</span></div>
      </div>

      <div>
        <label htmlFor="signedName" className="block text-xs font-medium text-white/80 mb-1.5">Signer name *</label>
        <input id="signedName" name="signedName" type="text" required minLength={3} disabled={submitting}
               placeholder="Full legal name" className={inputClasses} />
      </div>

      <div>
        <label htmlFor="scopeSummary" className="block text-xs font-medium text-white/80 mb-1.5">Scope summary *</label>
        <textarea id="scopeSummary" name="scopeSummary" rows={2} required minLength={20} disabled={submitting}
                  defaultValue={suggestedScope}
                  placeholder="Systems and safeguards covered by this sign-off"
                  className={inputClasses} />
      </div>

      <div>
        <label htmlFor="attestationText" className="block text-xs font-medium text-white/80 mb-1.5">Attestation text *</label>
        <textarea id="attestationText" name="attestationText" rows={5} required minLength={50} disabled={submitting}
                  defaultValue={suggestedAttestationText}
                  className={inputClasses} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="outstandingFlagsCritical" className="block text-xs font-medium text-white/80 mb-1.5">Outstanding critical flags</label>
          <input id="outstandingFlagsCritical" name="outstandingFlagsCritical" type="number" min="0" defaultValue="0" disabled={submitting} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="outstandingFlagsWarning" className="block text-xs font-medium text-white/80 mb-1.5">Outstanding warning flags</label>
          <input id="outstandingFlagsWarning" name="outstandingFlagsWarning" type="number" min="0" defaultValue="0" disabled={submitting} className={inputClasses} />
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
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : <FileSignature className="w-4 h-4" strokeWidth={1.5} aria-hidden />}
        {submitting ? 'Recording' : 'Record Gate A sign-off'}
      </button>
    </form>
  );
}

const inputClasses = 'w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30';
