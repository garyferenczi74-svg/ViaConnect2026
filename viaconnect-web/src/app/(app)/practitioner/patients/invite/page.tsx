'use client';

// Practitioner-side patient invitation form. Practitioner enters patient
// email and name, picks consent presets, and dispatches the invitation.
// On success the page shows the invitation URL the practitioner can copy
// and forward outside the email queue if needed.

import { useState } from 'react';
import {
  UserPlus,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Loader2,
} from 'lucide-react';

interface ConsentPresets {
  consent_share_caq: boolean;
  consent_share_engagement_score: boolean;
  consent_share_protocols: boolean;
  consent_share_nutrition: boolean;
  can_view_genetics: boolean;
}

const DEFAULT_PRESETS: ConsentPresets = {
  consent_share_caq: false,
  consent_share_engagement_score: true,
  consent_share_protocols: true,
  consent_share_nutrition: false,
  can_view_genetics: false,
};

export default function InvitePatientPage() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [note, setNote] = useState('');
  const [presets, setPresets] = useState<ConsentPresets>(DEFAULT_PRESETS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    invitationUrl: string;
    practiceName: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail(''); setFirstName(''); setLastName(''); setNote('');
    setPresets(DEFAULT_PRESETS); setResult(null); setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/practitioner/invite-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientEmail: email,
          patientFirstName: firstName,
          patientLastName: lastName,
          invitationNote: note || undefined,
          consentPresets: presets,
        }),
      });
      if (res.status === 201) {
        const j = await res.json();
        setResult({
          invitationUrl: j.invitationUrl,
          practiceName: j.practitioner?.practiceName ?? null,
        });
        return;
      }
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? `Invitation failed (status ${res.status}).`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-portal-green/30 bg-portal-green/10">
          <UserPlus className="h-5 w-5 text-portal-green" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Invite a Patient</h1>
          <p className="text-xs text-white/55">
            Send a single-use invitation link. Your patient confirms data sharing consent before the
            relationship activates.
          </p>
        </div>
      </header>

      {result ? (
        <SuccessCard
          invitationUrl={result.invitationUrl}
          practiceName={result.practiceName}
          copied={copied}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(result.invitationUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            } catch {
              /* ignore */
            }
          }}
          onAnother={reset}
        />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid gap-5 md:grid-cols-[1.4fr_1fr]"
        >
          <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{error}</span>
              </div>
            )}

            <Field label="Patient email" required>
              <Input type="email" value={email} onChange={setEmail} required />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First name" required>
                <Input value={firstName} onChange={setFirstName} required />
              </Field>
              <Field label="Last name" required>
                <Input value={lastName} onChange={setLastName} required />
              </Field>
            </div>
            <Field
              label="Personal note (optional)"
              hint="Appears on the patient's invitation acceptance screen."
            >
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-portal-green px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-portal-green/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <Send className="h-4 w-4" strokeWidth={1.5} />
              )}
              {submitting ? 'Sending invitation' : 'Send invitation'}
            </button>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
                Consent presets
              </p>
              <p className="mb-3 text-xs text-white/55">
                Your patient sees these on the acceptance screen and can adjust before activating the
                relationship.
              </p>
              <ConsentToggle
                label="Share CAQ assessment"
                checked={presets.consent_share_caq}
                onChange={(v) => setPresets((p) => ({ ...p, consent_share_caq: v }))}
              />
              <ConsentToggle
                label="Share active protocols"
                checked={presets.consent_share_protocols}
                onChange={(v) => setPresets((p) => ({ ...p, consent_share_protocols: v }))}
              />
              <ConsentToggle
                label="Share genetics"
                checked={presets.can_view_genetics}
                onChange={(v) => setPresets((p) => ({ ...p, can_view_genetics: v }))}
              />
              <ConsentToggle
                label="Share nutrition log"
                checked={presets.consent_share_nutrition}
                onChange={(v) => setPresets((p) => ({ ...p, consent_share_nutrition: v }))}
              />
              <ConsentToggle
                label="Share aggregate engagement score"
                checked={presets.consent_share_engagement_score}
                onChange={(v) => setPresets((p) => ({ ...p, consent_share_engagement_score: v }))}
              />
              <p className="mt-3 text-[10px] text-white/40">
                Helix Rewards balances and transactions are never shared with practitioners,
                regardless of any consent flag.
              </p>
            </section>
          </aside>
        </form>
      )}
    </div>
  );
}

function SuccessCard({
  invitationUrl,
  practiceName,
  copied,
  onCopy,
  onAnother,
}: {
  invitationUrl: string;
  practiceName: string | null;
  copied: boolean;
  onCopy: () => void;
  onAnother: () => void;
}) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15">
        <CheckCircle2 className="h-6 w-6 text-emerald-300" strokeWidth={1.5} />
      </span>
      <h2 className="text-xl font-semibold text-white">Invitation queued</h2>
      <p className="max-w-md text-sm text-white/70">
        We dispatched the invitation email. The patient will see {practiceName ?? 'your practice'} on
        the acceptance screen and confirm their data sharing consent before the relationship goes
        live.
      </p>
      <div className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-left">
        <Mail className="h-4 w-4 text-white/40" strokeWidth={1.5} />
        <span className="flex-1 truncate text-xs text-white/80">{invitationUrl}</span>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/70 hover:bg-white/[0.08]"
        >
          <Copy className="h-3 w-3" strokeWidth={1.5} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <button
        onClick={onAnother}
        className="rounded-lg border border-portal-green/40 bg-portal-green/10 px-4 py-2 text-sm font-semibold text-portal-green hover:bg-portal-green/20"
      >
        Invite another patient
      </button>
    </section>
  );
}

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-white/80">
        {label}
        {required ? <span className="ml-1 text-[#B75E18]">*</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs text-white/40">{hint}</span> : null}
    </label>
  );
}

function Input({
  value, onChange, type = 'text', required,
}: { value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
    />
  );
}

function ConsentToggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80 mt-2">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-white/20 bg-white/[0.06] text-portal-green focus:ring-portal-green"
      />
    </label>
  );
}
