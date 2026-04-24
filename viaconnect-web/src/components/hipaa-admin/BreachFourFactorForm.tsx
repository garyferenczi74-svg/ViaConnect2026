'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2, Siren, ShieldAlert } from 'lucide-react';

interface SuccessPayload {
  ok: boolean;
  id?: string;
  determination?: string;
  legalNotificationFired?: boolean;
  nextSteps?: string;
  error?: string;
}

export default function BreachFourFactorForm({ incidents }: { incidents: Array<{ id: string; incident_id: string; title: string }> }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessPayload | null>(null);
  const [determination, setDetermination] = useState<string>('not_applicable');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      incidentId: String(fd.get('incidentId') ?? '').trim(),
      assessmentDate: String(fd.get('assessmentDate') ?? '').trim(),
      determination: String(fd.get('determination') ?? '').trim(),
      rationale: String(fd.get('rationale') ?? '').trim(),
      individualsAffectedCount: Number.parseInt(String(fd.get('individualsAffectedCount') ?? '0'), 10) || null,
      fourFactors: {
        nature_and_extent_of_phi: String(fd.get('ff_nature') ?? '').trim(),
        unauthorized_person_receiving: String(fd.get('ff_unauthorized') ?? '').trim(),
        phi_actually_acquired_or_viewed: String(fd.get('ff_acquired') ?? '').trim(),
        mitigation_taken: String(fd.get('ff_mitigation') ?? '').trim(),
      },
    };
    try {
      const res = await fetch('/api/hipaa/breach-determinations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as SuccessPayload;
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSuccess(json);
      router.refresh();
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100/90">
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <p>
            The four factor assessment at 45 CFR 164.402 is mandatory before concluding a low probability of compromise. All four factors must be documented.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Incident" required htmlFor="incidentId">
          <select id="incidentId" name="incidentId" required disabled={submitting} className={inputClasses}>
            <option value="">Pick an incident</option>
            {incidents.map((i) => (
              <option key={i.id} value={i.id}>{i.incident_id}: {i.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Assessment date" required htmlFor="assessmentDate">
          <input id="assessmentDate" name="assessmentDate" type="date" required disabled={submitting} className={inputClasses} />
        </Field>
      </div>

      <Field label="Determination" required htmlFor="determination">
        <select
          id="determination" name="determination" required disabled={submitting}
          value={determination} onChange={(e) => setDetermination(e.target.value)}
          className={inputClasses}
        >
          <option value="not_applicable">Not applicable (no PHI involved)</option>
          <option value="low_probability_of_compromise">Low probability of compromise (four factor analysis supports)</option>
          <option value="breach_confirmed">Breach confirmed (notification obligations trigger)</option>
        </select>
      </Field>

      {determination === 'breach_confirmed' ? (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 p-3 flex items-start gap-2 text-xs text-red-200">
          <Siren className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <div>
            <div className="font-semibold">Submitting this will notify legal counsel</div>
            <p className="mt-1 text-red-200/80">
              A breach confirmed determination writes an entry to compliance audit log and surfaces the banner at /admin/frameworks/hipaa. Escalate to Thomas Rosengren within 24 hours per 45 CFR 164.400 series.
            </p>
          </div>
        </div>
      ) : null}

      <Field label="Individuals affected count (leave blank if unknown or not applicable)" htmlFor="individualsAffectedCount">
        <input id="individualsAffectedCount" name="individualsAffectedCount" type="number" min="0" disabled={submitting} className={inputClasses} />
      </Field>

      <div className="space-y-3 rounded-lg border border-white/[0.12] bg-white/[0.02] p-3">
        <div className="text-xs font-semibold text-white/80">Four factor assessment (minimum 20 chars each)</div>
        <Field label="1. Nature and extent of the PHI involved" required htmlFor="ff_nature">
          <textarea id="ff_nature" name="ff_nature" rows={3} required minLength={20} disabled={submitting} className={inputClasses}
                    placeholder="What types of PHI were potentially affected? Identifier categories, volume, sensitivity." />
        </Field>
        <Field label="2. Unauthorized person who received or used the PHI" required htmlFor="ff_unauthorized">
          <textarea id="ff_unauthorized" name="ff_unauthorized" rows={3} required minLength={20} disabled={submitting} className={inputClasses}
                    placeholder="Who obtained the PHI? Any obligation of confidentiality? Internal vs. external party?" />
        </Field>
        <Field label="3. Whether the PHI was actually acquired or viewed" required htmlFor="ff_acquired">
          <textarea id="ff_acquired" name="ff_acquired" rows={3} required minLength={20} disabled={submitting} className={inputClasses}
                    placeholder="Evidence of access: logs, attestations, forensic analysis." />
        </Field>
        <Field label="4. Extent to which the risk has been mitigated" required htmlFor="ff_mitigation">
          <textarea id="ff_mitigation" name="ff_mitigation" rows={3} required minLength={20} disabled={submitting} className={inputClasses}
                    placeholder="Mitigation steps: recovery, confidentiality commitments, destruction of data." />
        </Field>
      </div>

      <Field label="Rationale (minimum 50 chars; cites the factors above)" required htmlFor="rationale">
        <textarea id="rationale" name="rationale" rows={4} required minLength={50} disabled={submitting} className={inputClasses}
                  placeholder="Synthesize the four factor analysis and state the basis for the determination." />
      </Field>

      {err ? (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-sm px-3 py-2">{err}</div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 text-xs p-3 space-y-1">
          <div className="font-semibold">Determination recorded: {success.determination}</div>
          {success.legalNotificationFired !== undefined ? (
            <div>Legal notification: {success.legalNotificationFired ? 'logged' : 'FAILED, escalate manually'}</div>
          ) : null}
          {success.nextSteps ? <div>{success.nextSteps}</div> : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] disabled:opacity-50 transition px-4 py-2 text-sm font-medium text-white"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : null}
        {submitting ? 'Recording' : 'Record determination'}
      </button>
    </form>
  );
}

const inputClasses = 'w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30';

function Field({ label, htmlFor, required, children }: { label: string; htmlFor: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-white/80 mb-1.5">
        {label}{required ? ' *' : ''}
      </label>
      {children}
    </div>
  );
}
