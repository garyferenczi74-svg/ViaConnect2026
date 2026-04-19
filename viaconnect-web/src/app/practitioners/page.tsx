import type { Metadata } from 'next';
import { PractitionerWaitlistForm } from './PractitionerWaitlistForm';
import {
  Microscope,
  Dna,
  HeartPulse,
  ShieldCheck,
  GraduationCap,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Practitioners, ViaCura by FarmCeutica Wellness',
  description:
    'Precision wellness for your patients. Pharmaceutical-grade infrastructure for your practice. Join the founding cohort of ViaCura practitioners.',
};

const PILLARS = [
  {
    Icon: Microscope,
    title: 'Precision protocols',
    body: 'Build evidence-grounded protocols with your patients\u2019 CAQ, labs, and Bio Optimization Score on a single canvas.',
  },
  {
    Icon: Dna,
    title: 'GeneX360 genetic integration',
    body: 'Apply patient genetic results inside your protocol builder; methylation, detox, neurotransmitter, and longevity pathways covered.',
  },
  {
    Icon: HeartPulse,
    title: 'Wholesale pricing, drop-ship to patient',
    body: 'FarmCeutica products at 50 percent off MSRP, drop-shipped to your patients with your name on the experience.',
  },
];

const COHORT_DETAILS = [
  { Icon: Users, label: '25 founding practitioners' },
  { Icon: GraduationCap, label: 'Concierge onboarding with the founders' },
  { Icon: ShieldCheck, label: 'Full Foundation certification included' },
];

export default function PractitionersLanding() {
  return (
    <main className="min-h-screen bg-[#0E1A30] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A2744] via-[#0E1A30] to-[#0E1A30]" />
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,rgba(45,165,160,0.35),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(183,94,24,0.20),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20 md:px-10 md:py-28">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-[#2DA5A0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2DA5A0]" />
              Cohort 1, now selecting
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Precision wellness for your patients.
              <br className="hidden md:block" />
              <span className="text-[#2DA5A0]"> Pharmaceutical grade infrastructure for your practice.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
              ViaCura is the practitioner platform from FarmCeutica Wellness. We are inviting twenty five founding
              practitioners to onboard with concierge support at portal launch in Q1 2027. Apply to join the waitlist.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {COHORT_DETAILS.map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2DA5A0]/30 bg-[#2DA5A0]/10">
                  <Icon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
                </span>
                <span className="text-sm text-white/85">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-b border-white/10 bg-[#0E1A30]">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
          <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-[#2DA5A0]">
            What you get
          </h2>
          <p className="mb-10 max-w-2xl text-2xl font-semibold leading-snug text-white md:text-3xl">
            A clinical platform built around the way you actually practice.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#1A2744]/60 p-6 backdrop-blur-md transition-colors hover:border-[#2DA5A0]/40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]/30">
                  <Icon className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
                </span>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="bg-[#0B1424]">
        <div className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-20">
          <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-[#B75E18]">
            Apply
          </h2>
          <p className="mb-10 text-2xl font-semibold leading-snug text-white md:text-3xl">
            Tell us about your practice.
          </p>
          <PractitionerWaitlistForm />
        </div>
      </section>

      {/* Footer note */}
      <footer className="border-t border-white/10 bg-[#0E1A30] py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-white/40 md:px-10">
          ViaCura is operated by FarmCeutica Wellness LLC. Practitioner portal access is granted by application
          only during the founding cohort window. By applying, you consent to receive related communications;
          you may unsubscribe at any time.
        </div>
      </footer>
    </main>
  );
}
