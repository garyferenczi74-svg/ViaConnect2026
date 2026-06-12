'use client';

// Prompt 191 Task C (2026-06-12): one variant row inside Your Variants.
//
// Collapsed: a 44px tall toggle button showing the gene (mono), the rsId, a
// genotype chip, and a mandatory impact tier chip. Expanded: an inline,
// height auto region (framer motion, instant under prefers reduced motion via
// useReducedMotion) carrying the one line descriptive summary, a small rs chip,
// and the existing practitioner consult disclaimer that the current /genetics
// page shows. The visual language mirrors that page's variant expander.
//
// Impact chip colors are MANDATORY and exact:
//   High     -> Orange #B75E18
//   Moderate -> Teal   #2DA5A0
//   Low      -> a muted neutral (white/40 text on white/5)
//
// Standing rules honored: tokens only (Orange #B75E18, Teal #2DA5A0, white
// opacity neutrals), Lucide strokeWidth 1.5, Instrument Sans inherited, no
// emojis, no em or en dashes, TypeScript strict (no any).

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Shield } from 'lucide-react';
import type { SampleVariant } from './geneticsVariantSamples';

interface VariantRowProps {
  variant: SampleVariant;
  isOpen: boolean;
  onToggle: () => void;
  // Stable id for the row. The toggle button carries id={rowId} so it is the
  // accessible label for the expanded region (aria-labelledby={rowId}); the
  // region itself is `${rowId}-panel`, which the toggle points aria-controls at.
  rowId: string;
}

// Tailwind class fragments for the impact tier chip. The High and Moderate
// hexes are the mandated tokens; Low is the muted neutral. Kept as a literal
// switch (not a map) so the exact hex strings are visible in source.
function impactChipClasses(impact: SampleVariant['impact']): string {
  if (impact === 'High') {
    // Orange #B75E18.
    return 'border-[#B75E18]/40 bg-[#B75E18]/15 text-[#B75E18]';
  }
  if (impact === 'Moderate') {
    // Teal #2DA5A0.
    return 'border-[#2DA5A0]/40 bg-[#2DA5A0]/15 text-[#2DA5A0]';
  }
  // Low: muted neutral.
  return 'border-white/10 bg-white/5 text-white/40';
}

export function VariantRow({ variant, isOpen, onToggle, rowId }: VariantRowProps) {
  const reduced = useReducedMotion() ?? false;
  const panelId = `${rowId}-panel`;
  const chipClasses = impactChipClasses(variant.impact);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#1E3054]/45">
      <button
        type="button"
        id={rowId}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
      >
        {/* Gene name, mono. */}
        <span className="shrink-0 font-mono text-sm font-semibold text-white">{variant.gene}</span>
        {/* rsId, mono and muted; hidden on the narrowest screens to protect the
            44px row from wrapping. */}
        <span className="hidden font-mono text-xs text-white/35 sm:inline">{variant.rsId}</span>
        {/* Genotype chip. */}
        <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs font-semibold text-white/70">
          {variant.genotype}
        </span>
        {/* Impact tier chip, pushed to the trailing edge. */}
        <span
          className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${chipClasses}`}
        >
          {variant.impact}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 motion-reduce:transition-none ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
          strokeWidth={1.5}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key={panelId}
            id={panelId}
            role="region"
            aria-labelledby={rowId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-white/[0.04] px-4 pb-4 pt-3">
              {/* One line descriptive summary. */}
              <p className="text-sm leading-relaxed text-white/60">{variant.summary}</p>
              {/* Small rs chip, mirroring the current page's rs pill. */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
                  rs{variant.rsId.replace('rs', '')}
                </span>
              </div>
              {/* Practitioner consult disclaimer, carried over from the current
                  /genetics page verbatim. */}
              <p className="flex items-center gap-1 text-[10px] text-[#B75E18]/70">
                <Shield aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
                Consult a practitioner before making changes based on genetic data
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default VariantRow;
