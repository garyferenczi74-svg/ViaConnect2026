'use client';

// Patient-facing landing for a practitioner invitation token.
// Validates the token client-side via Supabase, shows the practitioner +
// practice info, and lets the patient confirm or adjust consent flags
// before the relationship activates. Patients must be authenticated (or
// sign in / sign up) before activating; the page links to /login with
// redirectTo preserving the token.

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

const supabase = createClient();

interface InvitationContext {
  relationshipId: string;
  practitionerUserId: string;
  practiceName: string | null;
  practitionerName: string | null;
  invitationNote: string | null;
  presets: {
    consent_share_caq: boolean;
    consent_share_engagement_score: boolean;
    consent_share_protocols: boolean;
    consent_share_nutrition: boolean;
    can_view_genetics: boolean;
  };
}

export default function PatientInvitedPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PatientInvitedInner />
    </Suspense>
  );
}

function PageLoader() {
  return (
    <main className="min-h-screen bg-[#0E1A30] text-white">
      <section className="bg-[#0B1424]">
        <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
          <CenteredLoader />
        </div>
      </section>
    </main>
  );
}

function PatientInvitedInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<InvitationContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [presets, setPresets] = useState<InvitationContext['presets'] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setError('Missing invitation token.');
        setLoading(false);
        return;
      }

      // Public lookup via SECURITY DEFINER RPC (migration _150) so the
      // landing page can resolve practitioner identity without exposing the
      // bulk practitioner_patients row to anon/authenticated SELECT.
      const [{ data: { user } }, { data: rpc, error: rpcErr }] = await Promise.all([
        supabase.auth.getUser(),
        (supabase as any).rpc('lookup_practitioner_invitation', { p_token: token }),
      ]);

      if (cancelled) return;
      setAuthedUserId(user?.id ?? null);

      if (rpcErr) {
        setError(rpcErr.message);
        setLoading(false);
        return;
      }
      const row = Array.isArray(rpc) ? rpc[0] : rpc;
      if (!row || row.ok !== true) {
        setError('Invitation is invalid, expired, or already accepted.');
        setLoading(false);
        return;
      }

      const presetState = {
        consent_share_caq:              !!row.consent_share_caq,
        consent_share_engagement_score: !!row.consent_share_engagement_score,
        consent_share_protocols:        !!row.consent_share_protocols,
        consent_share_nutrition:        !!row.consent_share_nutrition,
        can_view_genetics:              !!row.can_view_genetics,
      };
      setCtx({
        relationshipId: '', // resolved on accept; not needed for the form
        practitionerUserId: row.practitioner_user_id,
        practiceName:     row.practice_name ?? null,
        practitionerName: row.practitioner_display_name ?? null,
        invitationNote:   row.invitation_note ?? null,
        presets: presetState,
      });
      setPresets(presetState);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function accept() {
    if (!ctx || !authedUserId || !presets) return;
    setAccepting(true);
    // Atomic claim via SECURITY DEFINER RPC. The function's UPDATE filters
    // on token + status='invited' and uses ROW_COUNT to detect double-claim
    // losers, so a stale or leaked token cannot overwrite a row that was
    // already accepted by a racing tab.
    const { data: rpc, error: rpcErr } = await (supabase as any).rpc(
      'accept_practitioner_invitation',
      {
        p_token: token,
        p_consent_share_caq:              presets.consent_share_caq,
        p_consent_share_engagement_score: presets.consent_share_engagement_score,
        p_consent_share_protocols:        presets.consent_share_protocols,
        p_consent_share_nutrition:        presets.consent_share_nutrition,
        p_can_view_genetics:              presets.can_view_genetics,
      },
    );
    setAccepting(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    const row = Array.isArray(rpc) ? rpc[0] : rpc;
    if (!row || row.ok !== true) {
      setError(
        row?.error_code === 'unauthenticated'
          ? 'Please sign in to accept the invitation.'
          : 'Invitation could not be accepted. It may have been used or revoked.',
      );
      return;
    }
    setAccepted(true);
  }

  return (
    <main className="min-h-screen bg-[#0E1A30] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A2744] via-[#0E1A30] to-[#0E1A30]" />
        <div className="relative mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-20">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-portal-green/30 bg-portal-green/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-portal-green">
            <UserCheck className="h-3 w-3" strokeWidth={1.5} />
            Practitioner invitation
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            {accepted
              ? 'You are connected.'
              : ctx
                ? `${ctx.practiceName ?? 'A ViaCura practitioner'} invited you to connect on ViaCura.`
                : 'Practitioner invitation'}
          </h1>
          {ctx?.practitionerName && !accepted && (
            <p className="mt-3 text-base text-white/70">
              From <span className="text-white">{ctx.practitionerName}</span>.
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
          ) : accepted ? (
            <AcceptedCard />
          ) : !authedUserId ? (
            <SignInPrompt token={token} />
          ) : ctx && presets ? (
            <ConsentForm
              ctx={ctx}
              presets={presets}
              setPresets={setPresets}
              onAccept={accept}
              accepting={accepting}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ConsentForm({
  ctx, presets, setPresets, onAccept, accepting,
}: {
  ctx: InvitationContext;
  presets: InvitationContext['presets'];
  setPresets: (p: InvitationContext['presets']) => void;
  onAccept: () => void;
  accepting: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {ctx.invitationNote && (
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-portal-green" strokeWidth={1.5} />
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.18em] text-white/45">A note for you</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">{ctx.invitationNote}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-portal-green" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-white">What you choose to share</h2>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-white/60">
          You decide which parts of your record your practitioner can see. Helix Rewards balances and
          transactions are never shared, regardless of these settings.
        </p>
        <ConsentRow
          label="My CAQ assessment"
          desc="Symptoms, medications, goals captured during onboarding"
          checked={presets.consent_share_caq}
          onChange={(v) => setPresets({ ...presets, consent_share_caq: v })}
        />
        <ConsentRow
          label="My active protocols"
          desc="Current supplement protocol and adherence"
          checked={presets.consent_share_protocols}
          onChange={(v) => setPresets({ ...presets, consent_share_protocols: v })}
        />
        <ConsentRow
          label="My genetics"
          desc="GeneX360 results when present"
          checked={presets.can_view_genetics}
          onChange={(v) => setPresets({ ...presets, can_view_genetics: v })}
        />
        <ConsentRow
          label="My nutrition log"
          desc="Daily meal history and macro tracking"
          checked={presets.consent_share_nutrition}
          onChange={(v) => setPresets({ ...presets, consent_share_nutrition: v })}
        />
        <ConsentRow
          label="My aggregate engagement score"
          desc="A single 0 to 100 number; no token activity"
          checked={presets.consent_share_engagement_score}
          onChange={(v) => setPresets({ ...presets, consent_share_engagement_score: v })}
        />
      </div>

      <button
        type="button"
        onClick={onAccept}
        disabled={accepting}
        className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-portal-green px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-portal-green/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {accepting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
        Accept invitation and activate
      </button>
    </div>
  );
}

function SignInPrompt({ token }: { token: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-sm text-white/75">
        Sign in to your ViaCura account to accept this invitation. If you do not have an account
        yet, create one with the same email your practitioner used.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/login?redirectTo=${encodeURIComponent(`/patients/invited?token=${token}`)}`}
          className="inline-flex items-center gap-2 rounded-lg bg-portal-green px-4 py-2 text-sm font-semibold text-white hover:bg-portal-green/90"
        >
          Sign in
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
        <Link
          href={`/signup?redirectTo=${encodeURIComponent(`/patients/invited?token=${token}`)}`}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.08]"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}

function AcceptedCard() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
      <CheckCircle2 className="h-10 w-10 text-emerald-300" strokeWidth={1.5} />
      <h3 className="text-xl font-semibold text-white">Invitation accepted</h3>
      <p className="max-w-md text-sm text-white/70">
        Your relationship is active. Your practitioner can now see the data you chose to share. You
        can adjust these settings any time from your account.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg bg-portal-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-portal-green/90"
      >
        Go to my dashboard
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
      <span>{message}</span>
    </div>
  );
}

function CenteredLoader() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-white/55">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
      Verifying invitation
    </div>
  );
}

function ConsentRow({
  label, desc, checked, onChange,
}: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 mt-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.06] text-portal-green focus:ring-portal-green"
      />
      <span className="flex-1">
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="block text-xs text-white/55">{desc}</span>
      </span>
    </label>
  );
}
