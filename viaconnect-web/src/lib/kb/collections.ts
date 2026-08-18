/**
 * Prompt 221/222: collection registry (code mirror of kb_collections seed).
 * No em/en dashes. Status planned until phase gates + 219N soak PASS.
 */

export const KB_COLLECTION_SLUGS = [
  "competitive_supplements",
  "popularity_formulation",
  "via_cura_competitive",
  "genetic_tests",
  "peptide_education",
  "micellar",
  "liposomal",
  "clinical_studies",
  "bioavailability_studies",
  "genetic_nutritional",
  "genetic_hormonal",
  "genetic_peptide",
  "competitor_platforms",
] as const;

export type KbCollectionSlug = (typeof KB_COLLECTION_SLUGS)[number];

export type KbCadenceClass =
  | "studies_12h"
  | "weekly"
  | "popularity_weekly"
  | "derived_on_upstream_change";

export type KbGateProfile = "standard" | "lex_lane" | "practitioner_flagged";

export type KbSeedingPhase = 1 | 2 | 3 | 4;

export interface KbCollectionCharter {
  slug: KbCollectionSlug;
  displayName: string;
  owningAgent: string;
  coOwnerAgents: string[];
  sourceClasses: string[];
  cadenceClass: KbCadenceClass;
  gateProfile: KbGateProfile;
  seedingPhase: KbSeedingPhase;
  /** Short charter for ACC panel copy. */
  charterSummary: string;
}

export const KB_COLLECTION_CHARTERS: readonly KbCollectionCharter[] = [
  {
    slug: "competitive_supplements",
    displayName: "Competitive supplements and formulations",
    owningAgent: "hounddog",
    coOwnerAgents: ["sherlock"],
    sourceClasses: ["firecrawl_competitive", "firecrawl_allowlist"],
    cadenceClass: "weekly",
    gateProfile: "standard",
    seedingPhase: 2,
    charterSummary:
      "Hound Dog discovers competitive SKUs; Sherlock QA structuring; facts-only labels.",
  },
  {
    slug: "popularity_formulation",
    displayName: "Most popular supplements and formulation comparisons",
    owningAgent: "sherlock",
    coOwnerAgents: [],
    sourceClasses: ["internal_derivation", "social"],
    cadenceClass: "popularity_weekly",
    gateProfile: "standard",
    seedingPhase: 4,
    charterSummary:
      "Sherlock owns popularity rankings and formulation matrices with methodology.",
  },
  {
    slug: "via_cura_competitive",
    displayName: "Competitive comparisons on Via Cura products",
    owningAgent: "sherlock",
    coOwnerAgents: ["marshall", "lex"],
    sourceClasses: ["internal_derivation"],
    cadenceClass: "derived_on_upstream_change",
    gateProfile: "lex_lane",
    seedingPhase: 4,
    charterSummary:
      "Sherlock drafts comparisons; Marshall frames; Lex lane mandatory before lex_approved.",
  },
  {
    slug: "genetic_tests",
    displayName: "Genetic testing database",
    owningAgent: "elysium",
    coOwnerAgents: [],
    sourceClasses: ["firecrawl_allowlist", "firecrawl_competitive"],
    cadenceClass: "weekly",
    gateProfile: "standard",
    seedingPhase: 2,
    charterSummary:
      "Elysium maps consumer and clinical genetic tests with GENEX360 overlap.",
  },
  {
    slug: "peptide_education",
    displayName: "Peptide education database",
    owningAgent: "thanos",
    coOwnerAgents: [],
    sourceClasses: ["firecrawl_allowlist", "pubmed"],
    cadenceClass: "studies_12h",
    gateProfile: "practitioner_flagged",
    seedingPhase: 1,
    charterSummary:
      "Thanos peptide education with practitioner_depth and graded evidence links.",
  },
  {
    slug: "micellar",
    displayName: "Micellar delivery database",
    owningAgent: "hounddog",
    coOwnerAgents: ["gordon"],
    sourceClasses: ["pubmed", "firecrawl_allowlist"],
    cadenceClass: "studies_12h",
    gateProfile: "standard",
    seedingPhase: 3,
    charterSummary:
      "Micellar delivery evidence; Gordon nutritional relevance tagging.",
  },
  {
    slug: "liposomal",
    displayName: "Liposomal delivery database",
    owningAgent: "hounddog",
    coOwnerAgents: ["gordon"],
    sourceClasses: ["pubmed", "firecrawl_allowlist"],
    cadenceClass: "studies_12h",
    gateProfile: "standard",
    seedingPhase: 3,
    charterSummary:
      "Liposomal delivery evidence supporting locked 10x to 28x positioning.",
  },
  {
    slug: "clinical_studies",
    displayName: "Current clinical studies",
    owningAgent: "hounddog",
    coOwnerAgents: ["sherlock"],
    sourceClasses: ["pubmed"],
    cadenceClass: "studies_12h",
    gateProfile: "standard",
    seedingPhase: 1,
    charterSummary:
      "PubMed clinical stream into kb_studies; Sherlock owns grading QA.",
  },
  {
    slug: "bioavailability_studies",
    displayName: "Bioavailability studies",
    owningAgent: "hounddog",
    coOwnerAgents: ["gordon"],
    sourceClasses: ["pubmed"],
    cadenceClass: "studies_12h",
    gateProfile: "standard",
    seedingPhase: 1,
    charterSummary:
      "Absorption metrics slice; bioavailability_metrics required when flagged.",
  },
  {
    slug: "genetic_nutritional",
    displayName: "Genetic nutritional database",
    owningAgent: "elysium",
    coOwnerAgents: ["gordon"],
    sourceClasses: ["pubmed", "internal_derivation"],
    cadenceClass: "weekly",
    gateProfile: "standard",
    seedingPhase: 3,
    charterSummary:
      "SNP associations nutritional domain; projects to ingredient_snp_relevance (215).",
  },
  {
    slug: "genetic_hormonal",
    displayName: "Genetic hormonal database",
    owningAgent: "elysium",
    coOwnerAgents: ["arnold"],
    sourceClasses: ["pubmed", "internal_derivation"],
    cadenceClass: "weekly",
    gateProfile: "standard",
    seedingPhase: 3,
    charterSummary:
      "Hormonal SNP associations; consumer_safe defaults false until Marshall.",
  },
  {
    slug: "genetic_peptide",
    displayName: "Genetic peptide database",
    owningAgent: "elysium",
    coOwnerAgents: ["thanos"],
    sourceClasses: ["pubmed", "internal_derivation"],
    cadenceClass: "weekly",
    gateProfile: "standard",
    seedingPhase: 3,
    charterSummary:
      "Peptide-response genetics; educational and practitioner framing only.",
  },
  {
    slug: "competitor_platforms",
    displayName: "Competitive platform teardowns",
    owningAgent: "hounddog",
    coOwnerAgents: ["sherlock", "jeffery"],
    sourceClasses: ["firecrawl_competitive", "public_http"],
    cadenceClass: "weekly",
    gateProfile: "standard",
    seedingPhase: 2,
    charterSummary:
      "Internal strategy teardowns of competitor apps. consumer_safe false. Not for consumer surfaces.",
  },
] as const;

export function charterBySlug(
  slug: string
): KbCollectionCharter | undefined {
  return KB_COLLECTION_CHARTERS.find((c) => c.slug === slug);
}

export function isKbCollectionSlug(value: string): value is KbCollectionSlug {
  return (KB_COLLECTION_SLUGS as readonly string[]).includes(value);
}
