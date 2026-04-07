"use client";

// Prompt #53 — /shop/peptides/[slug]
//
// Full peptide profile detail page. Renders every section: hero,
// description, mechanism of action, primary benefits, delivery forms,
// research status, contraindications, and practitioner notes. Disclaimer
// banner is sticky; full disclaimer block sits above and below the body.
// Share-with-practitioner buttons (Copy / Email) are the only CTAs —
// there is NO purchase button anywhere on this page.

import { useMemo } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Flame,
  Zap,
  Brain,
  Clock,
  Shield,
  TrendingUp,
  FlaskConical,
  Microscope,
  Syringe,
  Droplets,
  Wind,
  AlertCircle,
  Ban,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  PEPTIDE_CATALOG,
  PEPTIDE_CATEGORIES,
  type PeptideDeliveryForm,
  type PeptideProduct,
} from "@/data/peptideCatalog";
import { PeptideDisclaimer } from "@/components/shop/PeptideDisclaimer";
import { ShareWithPractitionerButton } from "@/components/shop/ShareWithPractitionerButton";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Heart,
  Flame,
  Zap,
  Brain,
  Clock,
  Shield,
  TrendingUp,
};

const DELIVERY_META: Record<
  PeptideDeliveryForm,
  { icon: LucideIcon; absorption: string; note: string }
> = {
  Liposomal: {
    icon: Droplets,
    absorption: "10–27× absorption",
    note: "Phospholipid encapsulation for high oral bioavailability",
  },
  Micellar: {
    icon: Droplets,
    absorption: "10–27× absorption",
    note: "Micelle formulation for fat-soluble peptide transport",
  },
  Injectable: {
    icon: Syringe,
    absorption: "Direct systemic delivery",
    note: "Subcutaneous or intramuscular administration",
  },
  "Nasal Spray": {
    icon: Wind,
    absorption: "Rapid CNS access",
    note: "Intranasal route bypassing first-pass metabolism",
  },
};

const RESEARCH_BADGE: Record<
  PeptideProduct["researchStatus"],
  { label: string; classes: string }
> = {
  established: {
    label: "Established Research",
    classes: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  emerging: {
    label: "Emerging Research",
    classes: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
  novel: {
    label: "Novel / Preclinical",
    classes: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
};

export default function PeptideDetailPage() {
  const params = useParams<{ slug: string }>();
  const reduce = useReducedMotion();
  const slug = Array.isArray(params?.slug) ? params!.slug[0] : params?.slug;
  const peptide = useMemo(
    () => PEPTIDE_CATALOG.find((p) => p.slug === slug),
    [slug],
  );

  if (!peptide) {
    notFound();
  }

  const meta = PEPTIDE_CATEGORIES.find((c) => c.name === peptide.category);
  const Icon = meta ? CATEGORY_ICONS[meta.icon] ?? FlaskConical : FlaskConical;
  const accent = meta?.color ?? "#2DA5A0";
  const research = RESEARCH_BADGE[peptide.researchStatus];
  const isExcluded = peptide.slug === "semaglutide-reference";

  return (
    <div className="min-h-screen bg-[#1A2744] text-white">
      <PeptideDisclaimer variant="banner" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/shop/peptides"
          className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back to Peptide Catalog
        </Link>

        {/* Hero */}
        <motion.section
          initial={reduce ? undefined : { opacity: 0, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border p-6 mb-6"
          style={{
            background: `linear-gradient(135deg, ${accent}1F, ${accent}05)`,
            borderColor: `${accent}33`,
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `${accent}22`,
                border: `1px solid ${accent}44`,
              }}
            >
              <Icon
                className="w-5 h-5"
                strokeWidth={1.5}
                style={{ color: accent }}
              />
            </div>
            <p
              className="text-xs uppercase tracking-wider font-semibold"
              style={{ color: accent }}
            >
              Category {meta?.number}: {peptide.category}
            </p>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            {peptide.name}
          </h1>
          <p className="text-xs text-white/40 font-mono mb-4">
            #{peptide.id} · {peptide.slug}
          </p>

          {!isExcluded && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${research.classes}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "currentColor" }}
                />
                {research.label}
              </span>
              {peptide.deliveryForms.map((form) => (
                <span
                  key={form}
                  className="bg-white/[0.06] text-gray-300 text-[10px] rounded-full px-2.5 py-1 border border-white/[0.06]"
                >
                  {form}
                </span>
              ))}
              {peptide.isInjectableOnly && (
                <span className="bg-[#B75E18]/15 text-[#B75E18] text-[10px] rounded-full px-2.5 py-1 border border-[#B75E18]/30 font-semibold uppercase tracking-wider">
                  Injectable only
                </span>
              )}
              {!peptide.isStackable && !isExcluded && (
                <span className="bg-white/[0.04] text-white/55 text-[10px] rounded-full px-2.5 py-1 border border-white/[0.06]">
                  Never stacked
                </span>
              )}
            </div>
          )}

          {isExcluded ? (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Ban className="w-3.5 h-3.5" strokeWidth={1.5} />
                Not Recommended by FarmCeutica
              </div>
              <p className="text-red-300/80 text-xs leading-snug">
                Listed for reference and comparison purposes only. No share or
                profile actions available.
              </p>
            </div>
          ) : (
            <ShareWithPractitionerButton peptide={peptide} variant="full" />
          )}
        </motion.section>

        {/* Full disclaimer */}
        <PeptideDisclaimer variant="full" />

        {/* Body sections */}
        <div className="space-y-8 mt-8">
          <Section title="About This Peptide">
            <p className="text-sm text-white/80 leading-relaxed">
              {peptide.description}
            </p>
          </Section>

          <Section title="Mechanism of Action">
            <p className="text-sm text-white/80 leading-relaxed">
              {peptide.mechanismOfAction}
            </p>
          </Section>

          <Section title="Primary Benefits">
            <ul className="space-y-2">
              {peptide.primaryBenefits.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-white/80"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                    style={{ background: accent }}
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Delivery Forms">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {peptide.deliveryForms.map((form) => {
                const dm = DELIVERY_META[form];
                const DmIcon = dm.icon;
                return (
                  <div
                    key={form}
                    className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <DmIcon
                        className="w-4 h-4 text-[#2DA5A0]"
                        strokeWidth={1.5}
                      />
                      <p className="text-sm font-semibold text-white">{form}</p>
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-[#2DA5A0] font-semibold mb-1">
                      {dm.absorption}
                    </p>
                    <p className="text-xs text-white/55 leading-snug">
                      {dm.note}
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>

          {peptide.keyStudies && (
            <Section title="Research Status">
              <p className="text-sm text-white/80 leading-relaxed">
                {peptide.keyStudies}
              </p>
            </Section>
          )}

          {peptide.contraindications && (
            <Section title="Contraindications & Notes" warn>
              <p className="text-sm text-[#F5B681] leading-relaxed">
                {peptide.contraindications}
              </p>
            </Section>
          )}

          {peptide.practitionerNotes && (
            <Section title="Practitioner Notes">
              <p className="text-sm text-white/80 leading-relaxed italic">
                {peptide.practitionerNotes}
              </p>
            </Section>
          )}
        </div>

        {/* Share with provider */}
        {!isExcluded && (
          <div className="mt-10 rounded-2xl border border-[#2DA5A0]/25 bg-[#2DA5A0]/8 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Microscope
                className="w-4 h-4 text-[#2DA5A0]"
                strokeWidth={1.5}
              />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#2DA5A0]">
                Share with Your Practitioner
              </h3>
            </div>
            <p className="text-sm text-white/65 leading-relaxed mb-4">
              Your peptide profile and recommendations can be shared directly
              with your licensed practitioner through the ViaConnect™ platform.
            </p>
            <ShareWithPractitionerButton peptide={peptide} variant="full" />
          </div>
        )}

        {/* Footer disclaimer */}
        <div className="mt-10">
          <PeptideDisclaimer variant="full" />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  warn,
  children,
}: {
  title: string;
  warn?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className={`text-xs uppercase tracking-[0.15em] font-semibold mb-3 flex items-center gap-2 ${
          warn ? "text-[#F5B681]" : "text-white/55"
        }`}
      >
        {warn && <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />}
        {title}
      </h2>
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        {children}
      </div>
    </section>
  );
}
