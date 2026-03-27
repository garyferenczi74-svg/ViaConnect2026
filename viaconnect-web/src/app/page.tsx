'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Brain,
  Dna,
  FlaskConical,
  Users,
  Zap,
  Coins,
  Shield,
  Lock,
  Ban,
  Check,
  ArrowRight,
  Play,
} from 'lucide-react';

/* ─── Scroll‑reveal hook ──────────────────────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible');
        }),
      { threshold: 0.15 },
    );
    el.querySelectorAll('.reveal-on-scroll').forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ─── Tiny reusable bits ──────────────────────────────────────────────────── */
const SectionHeading = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h2
    className={`text-heading-1 text-center mb-4 ${className}`}
    style={{ color: 'var(--orange-500)' }}
  >
    {children}
  </h2>
);

const GlassCard = ({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={`glass-v2 glass-v2-hover transition-all duration-300 ${className}`}
    style={style}
  >
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  HOME PAGE                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const rootRef = useScrollReveal();

  return (
    <div ref={rootRef} className="min-h-screen overflow-x-hidden">
      {/* ── inline keyframes ──────────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes float-a {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -40px) scale(1.05);
          }
        }
        @keyframes float-b {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-20px, 30px) scale(0.95);
          }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        .animate-fade-in-up-d1 {
          animation: fade-in-up 0.8s 0.15s ease-out forwards;
          opacity: 0;
        }
        .animate-fade-in-up-d2 {
          animation: fade-in-up 0.8s 0.3s ease-out forwards;
          opacity: 0;
        }
        .animate-fade-in-up-d3 {
          animation: fade-in-up 0.8s 0.45s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  1 · HERO                                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section
        className="relative flex items-center justify-center min-h-screen px-6"
        style={{ background: 'var(--gradient-hero)' }}
      >
        {/* Gradient orbs */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 600,
            height: 600,
            top: '-10%',
            left: '-5%',
            borderRadius: '50%',
            background: 'var(--teal-500)',
            opacity: 0.15,
            filter: 'blur(120px)',
            animation: 'float-a 12s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            width: 500,
            height: 500,
            bottom: '-8%',
            right: '-3%',
            borderRadius: '50%',
            background: 'var(--orange-500)',
            opacity: 0.15,
            filter: 'blur(120px)',
            animation: 'float-b 14s ease-in-out infinite',
          }}
        />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <h1 className="text-display-lg text-white animate-fade-in-up">
            Your genome has a message.
            <br />
            Are you listening?
          </h1>

          <p
            className="text-body-lg mt-4 max-w-2xl mx-auto animate-fade-in-up-d1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Precision health insights from your DNA, delivered through
            formulations engineered for your unique genome.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8 animate-fade-in-up-d2">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-lg transition-transform hover:scale-105"
              style={{
                background:
                  'linear-gradient(135deg, var(--orange-500), var(--orange-400))',
                boxShadow: '0 4px 24px rgba(183,94,24,0.4)',
              }}
            >
              Start Your Genetic Journey <ArrowRight size={20} />
            </Link>
            <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-lg border border-white/20 hover:border-white/40 transition-colors bg-transparent">
              <Play size={18} /> Watch Demo
            </button>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-sm animate-fade-in-up-d3" style={{ color: 'var(--text-secondary)' }}>
            6 Genetic Panels
            <span className="mx-2" style={{ color: 'var(--teal-500)' }}>
              ·
            </span>
            27 Precision Formulations
            <span className="mx-2" style={{ color: 'var(--teal-500)' }}>
              ·
            </span>
            10-27x Bioavailability
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  2 · TRUST BAR                                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section
        className="glass-v2 py-8"
        style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none' }}
      >
        <p
          className="text-center text-xs uppercase tracking-widest mb-4"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Powered By
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 px-6">
          {[
            'GeneX360',
            'PeptideIQ',
            'CannabisIQ',
            'Terra API',
            'Supabase',
            'Vercel',
          ].map((name) => (
            <span
              key={name}
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  3 · FEATURE SHOWCASE                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="reveal-on-scroll">
          <SectionHeading>What Makes ViaConnect Different</SectionHeading>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {(
            [
              [
                Brain,
                'AI Copilot',
                'Your genome-powered health advisor that knows your DNA, tracks your biometrics, and adapts your supplement timing in real-time.',
              ],
              [
                Dna,
                'GeneX360 Dashboard',
                '6 genetic panels covering methylation, mood, sleep, recovery, metabolism, and detox. Every SNP analyzed.',
              ],
              [
                FlaskConical,
                'PeptideIQ & CannabisIQ',
                'First-mover genetic panels for peptide response and endocannabinoid system optimization.',
              ],
              [
                Users,
                'Practitioner Portal',
                'Clinical-grade tools for practitioners and naturopaths to manage patient genetic profiles and protocols.',
              ],
              [
                Zap,
                '10-27x Delivery Technology',
                'Dual liposomal-micellar delivery system engineered for maximum bioavailability.',
              ],
              [
                Coins,
                'ViaTokens',
                'Earn rewards for supplement compliance, wearable connections, and health milestones. Gamified precision health.',
              ],
            ] as const
          ).map(([Icon, title, desc], i) => (
            <div
              key={title}
              className="reveal-on-scroll"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <GlassCard className="p-6 h-full">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(45,165,160,0.12)' }}
                >
                  <Icon size={24} style={{ color: 'var(--teal-500)' }} />
                </div>
                <h3 className="text-heading-3 text-white mb-2">{title}</h3>
                <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                  {desc}
                </p>
              </GlassCard>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  4 · DEVICE MOCKUP                                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="reveal-on-scroll text-center mb-12">
          <SectionHeading>Your Health. One Dashboard.</SectionHeading>
          <p className="text-body-lg mx-auto max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            Every score, every insight, every recommendation — filtered through
            your unique genetic code.
          </p>
        </div>

        <div className="reveal-on-scroll" style={{ transitionDelay: '150ms' }}>
          <GlassCard className="p-8 rounded-2xl">
            {/* Mini dashboard mock */}
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {/* Score ring */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center score-glow"
                  style={{
                    background:
                      'conic-gradient(var(--teal-500) 0% 87%, rgba(255,255,255,0.06) 87% 100%)',
                    padding: 6,
                  }}
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{ background: 'var(--navy-800)' }}
                  >
                    <span className="text-display-md text-white">87</span>
                  </div>
                </div>
                <span
                  className="text-caption mt-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Overall Wellness
                </span>
              </div>

              {/* Daily scores */}
              <div className="flex-1 w-full">
                <p
                  className="text-overline mb-3"
                >
                  Daily Scores
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Sleep', score: 78, color: 'var(--teal-400)' },
                    { label: 'Recovery', score: 85, color: 'var(--green-500)' },
                    { label: 'Stress', score: 42, color: 'var(--red-500)' },
                    { label: 'Activity', score: 91, color: 'var(--teal-500)' },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="glass-v2 rounded-xl p-3 text-center"
                    >
                      <span
                        className="text-heading-3 block"
                        style={{ color: s.color }}
                      >
                        {s.score}
                      </span>
                      <span
                        className="text-caption"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action card */}
                <div
                  className="mt-4 rounded-xl p-4 flex items-center gap-3"
                  style={{
                    background: 'rgba(45,165,160,0.08)',
                    border: '1px solid rgba(45,165,160,0.15)',
                  }}
                >
                  <Zap size={20} style={{ color: 'var(--teal-500)' }} />
                  <div>
                    <p className="text-body-sm text-white font-medium">
                      Take Methyl-B Complex
                    </p>
                    <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
                      Optimal window: 7:30 AM — based on your MTHFR variant
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  5 · PRIVACY                                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="reveal-on-scroll">
          <SectionHeading>Your Data. Your Control.</SectionHeading>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {(
            [
              [
                Shield,
                'HIPAA Compliant',
                'Enterprise-grade security for your genetic and health data.',
              ],
              [
                Lock,
                'End-to-End Encryption',
                'Your data is encrypted at rest and in transit. Always.',
              ],
              [
                Ban,
                'We Never Sell Your Data',
                'Your genome belongs to you. Period. Disconnect anytime.',
              ],
            ] as const
          ).map(([Icon, title, desc], i) => (
            <div
              key={title}
              className="reveal-on-scroll"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <GlassCard className="p-6 text-center h-full">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(45,165,160,0.12)' }}
                >
                  <Icon size={24} style={{ color: 'var(--teal-500)' }} />
                </div>
                <h3 className="text-heading-3 text-white mb-2">{title}</h3>
                <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                  {desc}
                </p>
              </GlassCard>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  6 · PRICING                                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="reveal-on-scroll">
          <SectionHeading>Choose Your Plan</SectionHeading>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 items-stretch">
          {/* Gold */}
          <div className="reveal-on-scroll" style={{ transitionDelay: '0ms' }}>
            <GlassCard className="p-8 h-full flex flex-col">
              <h3 className="text-heading-3 text-white">Gold</h3>
              <p className="mt-2">
                <span className="text-display-md text-white">$8.88</span>
                <span className="text-body-sm" style={{ color: 'var(--text-tertiary)' }}>
                  /mo
                </span>
              </p>
              <ul className="mt-6 space-y-3 flex-1">
                {[
                  'Unlimited AI',
                  'All wearable connections',
                  'Daily precision actions',
                  'ViaTokens earning',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={16} style={{ color: 'var(--teal-500)' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?plan=gold"
                className="mt-8 block text-center py-3 rounded-xl font-semibold text-white transition-transform hover:scale-105"
                style={{
                  background:
                    'linear-gradient(135deg, var(--teal-500), var(--teal-400))',
                }}
              >
                Start Gold
              </Link>
            </GlassCard>
          </div>

          {/* Platinum (featured) */}
          <div className="reveal-on-scroll" style={{ transitionDelay: '100ms' }}>
            <div
              className="glass-v2 glass-v2-hover transition-all duration-300 p-8 h-full flex flex-col relative"
              style={{
                border: '1px solid var(--teal-500)',
                boxShadow:
                  '0 0 40px rgba(45,165,160,0.15), var(--card-shadow)',
              }}
            >
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                style={{ background: 'var(--teal-500)' }}
              >
                Most Popular
              </span>
              <h3 className="text-heading-3 text-white">Platinum</h3>
              <p className="mt-2">
                <span className="text-display-md text-white">$28.88</span>
                <span className="text-body-sm" style={{ color: 'var(--text-tertiary)' }}>
                  /mo
                </span>
              </p>
              <ul className="mt-6 space-y-3 flex-1">
                {[
                  'Everything in Gold',
                  'Weekly briefings',
                  'Predictive alerts',
                  'All widgets',
                  'Monthly challenges',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={16} style={{ color: 'var(--teal-500)' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?plan=platinum"
                className="mt-8 block text-center py-4 rounded-xl font-semibold text-white text-lg transition-transform hover:scale-105"
                style={{
                  background:
                    'linear-gradient(135deg, var(--teal-500), var(--teal-400))',
                  boxShadow: '0 4px 24px rgba(45,165,160,0.35)',
                }}
              >
                Start Platinum
              </Link>
            </div>
          </div>

          {/* Practitioner */}
          <div className="reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
            <GlassCard className="p-8 h-full flex flex-col">
              <h3 className="text-heading-3 text-white">Practitioner</h3>
              <p className="mt-2">
                <span className="text-display-md text-white">$128.88</span>
                <span className="text-body-sm" style={{ color: 'var(--text-tertiary)' }}>
                  /mo
                </span>
              </p>
              <ul className="mt-6 space-y-3 flex-1">
                {[
                  'Full practitioner portal',
                  '50 patients',
                  'Protocol builder',
                  'Video consultations',
                  'Batch ordering',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={16} style={{ color: 'var(--teal-500)' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?plan=practitioner"
                className="mt-8 block text-center py-3 rounded-xl font-semibold text-white transition-transform hover:scale-105"
                style={{
                  background:
                    'linear-gradient(135deg, var(--orange-500), var(--orange-400))',
                  boxShadow: '0 4px 24px rgba(183,94,24,0.35)',
                }}
              >
                Start Practitioner
              </Link>
            </GlassCard>
          </div>
        </div>

        <p
          className="text-center text-body-sm mt-8 reveal-on-scroll"
          style={{ color: 'var(--text-tertiary)', transitionDelay: '300ms' }}
        >
          Free tier available — basic profile, 5 AI questions/day, 1 wearable.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  7 · FOOTER CTA                                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 text-center">
        <div className="reveal-on-scroll max-w-3xl mx-auto">
          <h2 className="text-heading-2 text-white" style={{ color: 'var(--text-primary)' }}>
            Step into the future of precision health
          </h2>
          <p
            className="text-body-lg italic mt-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            One Genome. One Formulation. One Life at a Time.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 mt-8 px-10 py-4 rounded-xl font-semibold text-white text-lg transition-transform hover:scale-105"
            style={{
              background:
                'linear-gradient(135deg, var(--orange-500), var(--orange-400))',
              boxShadow: '0 4px 24px rgba(183,94,24,0.4)',
            }}
          >
            Get Started Free <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  8 · FOOTER                                                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <footer
        className="px-6 pt-16 pb-8"
        style={{
          background: 'var(--navy-900)',
          borderTop: '1px solid var(--glass-border)',
        }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <p className="text-heading-3 text-white font-bold">ViaConnect&trade;</p>
            <p className="text-body-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              by FarmCeutica Wellness LLC
            </p>
            <p className="text-body-sm mt-3" style={{ color: 'var(--text-tertiary)' }}>
              Buffalo, NY &middot; Calgary, AB
            </p>
          </div>

          {/* Link columns */}
          {[
            {
              heading: 'Product',
              links: [
                { label: 'Features', href: '/features' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Science', href: '/science' },
              ],
            },
            {
              heading: 'Company',
              links: [
                { label: 'About', href: '/about' },
                { label: 'Team', href: '/team' },
                { label: 'Careers', href: '/careers' },
              ],
            },
            {
              heading: 'Legal',
              links: [
                { label: 'Privacy', href: '/privacy' },
                { label: 'Terms', href: '/terms' },
                { label: 'HIPAA', href: '/hipaa' },
              ],
            },
          ].map((col) => (
            <div key={col.heading}>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {col.heading}
              </p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-body-sm transition-colors hover:text-white"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="max-w-7xl mx-auto mt-12 pt-6 text-center text-caption"
          style={{
            borderTop: '1px solid var(--glass-border)',
            color: 'var(--text-tertiary)',
          }}
        >
          &copy; 2026 FarmCeutica Wellness LLC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
