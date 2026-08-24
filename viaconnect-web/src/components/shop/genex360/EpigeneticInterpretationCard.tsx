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

import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Microscope, Sparkles, Upload } from "lucide-react";
import { SampleBadge } from "@/components/genetics/SampleBadge";
import type { EpigeneticInterpretation } from "@/data/genex360/types";
import type { EpigeneticResult } from "@/lib/genetics/loadEpigeneticResults";

// The non-alarm chip describing the member's reading direction. Teal at every
// direction (never red / green): the interpretation copy carries the meaning, and
// several markers are compositional where neither direction is better.
function directionLabel(direction: EpigeneticResult["direction"]): string {
  if (direction === "higher") return "Higher than expected";
  if (direction === "lower") return "Lower than expected";
  return "Within the expected range";
}

export function EpigeneticInterpretationCard({
  interpretation,
  result = null,
}: {
  interpretation: EpigeneticInterpretation;
  // The member's reading for this marker, or null when no result is on file. When
  // present, the card shows the value and emphasizes the matching higher / lower
  // interpretation. When null it stays purely educational.
  result?: EpigeneticResult | null;
}) {
  const valueDisplay =
    result?.valueNum !== null && result?.valueNum !== undefined
      ? String(result.valueNum)
      : result?.valueText ?? null;
  const higherEmphasis = result?.direction === "higher";
  const lowerEmphasis = result?.direction === "lower";

  return (
    <div className="space-y-4 text-white">
      {/* The member's reading, when on file. Teal panel, never an alarm color. */}
      {result ? (
        <section className="space-y-1 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/[0.08] p-3">
          <span className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#2DA5A0]">
            Your reading
            {result.isSample ? <SampleBadge /> : null}
          </span>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {valueDisplay ? (
              <span className="text-lg font-semibold text-white">{valueDisplay}</span>
            ) : null}
            {result.unit ? <span className="text-[12px] text-white/55">{result.unit}</span> : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2DA5A0]">
              <ArrowRight aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              {directionLabel(result.direction)}
            </span>
          </div>
          {result.measuredOn ? (
            <p className="text-[11px] text-white/45">Measured {result.measuredOn}</p>
          ) : null}
        </section>
      ) : (
        <div className="space-y-2">
          <p className="text-[12px] leading-relaxed text-white/45">
            Connect your EpigenHQ test to see your own reading for this marker. The interpretation
            below is educational background.
          </p>
          <Link
            href="/genetics/epigenetic/upload"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 px-4 py-2 text-[13px] font-semibold text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
          >
            <Upload aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            Upload your EpigenHQ results
          </Link>
        </div>
      )}

      {/* What it measures. */}
      <section className="space-y-1.5">
        <h5 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2DA5A0]">
          <Microscope aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          What it measures
        </h5>
        <p className="text-[13px] leading-relaxed text-white/80">{interpretation.measures}</p>
      </section>

      {/* Higher and lower readings, side by side. The arrows label a direction,
          not a verdict; the copy carries the neither-better / reversible framing.
          When a member result is on file, the matching block is emphasized. */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div
          className={`space-y-1 rounded-lg border p-3 ${
            higherEmphasis
              ? "border-[#2DA5A0]/50 bg-[#2DA5A0]/[0.08]"
              : "border-white/[0.06] bg-[#1E3054]/40"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/55">
            <ArrowUp aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
            A higher reading
          </span>
          <p className="text-[13px] leading-relaxed text-white/75">{interpretation.higherSuggests}</p>
        </div>
        <div
          className={`space-y-1 rounded-lg border p-3 ${
            lowerEmphasis
              ? "border-[#2DA5A0]/50 bg-[#2DA5A0]/[0.08]"
              : "border-white/[0.06] bg-[#1E3054]/40"
          }`}
        >
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
