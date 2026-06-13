// Prompt 193a Task T2 (2026-06-12): the comprehensive individual SNP deep report
// for one GeneX-M marker on /shop/genex360. Purely presentational. The expanded
// disclosure (accordion) and the nested #genex-m/<slug> hash wiring that mounts
// this report are a later task; this component only renders one SnpDeepReport.
//
// Section order (fixed):
//   1. Variants and genotypes   2. Biological role       3. Functional impact
//   4. Health associations      5. Nutrient strategy     6. Cautions
//   7. Diet and lifestyle       8. Gene interactions      9. Your protocol
//
// Data shape handled (see src/data/genex360/genex-m-deep.ts):
//   - healthAssociations and interactions are prose kept as a single array
//     entry, rendered as paragraph(s) (one paragraph per entry).
//   - nutrientStrategy, cautions, dietLifestyle are bullet lists.
//   - a genotype.genotype can be an empty string; we then render only the label
//     chip and interpretation, never an empty call chip.
//   - a variant with pendingAssayDefinition true (Prompt 193b: SUOX, ADO) is not
//     yet reconciled with the live assay, so its genotype tiers are hidden and a
//     short pending note is shown in place of the rows; its genotypes array is
//     empty.
//   - keyVariants holds 1 to 4 variants, each with its own rsid, name, genotypes.
//
// Tier color rule (by label keyword, wellness guidance, never a red risk verdict):
//   - "Typical"                                  -> Teal #2DA5A0 (faint teal fill)
//   - "Reduced" / "Altered" / "Upregulated"      -> stronger Orange #B75E18
//   - "Intermediate" / "Mixed"                   -> Orange #B75E18
//   - anything else                              -> neutral white tone
// Both Orange tiers use white text on an Orange fill so the text clears WCAG AA
// on its background (white on #B75E18 is roughly 5.9 to 1); the stronger tier
// reads bolder via a full opacity fill, a heavier weight, and a ring. Teal text
// shows through a faint teal fill over the dark card, which clears AA as well.
//
// Standing rules honored: tokens only (Deep Navy #1A2744, Card #1E3054, Teal
// #2DA5A0, Orange #B75E18, white opacity neutrals), Lucide strokeWidth 1.5,
// outline icons only, no emojis, no checkmark glyphs, Instrument Sans inherited,
// no em or en dashes, TypeScript strict (no any). Consumer brand is Via Cura;
// brand text lives in the data, this component adds none.

import {
  Activity,
  AlertTriangle,
  Dna,
  HeartPulse,
  Leaf,
  Link2,
  Microscope,
  Sparkles,
  Telescope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { SnpDeepReport as SnpDeepReportData } from "@/data/genex360/types";

interface SnpDeepReportProps {
  report: SnpDeepReportData;
}

// Chip classes for one genotype status label, selected by keyword. Returns the
// full className for the chip span. No red styling at any tier: this is wellness
// guidance, not a risk verdict. White on an Orange fill and Teal through a faint
// Teal fill both clear WCAG AA on the Card surface.
export function tierClasses(label: string): string {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1";

  if (label.includes("Typical")) {
    // Teal tone. Teal text reads through a faint teal fill over the dark card.
    return `${base} bg-[#2DA5A0]/15 text-[#2DA5A0] ring-[#2DA5A0]/40`;
  }

  if (
    label.includes("Reduced") ||
    label.includes("Altered") ||
    label.includes("Upregulated")
  ) {
    // Stronger Orange. Full opacity fill, heavier weight, ring: bolder, not red.
    return `${base} bg-[#B75E18] font-semibold text-white ring-[#B75E18]`;
  }

  if (label.includes("Intermediate") || label.includes("Mixed")) {
    // Orange. White text on a near solid Orange fill clears AA.
    return `${base} bg-[#B75E18]/90 text-white ring-[#B75E18]/70`;
  }

  // Neutral white tone for representative or descriptive labels (for example
  // "Reported", "Val/Val", "Met/Met", "Ala/Ala", "Higher activity").
  return `${base} bg-white/10 text-white/80 ring-white/15`;
}

// A labeled section heading with a leading outline icon.
function SectionHeading({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2DA5A0]">
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
      {children}
    </h4>
  );
}

// A bullet list section (nutrientStrategy, cautions, dietLifestyle).
function BulletSection({
  icon,
  heading,
  items,
  bulletIcon,
}: {
  icon: LucideIcon;
  heading: string;
  items: string[];
  bulletIcon: LucideIcon;
}) {
  const Bullet = bulletIcon;
  return (
    <section className="space-y-3">
      <SectionHeading icon={icon}>{heading}</SectionHeading>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-white/75">
            <Bullet
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#2DA5A0]"
              strokeWidth={1.5}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// A prose section that maps each array entry to its own paragraph
// (healthAssociations, interactions are single entry prose in the data).
function ProseListSection({
  icon,
  heading,
  paragraphs,
}: {
  icon: LucideIcon;
  heading: string;
  paragraphs: string[];
}) {
  return (
    <section className="space-y-3">
      <SectionHeading icon={icon}>{heading}</SectionHeading>
      <div className="space-y-2.5">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-[13px] leading-relaxed text-white/75">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

export function SnpDeepReport({ report }: SnpDeepReportProps) {
  return (
    <div className="space-y-7 text-white">
      {/* Meta chips: pathway always, aliases only when present. */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/70">
          Pathway: {report.pathway}
        </span>
        {report.aliases.length > 0 ? (
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/70">
            Also known as: {report.aliases.join(", ")}
          </span>
        ) : null}
      </div>

      {/* 1. Variants and genotypes. */}
      <section className="space-y-4">
        <SectionHeading icon={Dna}>Variants and genotypes</SectionHeading>
        <div className="space-y-5">
          {report.keyVariants.map((variant) => (
            <div key={variant.rsid} className="space-y-2.5">
              {/* Variant sub heading: rsid plus common name. */}
              <h5 className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-mono text-sm font-semibold text-[#2DA5A0]">
                  {variant.rsid}
                </span>
                <span className="text-[13px] text-white/55">{variant.name}</span>
              </h5>

              {/* Prompt 193b: a variant pending assay confirmation hides its
                  genotype tiers and shows a short muted note in their place. */}
              {variant.pendingAssayDefinition ? (
                <p className="rounded-lg border border-white/[0.06] bg-[#1E3054]/40 px-3 py-2.5 text-[13px] leading-relaxed text-white/55">
                  Pending assay confirmation. Genotype interpretations appear once the GeneX-M assay
                  variant is confirmed.
                </p>
              ) : (
                <>
                  {/* Genotype rows: a compact table on desktop, stacked cards on
                      mobile. Each row shows the call (when non-empty), a tier
                      colored label chip, and the interpretation. */}

                  {/* Mobile and small screens: stacked cards. */}
                  <ul className="space-y-2 md:hidden">
                    {variant.genotypes.map((genotype) => (
                      <li
                        key={`${genotype.label}-${genotype.genotype}`}
                        className="rounded-lg border border-white/[0.06] bg-[#1E3054]/40 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {genotype.genotype !== "" ? (
                            <span className="inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                              {genotype.genotype}
                            </span>
                          ) : null}
                          <span className={tierClasses(genotype.label)}>{genotype.label}</span>
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">
                          {genotype.interpretation}
                        </p>
                      </li>
                    ))}
                  </ul>

                  {/* Desktop: compact table. */}
                  <div className="hidden overflow-hidden rounded-lg border border-white/[0.06] md:block">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[#1E3054]/60 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                          <th scope="col" className="w-[14%] px-3 py-2 font-semibold">
                            Call
                          </th>
                          <th scope="col" className="w-[22%] px-3 py-2 font-semibold">
                            Status
                          </th>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            What it means
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {variant.genotypes.map((genotype) => (
                          <tr
                            key={`${genotype.label}-${genotype.genotype}`}
                            className="border-t border-white/[0.06] align-top"
                          >
                            <td className="px-3 py-2.5">
                              {genotype.genotype !== "" ? (
                                <span className="inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                                  {genotype.genotype}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={tierClasses(genotype.label)}>{genotype.label}</span>
                            </td>
                            <td className="px-3 py-2.5 text-[13px] leading-relaxed text-white/75">
                              {genotype.interpretation}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 2. Biological role. */}
      <section className="space-y-3">
        <SectionHeading icon={Microscope}>Biological role</SectionHeading>
        <p className="text-[13px] leading-relaxed text-white/75">{report.biologicalRole}</p>
      </section>

      {/* 3. Functional impact. */}
      <section className="space-y-3">
        <SectionHeading icon={Activity}>Functional impact</SectionHeading>
        <p className="text-[13px] leading-relaxed text-white/75">{report.functionalImpact}</p>
      </section>

      {/* 4. Health associations (prose paragraphs). */}
      <ProseListSection
        icon={HeartPulse}
        heading="Health associations"
        paragraphs={report.healthAssociations}
      />

      {/* 5. Nutrient strategy (bullets). */}
      <BulletSection
        icon={Sparkles}
        heading="Nutrient strategy"
        items={report.nutrientStrategy}
        bulletIcon={Sparkles}
      />

      {/* 6. Cautions (bullets). */}
      <BulletSection
        icon={AlertTriangle}
        heading="Cautions"
        items={report.cautions}
        bulletIcon={AlertTriangle}
      />

      {/* 7. Diet and lifestyle (bullets). */}
      <BulletSection
        icon={Leaf}
        heading="Diet and lifestyle"
        items={report.dietLifestyle}
        bulletIcon={Leaf}
      />

      {/* 8. Gene interactions (prose paragraphs). */}
      <ProseListSection
        icon={Link2}
        heading="Gene interactions"
        paragraphs={report.interactions}
      />

      {/* 9. Your protocol. */}
      <section className="space-y-3 rounded-xl border border-[#B75E18]/25 bg-[#B75E18]/10 p-4">
        <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B75E18]">
          <Telescope aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          Your protocol
        </h4>
        <p className="text-[13px] leading-relaxed text-white/75">{report.protocolTieIn}</p>
      </section>
    </div>
  );
}

export default SnpDeepReport;
