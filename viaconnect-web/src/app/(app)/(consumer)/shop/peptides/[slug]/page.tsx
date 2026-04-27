'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  FlaskConical,
  Dna,
  Battery,
  Zap,
  Flame,
  BrainCircuit,
  Brain,
  Shield,
  Activity,
  Clock,
  Heart,
  Leaf,
  TrendingDown,
  Syringe,
  AlertTriangle,
  CheckCircle2,
  Beaker,
  Calendar,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { getPeptideById } from '@/config/peptide-database/registry';
import { PeptideDisclaimerBanner } from '@/components/peptide-protocol/PeptideDisclaimerBanner';
import { SharePeptideButton } from '@/components/shop/SharePeptideButton';

const ICON_MAP: Record<string, LucideIcon> = {
  Dna,
  Battery,
  Zap,
  Flame,
  BrainCircuit,
  Brain,
  Shield,
  Activity,
  Clock,
  Heart,
  Leaf,
  TrendingDown,
  FlaskConical,
};

const FORM_LABELS: Record<string, string> = {
  liposomal: 'Liposomal',
  micellar: 'Micellar',
  injectable: 'Injectable',
  nasal_spray: 'Nasal Spray',
};

const FORM_DESCRIPTIONS: Record<string, string> = {
  liposomal: '10–28× absorption via phospholipid bilayer encapsulation',
  micellar: '10–28× absorption via micelle self-assembly in the gut',
  injectable: 'Direct subcutaneous delivery for maximum systemic bioavailability',
  nasal_spray: 'Rapid CNS access via nasal mucosa, bypassing first-pass metabolism',
};

const EVIDENCE_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  strong: {
    bg: 'rgba(34,197,94,0.12)',
    text: '#22C55E',
    border: 'rgba(34,197,94,0.30)',
    label: 'Strong Evidence',
  },
  moderate: {
    bg: 'rgba(245,158,11,0.12)',
    text: '#F59E0B',
    border: 'rgba(245,158,11,0.30)',
    label: 'Moderate Evidence',
  },
  emerging: {
    bg: 'rgba(168,85,247,0.12)',
    text: '#A855F7',
    border: 'rgba(168,85,247,0.30)',
    label: 'Emerging Evidence',
  },
};

interface PageProps {
  params: { slug: string };
}

export default function PeptideDetailPage({ params }: PageProps) {
  const peptide = getPeptideById(params.slug);

  if (!peptide) {
    notFound();
  }

  // Standing rule: never serve a Semaglutide detail page even if registry adds one later
  if (peptide.id.includes('semaglutide') || peptide.name.toLowerCase().includes('semaglutide')) {
    notFound();
  }

  const Icon = ICON_MAP[peptide.categoryIcon] ?? FlaskConical;
  const evidence = EVIDENCE_STYLE[peptide.evidenceLevel] ?? EVIDENCE_STYLE.emerging;
  const isInjectableOnly =
    peptide.dosingForms.length === 1 && peptide.dosingForms[0].form === 'injectable';
  const isRetatrutide = peptide.id === 'retatrutide';

  return (
    <div
      className="min-h-screen px-3 py-5 sm:px-4 md:px-8 md:py-6"
      style={{ background: 'linear-gradient(180deg, #0F1520, #1A2744)' }}
    >
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Back link */}
        <Link
          href="/shop/peptides"
          className="inline-flex items-center gap-1.5 text-xs text-[rgba(255,255,255,0.45)] transition-colors hover:text-[rgba(255,255,255,0.75)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back to Peptide Catalog
        </Link>

        {/* Disclaimer banner */}
        <PeptideDisclaimerBanner />

        {/* Hero */}
        <div
          className="rounded-2xl border p-4 sm:p-5 md:p-6"
          style={{
            background: `linear-gradient(135deg, ${peptide.categoryColor}1A, ${peptide.categoryColor}05)`,
            borderColor: `${peptide.categoryColor}33`,
          }}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14"
              style={{
                background: `${peptide.categoryColor}26`,
                border: `1px solid ${peptide.categoryColor}40`,
              }}
            >
              <Icon
                className="h-5 w-5 sm:h-7 sm:w-7"
                strokeWidth={1.5}
                style={{ color: peptide.categoryColor }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="break-words text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: `${peptide.categoryColor}CC` }}
              >
                {peptide.category}
              </p>
              <h1 className="mt-1 break-words text-xl font-bold leading-tight text-white sm:text-2xl md:text-3xl">
                {peptide.name}
              </h1>
              <p className="mt-1 break-words text-xs text-[rgba(255,255,255,0.55)] sm:text-sm">
                {peptide.type}
              </p>

              {/* Badges */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: evidence.bg,
                    color: evidence.text,
                    borderColor: evidence.border,
                  }}
                >
                  <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
                  {evidence.label}
                </span>
                {isInjectableOnly && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(251,146,60,0.30)] bg-[rgba(251,146,60,0.12)] px-3 py-1 text-xs font-medium text-[#FB923C]">
                    <Syringe className="h-3 w-3" strokeWidth={1.5} />
                    Injectable Only
                  </span>
                )}
                {isRetatrutide && (
                  <span className="rounded-full border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.12)] px-3 py-1 text-xs font-medium text-[#F87171]">
                    Never Stacked
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mechanism + How It Works */}
        <Section title="About This Peptide" icon={Beaker}>
          <p className="text-sm leading-relaxed text-[rgba(255,255,255,0.70)]">
            {peptide.howItWorks}
          </p>
          <div className="mt-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.40)]">
              Mechanism of Action
            </p>
            <p className="mt-1 text-sm text-[rgba(255,255,255,0.65)]">{peptide.mechanism}</p>
          </div>
        </Section>

        {/* Key Highlights */}
        {peptide.keyHighlights.length > 0 && (
          <Section title="Key Highlights" icon={CheckCircle2}>
            <ul className="space-y-2">
              {peptide.keyHighlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-[rgba(255,255,255,0.65)]">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#2DA5A0]" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Performance Profile */}
        {peptide.performanceProfile.length > 0 && (
          <Section title="Performance Profile" icon={Activity}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {peptide.performanceProfile.map((m, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.40)]">
                    {m.metric}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white">{m.value}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Delivery Forms */}
        <Section title="Delivery Forms & Protocols" icon={FlaskConical}>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {peptide.dosingForms.map((df) => (
              <div
                key={df.form}
                className="rounded-xl border border-[rgba(45,165,160,0.20)] bg-[rgba(45,165,160,0.06)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#2DA5A0]">
                    {FORM_LABELS[df.form] ?? df.form}
                  </p>
                  {df.form === 'injectable' && (
                    <Syringe className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={1.5} />
                  )}
                </div>
                <p className="mt-1 text-[10px] text-[rgba(255,255,255,0.40)]">
                  {FORM_DESCRIPTIONS[df.form] ?? ''}
                </p>
                <p className="mt-2 text-xs text-[rgba(255,255,255,0.70)]">{df.protocol}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Cycling + Onset */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054] p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.40)]">
                Cycle Protocol
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[rgba(255,255,255,0.70)]">
              {peptide.cycleProtocol}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054] p-4">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.40)]">
                Onset Timeline
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[rgba(255,255,255,0.70)]">
              {peptide.onsetTimeline}
            </p>
          </div>
        </div>

        {/* GeneX360 Synergy */}
        {peptide.targetVariants.length > 0 && (
          <Section title="GeneX360™ Genetic Synergy" icon={Dna}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[rgba(45,165,160,0.30)] bg-[rgba(45,165,160,0.12)] px-3 py-1 text-xs font-medium text-[#2DA5A0]">
                  {peptide.genexPanel} Panel
                </span>
                {peptide.targetVariants.map((v) => (
                  <span
                    key={v}
                    className="rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-xs font-mono text-[rgba(255,255,255,0.65)]"
                  >
                    {v}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-[rgba(255,255,255,0.65)]">
                {peptide.genexSynergy}
              </p>
            </div>
          </Section>
        )}

        {/* Share with Practitioner */}
        <div className="rounded-2xl border border-[rgba(45,165,160,0.20)] bg-gradient-to-br from-[rgba(45,165,160,0.10)] to-[rgba(26,39,68,0.40)] p-5 md:p-6">
          <h3 className="text-base font-semibold text-white">Share With Your Practitioner</h3>
          <p className="mt-1 text-sm leading-relaxed text-[rgba(255,255,255,0.55)]">
            Your peptide profile can be shared directly with your licensed practitioner,
            naturopath, or prescribing physician for personalized protocol design based on
            your CAQ and GeneX360™ data.
          </p>
          <div className="mt-4">
            <SharePeptideButton peptide={peptide} />
          </div>
        </div>

        {/* Bottom reminder */}
        <div className="rounded-2xl border border-[rgba(183,94,24,0.20)] bg-[rgba(183,94,24,0.08)] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B75E18]"
              strokeWidth={1.5}
            />
            <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.55)]">
              <strong className="text-[#B75E18]">Educational information only.</strong>{' '}
              FarmCeutica Wellness LLC does not sell, dispense, or distribute peptides at
              retail. Statements have not been evaluated by the FDA. Always consult a
              qualified healthcare professional before beginning any peptide protocol.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable section wrapper for the detail page
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054] p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon
          className="h-4 w-4 flex-shrink-0 text-[#2DA5A0]"
          strokeWidth={1.5}
        />
        <h2 className="break-words text-xs font-semibold uppercase tracking-wider text-white sm:text-sm">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
