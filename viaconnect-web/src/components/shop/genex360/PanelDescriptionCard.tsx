// Prompt 193 Task T2 (2026-06-12): the full description card for one GENEX360
// panel on /shop/genex360. This is a presentational card; the pill tabs and the
// interactive island that switches between cards are a later task.
//
// Shared id convention (a later task builds matching pill tabs):
//   pill tab id   : `genex360-tab-${slug}`   (built later)
//   card id        : the slug itself, e.g. "genex-m", so #genex-m deep links
//                    land on this card natively.
//   card a11y      : role="tabpanel", aria-labelledby={`genex360-tab-${slug}`},
//                    tabIndex={0}, scroll-mt so a hash link clears the sticky
//                    header.
//   pill row id    : "genex360-panels"; the Back to panels control points there.
//
// onBackToPanels is an optional callback so a later interactive parent can move
// focus to the active pill. Without it the control behaves as a native anchor.
//
// Standing rules honored: tokens only (Card surface #1E3054, Teal #2DA5A0,
// Orange #B75E18, white opacity neutrals), Lucide strokeWidth 1.5, Instrument
// Sans inherited, no emojis, no em or en dashes, TypeScript strict (no any).

import {
  Activity,
  Apple,
  ArrowUp,
  Dna,
  FlaskConical,
  HeartPulse,
  Hourglass,
  Leaf,
  Sparkles,
  Telescope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MouseEvent } from "react";
import type { Panel, PanelSlug } from "@/data/genex360/types";
import { PanelDisclaimer } from "./PanelDisclaimer";
import { PanelMarkerGroup } from "./PanelMarkerGroup";
import type { SeverityTier } from "@/lib/genetics/severity";
import type { BiologicalSex } from "@/hooks/body-tracker/useUserBiologicalSex";

interface PanelDescriptionCardProps {
  panel: Panel;
  onBackToPanels?: () => void;
  // Prompt 193a: the single open SNP slug and its toggle, threaded down to every
  // marker group so the GeneXM card's per SNP disclosures stay single open
  // across all groups. Only meaningful for GeneXM; harmless elsewhere because
  // those markers carry no deepReport, so no disclosure renders.
  openSnpSlug?: string | null;
  onToggleSnp?: (snpSlug: string) => void;
  // Prompt 193c: the variant rsid the Report pill deep link targeted (null
  // otherwise). Passed through to every marker group, which forwards it to
  // SnpDeepReport so the matching variant sub block gets a soft non-alarm ring.
  highlightRsid?: string | null;
  // Prompt 204g: the member's severity by rsID, passed through to every marker
  // group for the Full Report cross-reference.
  severityByRsid?: ReadonlyMap<string, SeverityTier | null>;
  // Prompt 204i: the member's biological sex (or null when unknown), for X-linked
  // variant (MAOA) row handling. Passed through to every marker group.
  userSex?: BiologicalSex | null;
  // Prompt 204 follow-up (go-live blocker 1): the member's canonical genotype by
  // rsID, passed through so the open report marks the member's exact row.
  userGenotypeByRsid?: ReadonlyMap<string, string>;
}

// Per panel leading icon. All six are confirmed present in lucide-react 0.577.0.
const PANEL_ICON: Record<PanelSlug, LucideIcon> = {
  "genex-m": Dna,
  "nutrigen-dx": Apple,
  "hormone-iq": Activity,
  "epigen-hq": Hourglass,
  "peptide-iq": HeartPulse,
  "cannabis-iq": Leaf,
};

export function PanelDescriptionCard({
  panel,
  onBackToPanels,
  openSnpSlug,
  onToggleSnp,
  highlightRsid,
  severityByRsid,
  userSex,
  userGenotypeByRsid,
}: PanelDescriptionCardProps) {
  const PanelIcon = PANEL_ICON[panel.slug];
  const tabId = `genex360-tab-${panel.slug}`;

  function handleBackClick(event: MouseEvent<HTMLAnchorElement>) {
    if (onBackToPanels) {
      event.preventDefault();
      onBackToPanels();
    }
  }

  return (
    <article
      id={panel.slug}
      role="tabpanel"
      aria-labelledby={tabId}
      tabIndex={0}
      className="scroll-mt-[80px] rounded-2xl border border-white/10 bg-[#1E3054] p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] sm:p-6 md:p-8"
    >
      {/* Header block. */}
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 text-[#2DA5A0]">
            <PanelIcon aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="text-xl font-semibold text-white sm:text-2xl">
              {panel.displayName}
            </h3>
            <p className="text-sm text-white/55">{panel.subtitle}</p>
          </div>
        </div>
        <p className="text-sm font-medium text-[#2DA5A0]">{panel.tagline}</p>
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">
          {panel.markerCountLabel}
        </span>
      </header>

      {/* Overview. */}
      <p className="mt-5 text-sm leading-relaxed text-white/75">{panel.overview}</p>

      {/* Two column inner layout from md up: a wide main column for the marker
          groups and a narrower supporting column. Stacks on mobile. */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {/* Main column: marker groups. */}
        <div className="space-y-7 md:col-span-2">
          {panel.groups.map((group) => (
            <PanelMarkerGroup
              group={group}
              key={group.groupTitle}
              openSnpSlug={openSnpSlug}
              onToggleSnp={onToggleSnp}
              highlightRsid={highlightRsid}
              severityByRsid={severityByRsid}
              userSex={userSex}
              userGenotypeByRsid={userGenotypeByRsid}
            />
          ))}
        </div>

        {/* Supporting column. */}
        <aside className="space-y-6 md:col-span-1">
          {/* What you will learn. */}
          <section className="space-y-3 rounded-xl border border-white/[0.06] bg-[#1E3054]/40 p-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2DA5A0]">
              What you will learn
            </h4>
            <ul className="space-y-2.5">
              {panel.whatYoullLearn.map((item) => (
                <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-white/75">
                  <Sparkles
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#2DA5A0]"
                    strokeWidth={1.5}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Test kit and delivery. */}
          <section className="space-y-3 rounded-xl border border-white/[0.06] bg-[#1E3054]/40 p-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2DA5A0]">
              Test kit and delivery
            </h4>
            <ul className="space-y-2.5">
              {panel.collection.map((item) => (
                <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-white/75">
                  <FlaskConical
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#2DA5A0]"
                    strokeWidth={1.5}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Protocol tie in. */}
          <section className="space-y-3 rounded-xl border border-[#B75E18]/25 bg-[#B75E18]/10 p-4">
            <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B75E18]">
              <Telescope aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              How this feeds your protocol
            </h4>
            <p className="text-[13px] leading-relaxed text-white/75">{panel.protocolTieIn}</p>
          </section>
        </aside>
      </div>

      {/* Disclaimer. */}
      <div className="mt-7">
        <PanelDisclaimer slug={panel.slug} />
      </div>

      {/* Back to panels control. Native anchor to the pill row; if a parent
          supplies onBackToPanels we preventDefault and hand off so it can move
          focus to the active pill. 44px minimum tap target. */}
      <div className="mt-6">
        <a
          href="#genex360-panels"
          onClick={handleBackClick}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          <ArrowUp aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          Back to panels
        </a>
      </div>
    </article>
  );
}

export default PanelDescriptionCard;
