'use client';

// Practitioner self-onboarding landing.
// Validates the invitation token, surfaces the waitlist data Gary collected,
// and lets the founding-cohort practitioner confirm details before the
// guided onboarding wizard fires. The actual creation of practitioners +
// practitioner_subscriptions + Foundation enrollment is handled by the
// onboarding API route in a follow-up; this page is the entry surface so
// the email link in /admin/cohorts has a destination that fails closed.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  GraduationCap,
  Building2,
} from 'lucide-react';

const supabase = createClient();

interface OnboardingContext {
  waitlistId: string;
  email: string;
  firstName: string;
  lastName: string;
  practiceName: string;
  credentialType: string;
  cohortName: string | null;
  cohortNumber: number | null;
}

export default function PractitionerOnboardPage() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ctx, setCtx] = useState<OnboardingContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setError('Missing onboarding token.');
        setLoading(false);
        return;
      }

      // Look up the waitlist row by the matching invitation token.
      const { data: row } = await (supabase as any)
        .from('practitioner_waitlist')
        .select(
          'id, email, first_name, last_name, practice_name, credential_type, assigned_cohort_id, status',
        )
        .eq('invitation_token', token)
        .maybeSingle();

      if (cancelled) return;

      if (!row) {
        setError('Invitation is invalid, expired, or already used.');
        setLoading(false);
        return;
      }
      if (row.status === 'converted_to_practitioner') {
        setError('This invitation has already been used to onboard a practitioner.');
        setLoading(false);
        return;
      }

      let cohortName: string | null = null;
      let cohortNumber: number | null = null;
      if (row.assigned_cohort_id) {
        const { data: cohort } = await (supabase as any)
          .from('practitioner_cohorts')
          .select('name, cohort_number')
          .eq('id', row.assigned_cohort_id)
          .maybeSingle();
        cohortName = cohort?.name ?? null;
        cohortNumber = cohort?.cohort_number ?? null;
      }

      if (cancelled) return;
      setCtx({
        waitlistId: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        practiceName: row.practice_name,
        credentialType: row.credential_type,
        cohortName,
        cohortNumber,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <main className="min-h-screen bg-[#0E1A30] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A2744] via-[#0E1A30] to-[#0E1A30]" />
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,rgba(45,165,160,0.30),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(183,94,24,0.20),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-20">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-portal-green/30 bg-portal-green/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-portal-green">
            <Sparkles className="h-3 w-3" strokeWidth={1.5} />
            Founding cohort onboarding
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            {ctx
              ? `Welcome aboard, ${ctx.firstName}.`
              : 'Practitioner onboarding'}
          </h1>
          {ctx?.cohortName && (
            <p className="mt-3 text-base text-white/70">
              Cohort {ctx.cohortNumber}: {ctx.cohortName.replace(/^Cohort \d+:\s*/, '')}
            </p>
          )}
        </div>
      </section>

      <section className="bg-[#0B1424]">
        <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
          {loading ? (
            <CenteredLoader />
          ) : error ? (
            <ErrorCard message={error} />
          ) : ctx ? (
            <OnboardingChecklist ctx={ctx} />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function OnboardingChecklist({ ctx }: { ctx: OnboardingContext }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Your application
        </p>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <Field label="Name" value={`${ctx.firstName} ${ctx.lastName}`} />
          <Field label="Email" value={ctx.email} />
          <Field label="Practice" value={ctx.practiceName} />
          <Field label="Credential" value={ctx.credentialType.toUpperCase()} />
        </dl>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Onboarding steps
        </p>
        <ul className="flex flex-col gap-3">
          <Step icon={ShieldCheck} title="Confirm your account">
            Verify the email above is correct. We will create your ViaCura practitioner login on
            this email.
          </Step>
          <Step icon={Building2} title="Activate Standard Portal subscription">
            $128.88 per month, includes Level 1 Foundation certification, wholesale pricing at 50
            percent off MSRP, and the full practitioner panel toolkit. Concierge support during
            founding cohort onboarding.
          </Step>
          <Step icon={GraduationCap} title="Enroll in Foundation certification">
            Free, required, 5 hours. Covers ViaCura product line, basic genetic concepts, platform
            usage. You will be issued certified status before prescribing.
          </Step>
        </ul>
      </section>

      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-portal-green px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-portal-green/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60"
      >
        Begin guided onboarding
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <p className="text-xs text-white/45">
        The guided onboarding wizard creates your account, activates your subscription, enrolls you
        in Foundation, and drops you on the practitioner dashboard. Wizard implementation lands in a
        follow up phase; until then, the ViaCura founding team will reach out personally to walk you
        through.
      </p>
    </div>
  );
}

function Step({
  icon: Icon, title, children,
}: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-portal-green/30 bg-portal-green/10">
        <Icon className="h-4 w-4 text-portal-green" strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/65">{children}</p>
      </div>
    </li>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</dt>
      <dd className="text-sm text-white">{value}</dd>
    </div>
  );
}

function CenteredLoader() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-white/55">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
      Verifying onboarding token
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
      <div className="mb-3 inline-flex items-center gap-2 text-red-200">
        <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
        <span className="text-sm font-semibold">{message}</span>
      </div>
      <Link
        href="/practitioners"
        className="inline-flex items-center gap-2 rounded-lg border border-portal-green/40 bg-portal-green/10 px-4 py-2 text-sm font-medium text-portal-green hover:bg-portal-green/20"
      >
        Apply via the public waitlist
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>
    </div>
  );
}
