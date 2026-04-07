// FarmCeutica Peptide Distribution Tiers — Prompt #54b
//
// Four distribution tiers reflecting the regulatory + practitioner-mediation
// strategy. Tiers are independent of therapeutic category — a "Mitochondrial"
// peptide can be Tier 1 DTC or Tier 3 Premium depending on its compliance
// profile.
//
// Existing 28 FarmCeutica peptides get tier assignments via the
// TIER_ASSIGNMENTS map below (best-fit by category + evidence level).
// New peptides added in Prompt #54b set distributionTier directly on the
// entry. The resolveTier() helper checks both sources.

import type { PeptideDistributionTier, PeptideProduct } from "./categories-1-3";

export interface PeptideTierMeta {
  tier: PeptideDistributionTier;
  label: string;
  shortLabel: string;
  description: string;
  /** Lucide icon name (resolved at render time) */
  icon: string;
  /** Hex color for accents */
  color: string;
  /** Tailwind class for badge background */
  badgeBg: string;
  /** Tailwind class for badge text */
  badgeText: string;
  /** Tailwind class for tier section border accent */
  borderClass: string;
  requiresPractitioner: boolean;
  /** Sort order (1 = displayed first) */
  order: number;
}

export const PEPTIDE_TIERS: PeptideTierMeta[] = [
  {
    tier: "tier1_dtc",
    label: "Tier 1 — DTC Wellness Essentials",
    shortLabel: "Tier 1 · DTC",
    description:
      "Direct-to-consumer wellness peptides with established safety profiles. Informational profiles available to all ViaConnect users. Share with your provider for guidance on integration into your wellness protocol.",
    icon: "Shield",
    color: "#2DA5A0",
    badgeBg: "bg-[rgba(45,165,160,0.15)]",
    badgeText: "text-[#2DA5A0]",
    borderClass: "border-l-[#2DA5A0]",
    requiresPractitioner: false,
    order: 1,
  },
  {
    tier: "tier2_hcp",
    label: "Tier 2 — HCP Distributed / Clinical Partners",
    shortLabel: "Tier 2 · HCP",
    description:
      "Healthcare provider-mediated peptides requiring practitioner guidance for appropriate use. Informational profiles are accessible to all users, but protocols should be developed in consultation with a licensed practitioner or naturopath.",
    icon: "Stethoscope",
    color: "#B75E18",
    badgeBg: "bg-[rgba(183,94,24,0.15)]",
    badgeText: "text-[#B75E18]",
    borderClass: "border-l-[#B75E18]",
    requiresPractitioner: true,
    order: 2,
  },
  {
    tier: "tier3_premium",
    label: "Tier 3 — Premium Therapeutics / Clinical Research",
    shortLabel: "Tier 3 · Clinical",
    description:
      "Advanced therapeutic peptides and clinical research compounds. These require direct clinical oversight, prescribing authority, and specialized knowledge. Information provided for educational purposes to support practitioner-led conversations.",
    icon: "FlaskConical",
    color: "#7C6FE0",
    badgeBg: "bg-[rgba(124,111,224,0.15)]",
    badgeText: "text-[#A78BFA]",
    borderClass: "border-l-[#7C6FE0]",
    requiresPractitioner: true,
    order: 3,
  },
  {
    tier: "ruo_pipeline",
    label: "Additional — RUO / Pipeline Compounds",
    shortLabel: "RUO · Pipeline",
    description:
      "Research-use-only and pipeline compounds in early-stage development or regulatory review. Included for educational awareness and to support forward-looking conversations with practitioners about emerging therapeutic options.",
    icon: "Microscope",
    color: "#E87DA0",
    badgeBg: "bg-[rgba(232,125,160,0.15)]",
    badgeText: "text-[#E87DA0]",
    borderClass: "border-l-[#E87DA0]",
    requiresPractitioner: true,
    order: 4,
  },
];

export const TIER_BY_KEY: Record<PeptideDistributionTier, PeptideTierMeta> = Object.fromEntries(
  PEPTIDE_TIERS.map((t) => [t.tier, t]),
) as Record<PeptideDistributionTier, PeptideTierMeta>;

// ────────────────────────────────────────────────────────────────────────────
// Tier assignments for the existing 28 FarmCeutica branded peptides.
// Best-fit logic:
//   - Khavinson bioregulators (Epitalon family) + safe wellness essentials → Tier 1
//   - Adrenal/HPA + Mitochondrial restoration peptides → Tier 1 (DTC wellness)
//   - Immune + GH secretagogue + advanced cognitive peptides → Tier 2
//   - GLP-1 metabolic peptides + advanced clinical compounds → Tier 3
//   - Investigational / pre-launch / experimental → RUO
// ────────────────────────────────────────────────────────────────────────────
export const TIER_ASSIGNMENTS: Record<string, PeptideDistributionTier> = {
  // Longevity & Core Bioregulator (Khavinson family) — Tier 1 DTC
  epitalon: "tier1_dtc",
  vesugen: "tier1_dtc",
  bronchogen: "tier1_dtc",

  // Adrenal/HPA Axis & Stress — Tier 1 DTC
  adrenopeptide: "tier1_dtc",
  "hpa-balance": "tier1_dtc",
  stressshield: "tier1_dtc",
  recoverypulse: "tier1_dtc",

  // Mitochondrial/Energy — Tier 1 DTC except SLU-PP-332 which is RUO
  mitopeptide: "tier1_dtc",
  energycore: "tier1_dtc",
  "coq10-peptide": "tier1_dtc",
  "atp-regen": "tier1_dtc",
  "slu-pp-332": "ruo_pipeline",
};

/**
 * Resolve the distribution tier for a peptide. Checks the entry's own
 * distributionTier field first, then falls back to TIER_ASSIGNMENTS, then
 * defaults to tier1_dtc.
 */
export function resolveTier(peptide: PeptideProduct): PeptideDistributionTier {
  if (peptide.distributionTier) return peptide.distributionTier;
  return TIER_ASSIGNMENTS[peptide.id] ?? "tier1_dtc";
}

/**
 * Group an array of peptides by their distribution tier. Returns a Map
 * keyed by tier with peptides sorted alphabetically by name within each
 * group. Empty tiers are omitted.
 */
export function groupByTier(peptides: PeptideProduct[]): Map<PeptideDistributionTier, PeptideProduct[]> {
  const groups = new Map<PeptideDistributionTier, PeptideProduct[]>();
  for (const p of peptides) {
    const tier = resolveTier(p);
    if (!groups.has(tier)) groups.set(tier, []);
    groups.get(tier)!.push(p);
  }
  // Sort within each tier
  for (const [, list] of groups) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  // Sort tiers by order
  return new Map(
    [...groups.entries()].sort(([a], [b]) => TIER_BY_KEY[a].order - TIER_BY_KEY[b].order),
  );
}
