// Prompt 193a Task T2 (2026-06-12): the comprehensive individual SNP deep report
// for one GeneXM marker on /shop/genex360. Purely presentational. The expanded
// disclosure (accordion) and the nested #genex-m/<slug> hash wiring that mounts
// this report are a later task; this component only renders one SnpDeepReport.
//
// Prompt 193c Task T3 (2026-06-12): each variant sub block now carries
// id={`variant-${variant.rsid}`} (rsid verbatim, so the resolver's exact match
// holds) plus scroll-mt so the island can scroll it under the sticky header.
// When the optional highlightRsid prop matches a variant's rsid, that block gets
// a soft, NON-ALARM teal highlight: a teal ring (a structural cue, so the
// highlight does not rely on color alone) plus a faint teal fill, applied via a
// gentle color transition that prefers-reduced-motion disables (the static ring
// still shows). Never red or alarm styling. Variants without the highlight, and
// pending variants, render exactly as before.
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
import type { SnpDeepReport as SnpDeepReportData, SnpGenotype } from "@/data/genex360/types";
import { SeverityPill } from "@/components/genetics/SeverityPill";
import { severityToken } from "@/lib/genetics/severity";
import type { SeverityTier } from "@/lib/genetics/severity";

interface SnpDeepReportProps {
  report: SnpDeepReportData;
  // Prompt 193c Task T3: the variant rsid a Report pill deep link targeted (null
  // otherwise). When it matches a variant's rsid, that variant sub block gets a
  // soft, NON-ALARM teal highlight (a teal ring plus a faint teal fill). The ring
  // is a structural cue so the highlight does not rely on color alone, and it
  // appears via a gentle transition that prefers-reduced-motion disables.
  highlightRsid?: string | null;
  // Prompt 204g: the member's severity by rsID (lowercased), threaded from the
  // Blueprint island so the Full Report cross-references the SAME tier shown on
  // Your Variants, joined by rsID. A present key means the member has a result
  // for that variant (value is the tier, or null when unscored); an absent key
  // means no member result, so nothing is shown. The map is empty until the
  // validated per-genotype source is populated, so this renders nothing for now.
  severityByRsid?: ReadonlyMap<string, SeverityTier | null>;
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

// Prompt 204i follow-up (Gary 2026-06-19): the STATUS column reads on the SAME
// Typical / Moderate / High scale as the member's severity score, so the table
// lines up with the score pill. It is derived from the genotype's number of
// effect-allele copies: 0 copies (the homozygous-reference genotype, the -/- call)
// is Typical, 1 copy (heterozygous, +/-) is Moderate, 2 copies (homozygous
// variant, +/+) is High. A genotype that is not a clean two-base call
// (representative or pending variants) returns null and keeps its descriptive
// label, so nothing is misrepresented.
type StatusTier = "Typical" | "Moderate" | "High";

// Color each derived tier through severityToken() so the chip matches the score:
// Typical green, Moderate yellow, High red.
const STATUS_TIER_TO_SEVERITY: Record<StatusTier, SeverityTier> = {
  Typical: "low",
  Moderate: "moderate",
  High: "high",
};

// The reference allele: the repeated base of the homozygous-reference genotype
// (the Typical-labeled row, else the first row), so the mapping does not depend on
// row order. null when it cannot be read as a clean homozygous two-base call.
function referenceAllele(genotypes: SnpGenotype[]): string | null {
  const baseline = genotypes.find((g) => g.label.includes("Typical")) ?? genotypes[0];
  const call = baseline?.genotype ?? "";
  return call.length === 2 && call[0] === call[1] ? call[0] : null;
}

// Map one genotype call to its Typical / Moderate / High tier by counting effect
// allele copies against the reference. null for a non-two-base call.
function statusTierFor(call: string, ref: string | null): StatusTier | null {
  if (!ref || call.length !== 2) return null;
  const copies = (call[0] === ref ? 0 : 1) + (call[1] === ref ? 0 : 1);
  return copies === 0 ? "Typical" : copies === 1 ? "Moderate" : "High";
}

// The STATUS chip: the derived tier colored through severityToken(), or the
// original descriptive label when no clean tier can be derived.
function StatusChip({ genotype, refAllele }: { genotype: SnpGenotype; refAllele: string | null }) {
  const tier = statusTierFor(genotype.genotype, refAllele);
  if (!tier) {
    return <span className={tierClasses(genotype.label)}>{genotype.label}</span>;
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${severityToken(STATUS_TIER_TO_SEVERITY[tier]).badge}`}
    >
      {tier}
    </span>
  );
}

// Prompt 204i follow-up (Gary 2026-06-19): mark the member's OWN genotype row in
// the table. The member's severity tier (threaded as severityByRsid) maps back to
// the genotype STATUS tier: under the methylation zygosity-direct model the tier
// is bijective with effect-allele copies (HIGH = +/+ = the 2-copy row, MODERATE =
// +/- = the 1-copy row), so the row whose derived STATUS tier matches the member's
// tier is the member's actual genotype.
function severityToStatusTier(tier: SeverityTier): StatusTier {
  return tier === "high" ? "High" : tier === "moderate" ? "Moderate" : "Typical";
}

function isUsersGenotypeRow(
  genotype: SnpGenotype,
  ref: string | null,
  userTier: SeverityTier | null,
): boolean {
  if (userTier == null) return false;
  const rowTier = statusTierFor(genotype.genotype, ref);
  return rowTier != null && rowTier === severityToStatusTier(userTier);
}

// rsIDs whose member genotype ROW must never be auto-marked. MAOA rs6323 is
// X-linked: its data carries diploid GG/GT/TT rows, but a hemizygous male member
// has no diploid genotype, and the member sex is not available at this layer, so a
// diploid row could be mis-marked as "Your result". We exclude it (Hannah). Other
// non-two-base markers (GST present/null, NAT2 phenotype, MAOA-uVNTR repeats)
// already fail safe because referenceAllele returns null for them.
const SEX_LINKED_NO_ROW_MARK = new Set<string>(["rs6323"]);

// A small, non-alarm Teal tag marking the member's own genotype row. The text
// label means the row is never identified by color alone (WCAG).
function YourResultTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2DA5A0]">
      Your result
    </span>
  );
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

export function SnpDeepReport({ report, highlightRsid, severityByRsid }: SnpDeepReportProps) {
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
        {/* Prompt 204i (Hannah): a non-clinical qualifier so a highlighted "Your
            result" row reads as an educational reference, not individualized
            medical advice. */}
        <p className="text-[11px] leading-relaxed text-white/45">
          Educational reference, not a diagnosis. A highlighted row marks the genotype that
          matches your result.
        </p>
        <div className="space-y-5">
          {report.keyVariants.map((variant) => {
            // Prompt 193c: the deep linked variant gets a soft, non-alarm teal
            // highlight. The ring is a structural cue (does not rely on color
            // alone). The id and scroll margin let the island scroll this block
            // under the sticky header. Use the rsid verbatim so the join stays
            // exact (the resolver matches variant.rsid === rsid). The padding +
            // rounding give the ring room to read. The transition is gentle and
            // disabled under prefers-reduced-motion (the static ring still shows).
            const isHighlighted = highlightRsid != null && highlightRsid === variant.rsid;
            // Prompt 204g: the member's cross-referenced severity for this
            // variant, joined by rsID. A present key means the member has a
            // result (tier, or null when unscored); an absent key means no
            // member result, so no pill and no accent edge render.
            const rsidKey = variant.rsid.toLowerCase();
            const hasUserResult = severityByRsid?.has(rsidKey) ?? false;
            const userTier = hasUserResult ? severityByRsid?.get(rsidKey) ?? null : null;
            // Prompt 204i follow-up: the reference allele for this variant, so each
            // genotype's STATUS maps to Typical / Moderate / High by effect-allele
            // copies (the same scale as the score).
            const refAllele = referenceAllele(variant.genotypes);
            // Never auto-mark a row for an X-linked variant (no member sex here).
            const allowRowMark = !SEX_LINKED_NO_ROW_MARK.has(variant.rsid.toLowerCase());
            return (
            <div
              key={variant.rsid}
              id={`variant-${variant.rsid}`}
              className={`scroll-mt-[80px] space-y-2.5 rounded-lg p-3 transition-colors motion-reduce:transition-none ${
                isHighlighted
                  ? "ring-2 ring-[#2DA5A0]/60 bg-[#2DA5A0]/[0.06]"
                  : ""
              } ${userTier ? severityToken(userTier).accent : ""}`}
            >
              {/* Variant sub heading: rsid plus common name, with the member's
                  severity score pinned right when a result exists (Prompt 204g
                  cross-reference, the same SeverityPill used on Your Variants). */}
              <h5 className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-sm font-semibold text-[#2DA5A0]">
                  {variant.rsid}
                </span>
                <span className="text-[13px] text-white/55">{variant.name}</span>
                {hasUserResult ? (
                  <span className="ml-auto">
                    <SeverityPill tier={userTier} />
                  </span>
                ) : null}
              </h5>

              {/* Prompt 193b: a variant pending assay confirmation hides its
                  genotype tiers and shows a short muted note in their place. */}
              {variant.pendingAssayDefinition ? (
                <p className="rounded-lg border border-white/[0.06] bg-[#1E3054]/40 px-3 py-2.5 text-[13px] leading-relaxed text-white/55">
                  Pending assay confirmation. Genotype interpretations appear once the GeneXM assay
                  variant is confirmed.
                </p>
              ) : (
                <>
                  {/* Genotype rows: a compact table on desktop, stacked cards on
                      mobile. Each row shows the call (when non-empty), a tier
                      colored label chip, and the interpretation. */}

                  {/* Mobile and small screens: stacked cards. */}
                  <ul className="space-y-2 md:hidden">
                    {variant.genotypes.map((genotype) => {
                      const isUserRow =
                        allowRowMark && isUsersGenotypeRow(genotype, refAllele, userTier);
                      return (
                      <li
                        key={`${genotype.label}-${genotype.genotype}`}
                        className={`rounded-lg border p-3 ${
                          isUserRow
                            ? "border-[#2DA5A0]/50 bg-[#2DA5A0]/[0.08]"
                            : "border-white/[0.06] bg-[#1E3054]/40"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {genotype.genotype !== "" ? (
                            <span className="inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                              {genotype.genotype}
                            </span>
                          ) : null}
                          <StatusChip genotype={genotype} refAllele={refAllele} />
                          {isUserRow ? <YourResultTag /> : null}
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">
                          {genotype.interpretation}
                        </p>
                      </li>
                      );
                    })}
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
                        {variant.genotypes.map((genotype) => {
                          const isUserRow =
                            allowRowMark && isUsersGenotypeRow(genotype, refAllele, userTier);
                          return (
                          <tr
                            key={`${genotype.label}-${genotype.genotype}`}
                            className={`border-t border-white/[0.06] align-top ${
                              isUserRow ? "bg-[#2DA5A0]/[0.08]" : ""
                            }`}
                          >
                            <td className="px-3 py-2.5">
                              {genotype.genotype !== "" ? (
                                <span className="inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                                  {genotype.genotype}
                                </span>
                              ) : null}
                              {isUserRow ? (
                                <span className="mt-1.5 block">
                                  <YourResultTag />
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2.5">
                              <StatusChip genotype={genotype} refAllele={refAllele} />
                            </td>
                            <td className="px-3 py-2.5 text-[13px] leading-relaxed text-white/75">
                              {genotype.interpretation}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            );
          })}
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
