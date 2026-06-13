'use client';

// Prompt 193 Task T2 (2026-06-12): one marker group inside a GENEX360 panel
// report on the Your Genetic Blueprint page.
//
// Prompt 193e (2026-06-13): every SNP collapses to a compact tab. The collapsed
// state shows ONLY the heading (symbol in Teal, fullName muted) and the View full
// report toggle. The description paragraph that used to sit inline now lives
// INSIDE the accordion, above the full report, so the list scans quickly and is
// no longer a wall of always visible paragraphs. The accordion holds: the
// description, then the Prompt 193a SnpDeepReport when the marker carries one
// (GeneXM SNPs); markers without a deepReport (other panels) show the description
// alone. The island supplies onToggleSnp, so every marker on the blueprint
// collapses; without it (a static, non-island use) markers render inline as a
// fallback.
//
// Prompt 193a / 193c carryover: the island owns the single open slug (openSnpSlug
// + onToggleSnp), the row keeps id={`snp-${slug}`} with scroll-mt so the island
// can bring it under the sticky header, and highlightRsid is forwarded to
// SnpDeepReport so a Report pill deep link gets its soft non-alarm teal ring on
// the matching variant. Because the deep link sets openSnpSlug to the gene, the
// accordion auto opens on arrival; it never lands on a collapsed, empty row.
//
// Standing rules honored: tokens only (Teal #2DA5A0, Card #1E3054, white opacity
// neutrals), Lucide strokeWidth 1.5, Instrument Sans inherited, no emojis, no em
// or en dashes, TypeScript strict (no any).

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Dot } from "lucide-react";
import type { PanelMarker, PanelMarkerGroup as PanelMarkerGroupData } from "@/data/genex360/types";
import { SnpDeepReport } from "./SnpDeepReport";

interface PanelMarkerGroupProps {
  group: PanelMarkerGroupData;
  // The lowercase SNP slug currently expanded (single open across the whole card)
  // and the toggle the island owns. When onToggleSnp is supplied EVERY marker in
  // the group becomes a collapsible tab (Prompt 193e).
  openSnpSlug?: string | null;
  onToggleSnp?: (snpSlug: string) => void;
  // Prompt 193c: the variant rsid the Report pill deep link targeted (null
  // otherwise). Forwarded to SnpDeepReport (only the open accordion renders one)
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
  // The blueprint island always supplies onToggleSnp, so every marker collapses
  // to a tab. A static, non-island consumer (none today) falls back to the inline
  // presentation.
  const collapsible = typeof onToggleSnp === "function";

  return (
    <section className="space-y-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2DA5A0]">
        {group.groupTitle}
      </h4>
      <ul className="space-y-2.5">
        {group.markers.map((marker) => {
          if (collapsible) {
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

          // Static fallback (no island): heading plus inline description.
          return (
            <li
              key={marker.symbol}
              className="flex gap-2 rounded-lg border border-white/[0.06] bg-[#1E3054]/40 p-3"
            >
              <Dot aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
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

// One collapsed SNP tab with its accordion. Collapsed shows the heading plus the
// View full report toggle only. The row carries id={`snp-${slug}`} with scroll-mt
// so the island can scroll it under the sticky header. When this row is the open
// one, a framer motion height auto region mounts the description followed by the
// SnpDeepReport (when the marker has one). Under prefers reduced motion the expand
// is instant.
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
      className="scroll-mt-[80px] overflow-hidden rounded-lg border border-white/[0.06] bg-[#1E3054]/40"
    >
      {/* Collapsed header row: the heading on the leading edge, the View full
          report toggle on the trailing edge. The description is NOT here anymore
          (Prompt 193e); it moved into the accordion. On narrow widths the toggle
          wraps beneath the heading so the row stays clean. */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-mono text-sm font-semibold text-[#2DA5A0]">{marker.symbol}</span>
          <span className="text-[11px] text-white/45">{marker.fullName}</span>
        </div>

        {/* Disclosure toggle. 44px tap target, rotating chevron, expanded state
            announced via aria-expanded; aria-controls points at the detail id. */}
        <button
          type="button"
          onClick={() => onToggleSnp(slug)}
          aria-expanded={isOpen}
          aria-controls={detailId}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
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

      {/* Accordion: the description first (moved here from the collapsed row in
          Prompt 193e), then the full SnpDeepReport when the marker carries one.
          Height auto via framer motion, instant under prefers reduced motion. */}
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
            <div className="space-y-4 border-t border-white/[0.06] px-3 pb-4 pt-4">
              <p className="text-[13px] leading-relaxed text-white/75">{marker.description}</p>
              {marker.deepReport ? (
                <SnpDeepReport report={marker.deepReport} highlightRsid={highlightRsid} />
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export default PanelMarkerGroup;
