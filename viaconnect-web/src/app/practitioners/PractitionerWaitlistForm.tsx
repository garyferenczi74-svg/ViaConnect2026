'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import {
  waitlistSubmissionSchema,
  type WaitlistSubmission,
  type CredentialType,
  type PrimaryClinicalFocus,
  type ReferralSource,
} from '@/lib/practitioner/waitlistSchema';

interface FormState extends Partial<WaitlistSubmission> {}

const CREDENTIAL_OPTIONS: { value: CredentialType; label: string }[] = [
  { value: 'md',   label: 'MD, Medical Doctor' },
  { value: 'do',   label: 'DO, Doctor of Osteopathic Medicine' },
  { value: 'nd',   label: 'ND, Naturopathic Doctor' },
  { value: 'dc',   label: 'DC, Doctor of Chiropractic' },
  { value: 'np',   label: 'NP, Nurse Practitioner' },
  { value: 'pa',   label: 'PA, Physician Assistant' },
  { value: 'rd',   label: 'RD, Registered Dietitian' },
  { value: 'lac',  label: 'LAc, Licensed Acupuncturist' },
  { value: 'other', label: 'Other' },
];

const FOCUS_OPTIONS: { value: PrimaryClinicalFocus; label: string }[] = [
  { value: 'functional_medicine',   label: 'Functional medicine' },
  { value: 'integrative_medicine',  label: 'Integrative medicine' },
  { value: 'naturopathic',          label: 'Naturopathic' },
  { value: 'chiropractic',          label: 'Chiropractic' },
  { value: 'nutrition',             label: 'Nutrition' },
  { value: 'acupuncture_tcm',       label: 'Acupuncture, TCM' },
  { value: 'ayurvedic',             label: 'Ayurvedic' },
  { value: 'longevity',             label: 'Longevity' },
  { value: 'precision_wellness',    label: 'Precision wellness' },
  { value: 'general_primary_care',  label: 'General primary care' },
  { value: 'other',                 label: 'Other' },
];

const REFERRAL_OPTIONS: { value: ReferralSource; label: string }[] = [
  { value: 'forbes_article',     label: 'Forbes article' },
  { value: 'carlyle_social',     label: 'Carlyle social channel' },
  { value: 'podcast',            label: 'Podcast' },
  { value: 'direct_email',       label: 'Direct email from the team' },
  { value: 'colleague_referral', label: 'Colleague referral' },
  { value: 'conference',         label: 'Conference' },
  { value: 'search_engine',      label: 'Search engine' },
  { value: 'social_media',       label: 'Social media' },
  { value: 'other',              label: 'Other' },
];

export function PractitionerWaitlistForm() {
  const params = useSearchParams();
  const [form, setForm] = useState<FormState>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Capture UTM off the URL and invitation context from sessionStorage
  // (populated by /practitioners/invited when a VIP token is present).
  useEffect(() => {
    let invitationToken: string | undefined;
    let prefillEmail: string | undefined;
    let prefillCredential: CredentialType | undefined;
    if (typeof window !== 'undefined') {
      try {
        invitationToken = window.sessionStorage.getItem('practitioner_invitation_token') ?? undefined;
        prefillEmail = window.sessionStorage.getItem('practitioner_invitation_email') ?? undefined;
        const cred = window.sessionStorage.getItem('practitioner_invitation_credential');
        if (cred) prefillCredential = cred as CredentialType;
      } catch {
        // sessionStorage may be unavailable
      }
    }
    setForm((prev) => ({
      ...prev,
      utmSource: params.get('utm_source') ?? undefined,
      utmMedium: params.get('utm_medium') ?? undefined,
      utmCampaign: params.get('utm_campaign') ?? undefined,
      invitationToken: invitationToken ?? prev.invitationToken,
      email: prefillEmail ?? prev.email,
      credentialType: prefillCredential ?? prev.credentialType,
    }));
  }, [params]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErrorMessage(null);

    const parsed = waitlistSubmissionSchema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setErrorMessage(`Please review the form: ${first?.message ?? 'invalid input'}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/waitlist/practitioner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (res.status === 201) {
        setSubmitted(true);
        return;
      }
      const j = await res.json().catch(() => ({}));
      setErrorMessage(
        j.error ?? `Submission failed (status ${res.status}). Please try again shortly.`,
      );
    } catch {
      setErrorMessage('Network error. Please try again shortly.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-8 text-center"
      >
        <CheckCircle2 className="h-10 w-10 text-[#2DA5A0]" strokeWidth={1.5} />
        <h3 className="text-xl font-semibold text-white">
          Application received.
        </h3>
        <p className="max-w-md text-sm text-white/70">
          Thank you. Our founding team reviews every application personally. You will receive a confirmation
          email shortly, and a Cohort 1 status update over the coming weeks.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{errorMessage}</span>
        </div>
      )}

      <Section title="About you">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="First name" required>
            <Input
              required
              value={form.firstName ?? ''}
              onChange={(v) => update('firstName', v)}
            />
          </Field>
          <Field label="Last name" required>
            <Input
              required
              value={form.lastName ?? ''}
              onChange={(v) => update('lastName', v)}
            />
          </Field>
          <Field label="Email" required>
            <Input
              required
              type="email"
              value={form.email ?? ''}
              onChange={(v) => update('email', v)}
            />
          </Field>
          <Field label="Phone (optional)">
            <Input
              type="tel"
              value={form.phone ?? ''}
              onChange={(v) => update('phone', v)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Your practice">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Practice name" required>
            <Input
              required
              value={form.practiceName ?? ''}
              onChange={(v) => update('practiceName', v)}
            />
          </Field>
          <Field label="Practice URL (optional)">
            <Input
              type="url"
              placeholder="https://"
              value={form.practiceUrl ?? ''}
              onChange={(v) => update('practiceUrl', v)}
            />
          </Field>
          <Field label="City">
            <Input
              value={form.practiceCity ?? ''}
              onChange={(v) => update('practiceCity', v)}
            />
          </Field>
          <Field label="State or region">
            <Input
              value={form.practiceState ?? ''}
              onChange={(v) => update('practiceState', v)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Credentials and clinical focus">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Credential" required>
            <Select
              required
              value={form.credentialType ?? ''}
              onChange={(v) => update('credentialType', v as CredentialType)}
              options={CREDENTIAL_OPTIONS}
              placeholder="Select credential"
            />
          </Field>
          <Field label="Years in practice (optional)">
            <Input
              type="number"
              min={0}
              max={80}
              value={form.yearsInPractice ?? ''}
              onChange={(v) =>
                update('yearsInPractice', v === '' ? undefined : Number(v))
              }
            />
          </Field>
          <Field label="Primary clinical focus" required>
            <Select
              required
              value={form.primaryClinicalFocus ?? ''}
              onChange={(v) => update('primaryClinicalFocus', v as PrimaryClinicalFocus)}
              options={FOCUS_OPTIONS}
              placeholder="Select focus"
            />
          </Field>
          <Field label="Approximate patient panel (optional)">
            <Input
              type="number"
              min={0}
              value={form.approximatePatientPanelSize ?? ''}
              onChange={(v) =>
                update('approximatePatientPanelSize', v === '' ? undefined : Number(v))
              }
            />
          </Field>
        </div>
      </Section>

      <Section title="Why ViaCura">
        <Field label="How did you hear about ViaCura" required>
          <Select
            required
            value={form.referralSource ?? ''}
            onChange={(v) => update('referralSource', v as ReferralSource)}
            options={REFERRAL_OPTIONS}
            placeholder="Select source"
          />
        </Field>
        <Field
          label="What draws you to apply"
          hint="Twenty characters minimum, two thousand max"
          required
        >
          <Textarea
            required
            rows={5}
            value={form.interestReason ?? ''}
            onChange={(v) => update('interestReason', v)}
          />
        </Field>
        <Field label="Biggest clinical challenge you would like the platform to solve (optional)">
          <Textarea
            rows={3}
            value={form.biggestClinicalChallenge ?? ''}
            onChange={(v) => update('biggestClinicalChallenge', v)}
          />
        </Field>
      </Section>

      <button
        type="submit"
        disabled={submitting}
        className="group inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#2DA5A0] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#26948F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
        ) : (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
        )}
        {submitting ? 'Submitting application' : 'Submit application'}
      </button>
    </form>
  );
}

// ─── Building blocks ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <h3 className="mb-4 text-xs uppercase tracking-[0.18em] text-white/45">{title}</h3>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
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
  value,
  onChange,
  type = 'text',
  required,
  min,
  max,
  placeholder,
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      required={required}
      min={min}
      max={max}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-[#0E1A30] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#2DA5A0]/60 focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]/30"
    />
  );
}

function Textarea({
  value,
  onChange,
  rows = 4,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <textarea
      required={required}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-[#0E1A30] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#2DA5A0]/60 focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]/30"
    />
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <select
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg border border-white/10 bg-[#0E1A30] px-3 py-2.5 text-sm text-white focus:border-[#2DA5A0]/60 focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]/30"
    >
      <option value="" disabled>{placeholder ?? 'Select'}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="text-black">
          {o.label}
        </option>
      ))}
    </select>
  );
}
