'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Dna,
  Battery,
  Zap,
  Flame,
  BrainCircuit,
  Shield,
  Activity,
  Clock,
  Heart,
  FlaskConical,
  Info,
  ArrowRight,
  Syringe,
  type LucideIcon,
} from 'lucide-react';
import type { PeptideProduct } from '@/config/peptide-database/categories-1-3';
import { SharePeptideButton } from './SharePeptideButton';

// Map the existing categoryIcon string to a Lucide component.
// Existing schema uses single-word icon names from the FarmCeutica registry.
const ICON_MAP: Record<string, LucideIcon> = {
  Dna,
  Battery,
  Zap,
  Flame,
  BrainCircuit,
  Shield,
  Activity,
  Clock,
  Heart,
  FlaskConical,
};

// Friendly delivery form labels (existing schema uses snake_case keys)
const FORM_LABELS: Record<string, string> = {
  liposomal: 'Liposomal',
  micellar: 'Micellar',
  injectable: 'Injectable',
  nasal_spray: 'Nasal Spray',
};

const EVIDENCE_STYLE: Record<PeptideProduct['evidenceLevel'], string> = {
  strong:
    'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.30)]',
  moderate:
    'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.30)]',
  emerging:
    'bg-[rgba(168,85,247,0.12)] text-[#A855F7] border-[rgba(168,85,247,0.30)]',
};

interface PeptideCatalogCardProps {
  peptide: PeptideProduct;
}

export function PeptideCatalogCard({ peptide }: PeptideCatalogCardProps) {
  const Icon = ICON_MAP[peptide.categoryIcon] ?? FlaskConical;
  const isInjectableOnly =
    peptide.dosingForms.length === 1 && peptide.dosingForms[0].form === 'injectable';
  const isRetatrutide = peptide.id === 'retatrutide';

  return (
    <div
      className="group relative flex h-full flex-col rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054] p-4 transition-all duration-200 hover:border-[rgba(255,255,255,0.18)]"
      style={{
        // Subtle category color tint on the top edge
        boxShadow: `inset 0 1px 0 ${peptide.categoryColor}30`,
      }}
    >
      {/* Header: category icon + category name */}
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
          style={{
            background: `${peptide.categoryColor}1A`,
            border: `1px solid ${peptide.categoryColor}33`,
          }}
        >
          <Icon
            className="h-3.5 w-3.5"
            strokeWidth={1.5}
            style={{ color: peptide.categoryColor }}
          />
        </div>
        <span
          className="truncate text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: `${peptide.categoryColor}CC` }}
        >
          {peptide.category}
        </span>
      </div>

      {/* Name + type */}
      <h3 className="break-words text-base font-bold leading-tight text-white">
        {peptide.name}
      </h3>
      <p className="mt-0.5 line-clamp-2 text-[11px] text-[rgba(255,255,255,0.45)]">
        {peptide.type}
      </p>

      {/* Mechanism (one-liner) */}
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[rgba(255,255,255,0.65)]">
        {peptide.mechanism}
      </p>

      {/* Evidence + injectable-only badges */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${EVIDENCE_STYLE[peptide.evidenceLevel]}`}
        >
          {peptide.evidenceLevel} evidence
        </span>
        {isInjectableOnly && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(251,146,60,0.30)] bg-[rgba(251,146,60,0.12)] px-2 py-0.5 text-[10px] font-medium text-[#FB923C]">
            <Syringe className="h-2.5 w-2.5" strokeWidth={1.5} />
            Injectable only
          </span>
        )}
        {isRetatrutide && (
          <span className="rounded-full border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.12)] px-2 py-0.5 text-[10px] font-medium text-[#F87171]">
            Never stacked
          </span>
        )}
      </div>

      {/* Delivery form pills */}
      <div className="mt-2.5 flex flex-wrap gap-1">
        {peptide.dosingForms.map((df) => (
          <span
            key={df.form}
            className="rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[10px] text-[rgba(255,255,255,0.55)]"
          >
            {FORM_LABELS[df.form] ?? df.form}
          </span>
        ))}
      </div>

      {/* GeneX synergy hint (if present) */}
      {peptide.targetVariants.length > 0 && (
        <p className="mt-2.5 line-clamp-1 text-[10px] text-[#2DA5A0]">
          <Dna className="mr-1 inline h-2.5 w-2.5" strokeWidth={1.5} />
          {peptide.genexPanel} · {peptide.targetVariants.join(', ')}
        </p>
      )}

      {/* Spacer pushes the footer to the bottom for equal-height grid items */}
      <div className="flex-1" />

      {/* Compact disclaimer, always visible */}
      <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-2.5 py-2">
        <Info
          className="mt-0.5 h-3 w-3 flex-shrink-0 text-[#B75E18]"
          strokeWidth={1.5}
        />
        <p className="text-[10px] leading-snug text-[rgba(255,255,255,0.45)]">
          Educational information only. Not available for direct purchase. Share
          with your licensed practitioner.
        </p>
      </div>

      {/* Actions — consumer view: Share + Full Profile */}
      <div className="mt-3 flex gap-2">
        <SharePeptideButton peptide={peptide} compact />
        <Link
          href={`/shop/peptides/${peptide.id}`}
          className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl border border-[rgba(45,165,160,0.30)] bg-[rgba(45,165,160,0.15)] px-3 py-2 text-xs font-medium text-[#2DA5A0] transition-all duration-200 hover:border-[rgba(45,165,160,0.50)] hover:bg-[rgba(45,165,160,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          Full Profile
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
