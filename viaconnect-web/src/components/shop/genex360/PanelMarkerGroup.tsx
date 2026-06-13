'use client';

// Prompt 193 Task T2 (2026-06-12): one marker group inside a GENEX360 panel
// description card on /shop/genex360.
//
// Prompt 193a Task T3 (2026-06-12): markers that carry a deepReport (the GeneXM
// SNPs after the genex-m-deep merge) gain an accessible single-open disclosure.
// The island owns the open slug; this group is controlled via openSnpSlug plus
// onToggleSnp. A marker with a report renders a "View full report" button (44px
// tap target, a rotating ChevronDown, aria-expanded + aria-controls) and, when
// open, a height auto region (framer motion, instant under prefers reduced
// motion) holding the full SnpDeepReport. The row container carries
// id={`snp-${slug}`} with scroll-mt so the island can scroll it under the sticky
// header. Markers without a deepReport (every non GeneXM panel) render exactly
// as before, with no disclosure control.
//
// Prompt 193c Task T3: highlightRsid (the variant a Report pill deep link
// targeted) is forwarded to SnpDeepReport, which applies a soft non-alarm teal
// ring to the matching variant sub block. This group only forwards the prop.
//
// Renders the group title as a teal tinted uppercase eyebrow, then each marker
// as a compact row: symbol in Teal #2DA5A0, fullName muted, description in body
// text. On desktop the markers may flow into a responsive two column grid for
// scanability; on mobile they stay single column.
//
// Standing rules honored: tokens only (Teal #2DA5A0, white opacity neutrals),
// Lucide strokeWidth 1.5, Instrument Sans inherited, no emojis, no checkmark
// glyphs in strings, no em or en dashes, TypeScript strict (no any).

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Dot } from "lucide-react";
import type { PanelMarker, PanelMarkerGroup as PanelMarkerGroupData } from "@/data/genex360/types";
import { SnpDeepReport } from "./SnpDeepReport";

interface PanelMarkerGroupProps {
  group: PanelMarkerGroupData;
  // Prompt 193a: the lowercase SNP slug currently expanded (single open across
  // the whole card), and the toggle the island owns. Only meaningful for GeneXM
  // markers; absent for every other panel.
  openSnpSlug?: string | null;
  onToggleSnp?: (snpSlug: string) => void;
  // Prompt 193c: the variant rsid the Report pill deep link targeted (null
  // otherwise). Forwarded to SnpDeepReport (only the open disclosure renders one)
  // so the matching variant sub block gets a soft non-alarm ring.
  highlightRsid?: string | null;
}

export function PanelMarkerGroup({
  group,
  openSnpSlug,
  onToggleSnp,
  highlightRsid,
}: PanelMarkerGroupProps) {
  const reduced = useReducedMotion() ?? false;

  return (
    <section className="space-y-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2DA5A0]">
        {group.groupTitle}
      </h4>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        {group.markers.map((marker) => {
          // A disclosure renders only when the marker carries a deepReport AND
          // the island supplied a toggle. Otherwise the row is the static
          // Prompt 193 presentation, unchanged.
          const hasReport = Boolean(marker.deepReport) && typeof onToggleSnp === "function";

          if (hasReport) {
            return (
              <SnpMarkerRow
                key={marker.symbol}
                marker={marker}
                openSnpSlug={openSnpSlug ?? null}
                onToggleSnp={onToggleSnp as (snpSlug: string) => void}
                reduced={reduced}
                highlightRsid={highlightRsid ?? null}
              />
            );
          }

          return (
            <li
              key={marker.symbol}
              className="flex gap-2 rounded-lg border border-white/[0.06] bg-[#1E3054]/40 p-3"
            >
              <Dot
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#2DA5A0]"
                strokeWidth={1.5}
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-sm font-semibold text-[#2DA5A0]">
                    {marker.symbol}
                  </span>
                  <span className="text-[11px] text-white/45">{marker.fullName}</span>
                </div>
                <p className="text-[13px] leading-relaxed text-white/75">{marker.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// One GeneXM marker row with its disclosure. The row container carries the
// scroll target id (snp-<slug>) and scroll-mt so the island can bring it under
// the sticky header. The button toggles the island's single open slug; when this
// row is the open one, a framer motion height auto region mounts the full
// SnpDeepReport. Under prefers reduced motion the expand is instant.
function SnpMarkerRow({
  marker,
  openSnpSlug,
  onToggleSnp,
  reduced,
  highlightRsid,
}: {
  marker: PanelMarker;
  openSnpSlug: string | null;
  onToggleSnp: (snpSlug: string) => void;
  reduced: boolean;
  highlightRsid: string | null;
}) {
  const slug = marker.symbol.toLowerCase();
  const isOpen = openSnpSlug === slug;
  const detailId = `snp-${slug}-detail`;

  return (
    <li
      id={`snp-${slug}`}
      className="col-span-1 scroll-mt-[80px] rounded-lg border border-white/[0.06] bg-[#1E3054]/40 md:col-span-2"
    >
      <div className="flex gap-2 p-3">
        <Dot
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-[#2DA5A0]"
          strokeWidth={1.5}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono text-sm font-semibold text-[#2DA5A0]">
                {marker.symbol}
              </span>
              <span className="text-[11px] text-white/45">{marker.fullName}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-white/75">{marker.description}</p>
          </div>

          {/* Disclosure toggle. 44px tap target, rotating chevron, expanded
              state announced via aria-expanded; aria-controls points at the
              detail region id. */}
          <button
            type="button"
            onClick={() => onToggleSnp(slug)}
            aria-expanded={isOpen}
            aria-controls={detailId}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
          >
            {isOpen ? "Hide full report" : "View full report"}
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 text-[#2DA5A0] transition-transform duration-200 motion-reduce:transition-none ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>

      {/* Expanded detail region: the full SnpDeepReport. Height auto via framer
          motion, instant under prefers reduced motion. */}
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key={detailId}
            id={detailId}
            role="region"
            aria-label={`${marker.symbol} full report`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] px-3 pb-4 pt-4">
              <SnpDeepReport report={marker.deepReport!} highlightRsid={highlightRsid} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export default PanelMarkerGroup;
