import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Sparkles, AlertCircle } from 'lucide-react';
import { validateInvitationToken } from '@/lib/practitioner/invitations';
import { InvitedWaitlistForm } from './InvitedWaitlistForm';

export const metadata: Metadata = {
  title: 'You are invited, ViaCura for Practitioners',
  description:
    'A founding-cohort invitation to apply to the ViaCura practitioner platform.',
};

interface PageProps {
  searchParams: { token?: string };
}

export default async function InvitedLanding({ searchParams }: PageProps) {
  const token = (searchParams.token ?? '').trim();
  const validation = token
    ? await validateInvitationToken(token, { claim: false })
    : { valid: false, error: 'No invitation token provided.' };

  return (
    <main className="min-h-screen bg-[#0E1A30] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A2744] via-[#0E1A30] to-[#0E1A30]" />
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,rgba(45,165,160,0.30),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(183,94,24,0.20),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16 md:px-10 md:py-20">
          <p className="inline-flex items-center gap-2 self-start rounded-full border border-[#B75E18]/30 bg-[#B75E18]/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-[#E89559]">
            <Sparkles className="h-3 w-3" strokeWidth={1.5} />
            Founding cohort invitation
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            {validation.valid
              ? `You have been personally invited to ViaCura.`
              : `This invitation link could not be verified.`}
          </h1>
          {validation.valid && validation.invitedByDisplay && (
            <p className="text-base text-white/70 md:text-lg">
              Invitation from <span className="text-white">{validation.invitedByDisplay}</span>.
            </p>
          )}
        </div>
      </section>

      <section className="bg-[#0B1424]">
        <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
          {!validation.valid ? (
            <InvalidNotice reason={validation.error ?? 'Invalid or expired invitation.'} />
          ) : (
            <>
              {validation.personalNote && (
                <div className="mb-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-[0.18em] text-white/45">
                      A personal note
                    </p>
                    <p className="text-sm leading-relaxed text-white/80 whitespace-pre-line">
                      {validation.personalNote}
                    </p>
                  </div>
                </div>
              )}

              <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-[#2DA5A0]">
                Apply now
              </h2>
              <p className="mb-8 text-2xl font-semibold leading-snug text-white md:text-3xl">
                A few minutes is all it takes.
              </p>

              <InvitedWaitlistForm
                token={token}
                prefillEmail={validation.targetEmail}
                expectedCredentialType={validation.expectedCredentialType}
              />
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function InvalidNotice({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
        <AlertCircle className="h-5 w-5 text-red-300" strokeWidth={1.5} />
      </span>
      <div>
        <h3 className="text-lg font-semibold text-white">{reason}</h3>
        <p className="mt-2 text-sm text-white/60">
          You can still apply through the public waitlist below.
        </p>
      </div>
      <Link
        href="/practitioners"
        className="rounded-lg border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 px-4 py-2 text-sm font-medium text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
      >
        Open the public waitlist
      </Link>
    </div>
  );
}
