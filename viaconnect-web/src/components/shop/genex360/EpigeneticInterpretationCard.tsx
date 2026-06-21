// Prompt 204 (2026-06-20): the EpigenHQ educational interpretation card, shown in
// the expanded disclosure for an EpigenHQ marker on the Your Genetic Blueprint
// page. EpigenHQ is NOT a genotype panel: its markers are MEASURED epigenetic
// readouts (methylation age, indices, exposure signatures), so there is no
// genotype table, no severity tier, and no matched-row treatment. This card
// renders the validated, non-diagnostic interpretation only: what the marker
// measures, what a higher and a lower reading suggest, and a wellness note. The
// member's actual result value is a separate future data source; this is the
// interpretation layer.
//
// The higher / lower blocks are NEUTRAL: the arrows label a direction, not a good
// or bad verdict (several EpigenHQ markers are compositional, where neither
// direction is inherently better, and the exposure signatures are framed as
// reversible). No alarm color is used at any point.
//
// Standing rules honored: tokens only (Deep Navy #1A2744, Card #1E3054, Teal
// #2DA5A0, white opacity neutrals), Lucide strokeWidth 1.5 outline icons, no
// emojis, no em or en dashes, TypeScript strict (no any).

import { ArrowDown, ArrowUp, Microscope, Sparkles } from "lucide-react";
import type { EpigeneticInterpretation } from "@/data/genex360/types";

export function EpigeneticInterpretationCard({
  interpretation,
}: {
  interpretation: EpigeneticInterpretation;
}) {
  return (
    <div className="space-y-4 text-white">
      {/* What it measures. */}
      <section className="space-y-1.5">
        <h5 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2DA5A0]">
          <Microscope aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          What it measures
        </h5>
        <p className="text-[13px] leading-relaxed text-white/80">{interpretation.measures}</p>
      </section>

      {/* Higher and lower readings, side by side. The arrows label a direction,
          not a verdict; the copy carries the neither-better / reversible framing. */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="space-y-1 rounded-lg border border-white/[0.06] bg-[#1E3054]/40 p-3">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/55">
            <ArrowUp aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
            A higher reading
          </span>
          <p className="text-[13px] leading-relaxed text-white/75">{interpretation.higherSuggests}</p>
        </div>
        <div className="space-y-1 rounded-lg border border-white/[0.06] bg-[#1E3054]/40 p-3">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/55">
            <ArrowDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
            A lower reading
          </span>
          <p className="text-[13px] leading-relaxed text-white/75">{interpretation.lowerSuggests}</p>
        </div>
      </div>

      {/* Wellness note: the practical, non-diagnostic takeaway. Soft teal, never
          an alarm color. */}
      <section className="space-y-1.5 rounded-xl border border-[#2DA5A0]/20 bg-[#2DA5A0]/[0.06] p-4">
        <h5 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2DA5A0]">
          <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          Wellness note
        </h5>
        <p className="text-[13px] leading-relaxed text-white/80">{interpretation.wellnessNote}</p>
      </section>

      {/* Non-diagnostic qualifier, consistent with the rest of the genetics surface. */}
      <p className="text-[11px] leading-relaxed text-white/45">
        Educational reference, not a diagnosis. Epigenetic readouts are most useful as a trend over
        time, read alongside guidance from your own practitioner.
      </p>
    </div>
  );
}

export default EpigeneticInterpretationCard;
