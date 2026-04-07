"use client";

// PeptideCard — grid card used by /shop/peptides catalog page.
//
// Hard rules:
//   - Never displays purchase / pricing / "Add to Cart" buttons.
//   - Compact disclaimer always visible.
//   - Semaglutide gets the EXCLUDED treatment with no action buttons.
//   - Retatrutide is injectable-only and never stacked (label visible).

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Heart,
  Flame,
  Zap,
  Brain,
  Clock,
  Shield,
  TrendingUp,
  Microscope,
  Ban,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  PEPTIDE_CATEGORIES,
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

interface PeptideCardProps {
  peptide: PeptideProduct;
}

export function PeptideCard({ peptide }: PeptideCardProps) {
  const reduce = useReducedMotion();
  const meta = PEPTIDE_CATEGORIES.find((c) => c.name === peptide.category);
  const Icon = meta ? CATEGORY_ICONS[meta.icon] ?? Microscope : Microscope;
  const accent = meta?.color ?? "#2DA5A0";

  // Semaglutide gets a unique muted, exclusion-badged treatment with no
  // CTAs anywhere.
  const isExcluded = peptide.slug === "semaglutide-reference";

  if (isExcluded) {
    return (
      <article className="relative rounded-2xl border border-red-500/20 bg-white/[0.02] backdrop-blur-md p-5 opacity-75">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: accent }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/35 truncate">
                {peptide.category}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-white/35 font-mono">#{peptide.id}</span>
        </div>

        <h3 className="text-lg font-bold text-white/85 mb-3">{peptide.name}</h3>

        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-3 mb-4">
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Ban className="w-3.5 h-3.5" strokeWidth={1.5} />
            Not Recommended by FarmCeutica
          </div>
          <p className="text-red-300/80 text-xs leading-snug">
            Listed for reference and comparison purposes only.
          </p>
        </div>

        <p className="text-xs text-white/40 mb-3">Injectable Only</p>

        <PeptideDisclaimer variant="compact" />
      </article>
    );
  }

  const research = RESEARCH_BADGE[peptide.researchStatus];

  return (
    <motion.article
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 transition-all duration-300 flex flex-col"
      style={{ borderColor: undefined }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${accent}66`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)";
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}
          >
            <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: accent }} />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-white/45 truncate">
            {peptide.category}
          </p>
        </div>
        <span className="text-[10px] text-white/30 font-mono flex-shrink-0">
          #{peptide.id}
        </span>
      </div>

      {/* Name */}
      <h3 className="text-lg font-bold text-white mb-3 leading-tight">
        {peptide.name}
      </h3>

      {/* Research badge */}
      <div className="mb-3">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${research.classes}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "currentColor" }}
          />
          {research.label}
        </span>
      </div>

      {/* Delivery forms */}
      <div className="flex flex-wrap gap-1.5 mb-3">
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
        {!peptide.isStackable && (
          <span className="bg-white/[0.04] text-white/50 text-[10px] rounded-full px-2.5 py-1 border border-white/[0.06]">
            Never stacked
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 leading-relaxed line-clamp-3 mb-3">
        {peptide.description}
      </p>

      <Link
        href={`/shop/peptides/${peptide.slug}`}
        className="text-xs text-[#2DA5A0] hover:text-[#2DA5A0]/80 transition-colors mb-3 inline-block"
      >
        Read more →
      </Link>

      {/* Spacer pushes disclaimer + CTAs to bottom */}
      <div className="flex-1" />

      {/* Compact disclaimer */}
      <PeptideDisclaimer variant="compact" />

      {/* CTAs */}
      <div className="mt-3 space-y-2">
        <ShareWithPractitionerButton peptide={peptide} variant="compact" />
        <Link
          href={`/shop/peptides/${peptide.slug}`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/80 bg-white/[0.04] border border-white/[0.10] hover:bg-white/[0.08] hover:border-white/[0.18] transition-all min-h-[40px]"
        >
          <Microscope className="w-3.5 h-3.5" strokeWidth={1.5} />
          View Full Profile
        </Link>
      </div>
    </motion.article>
  );
}
