/**
 * Cross-reference HormoneIQ (GeneX360 panel_key=hormone) results with labs
 * and C13 hormone education. Educational only; never fabricates genotypes or values.
 */

import { HORMONE_IQ_DEEP_DRAFTS } from "@/data/genex360/hormone-iq-deep.draft";
import { normalizeBiomarkerKey } from "./matchLabMarkers";
import type { LabMarkerSnapshot } from "./types";

export interface HormoneIqVariantRow {
  rsid: string;
  gene: string | null;
  genotype: string | null;
  status: string | null;
  clinical_significance: string | null;
  is_sample: boolean;
  severity: string | null;
}

export interface HormoneIqSnpCrossRef {
  gene: string;
  rsid: string;
  genotype: string | null;
  severity: string | null;
  is_sample: boolean;
  pathway: string | null;
  genotype_label: string | null;
  genotype_interpretation: string | null;
  related_lab_analytes: string[];
  related_labs_found: Array<{
    biomarker: string;
    value: number | null;
    unit: string | null;
    measured_at: string | null;
  }>;
  related_c13_slugs: string[];
}

export interface HormoneIqLabCrossRef {
  analyte: string;
  matched_lab: LabMarkerSnapshot | null;
  status: "matched" | "not_in_labs";
}

export interface HormoneIqCrossRefPayload {
  panel: "HormoneIQ";
  panel_key: "hormone";
  genetics_href: string;
  snp_results: HormoneIqSnpCrossRef[];
  snps_missing: string[];
  lab_analyte_coverage: HormoneIqLabCrossRef[];
  summary: {
    snp_count: number;
    snp_total: number;
    lab_matched_count: number;
    lab_total: number;
    has_any_data: boolean;
  };
}

/** HormoneIQ genotype SNP gene keys (lowercase) ↔ related lab analyte labels + C13 slugs. */
export const HORMONE_IQ_SNP_LAB_LINKS: Record<
  string,
  { related_lab_analytes: string[]; related_c13_slugs: string[] }
> = {
  comt: {
    related_lab_analytes: ["2-OH estrogen", "4-OH estrogen", "2-methoxy estrogen"],
    related_c13_slugs: ["estradiol", "estrone"],
  },
  cyp1a1: {
    related_lab_analytes: ["2-OH estrogen", "Estrone, E1", "Estradiol, E2"],
    related_c13_slugs: ["estradiol", "estrone"],
  },
  cyp1b1: {
    related_lab_analytes: ["4-OH estrogen", "Estradiol, E2", "Estrone, E1"],
    related_c13_slugs: ["estradiol", "estrone"],
  },
  cyp19a1: {
    related_lab_analytes: ["Estradiol, E2", "Estrone, E1", "Testosterone"],
    related_c13_slugs: ["estradiol", "testosterone"],
  },
  srd5a2: {
    related_lab_analytes: ["DHT", "Testosterone", "Androsterone and Etiocholanolone"],
    related_c13_slugs: ["testosterone"],
  },
};

/** HormoneIQ lab analytes (biomarker track) for coverage matching. */
export const HORMONE_IQ_LAB_ANALYTES: readonly string[] = [
  "Cortisol (free, diurnal)",
  "Cortisone",
  "DHEA and DHEA-S",
  "Cortisol Awakening Response",
  "Estrone, E1",
  "Estradiol, E2",
  "Estriol, E3",
  "Progesterone metabolites",
  "Testosterone",
  "DHT",
  "Androstenedione",
  "Androsterone and Etiocholanolone",
  "2-OH estrogen",
  "4-OH estrogen",
  "16-OH estrogen",
  "2-methoxy estrogen",
  "6-OH melatonin sulfate",
  "HVA",
  "VMA",
  "5-HIAA",
  "B6 marker",
  "B12 and folate markers",
  "Glutathione marker",
  "8-OHdG",
];

const GENE_KEYS = Object.keys(HORMONE_IQ_SNP_LAB_LINKS);

function geneKey(gene: string | null, rsid: string): string | null {
  if (gene) {
    const g = gene.trim().toLowerCase();
    if (GENE_KEYS.includes(g)) return g;
  }
  for (const [key, report] of Object.entries(HORMONE_IQ_DEEP_DRAFTS)) {
    for (const v of report.keyVariants) {
      if (v.rsid.toLowerCase() === rsid.toLowerCase()) return key;
    }
  }
  return null;
}

function matchLabToAnalyte(
  labs: LabMarkerSnapshot[],
  analyte: string
): LabMarkerSnapshot | null {
  const target = normalizeBiomarkerKey(analyte);
  const tokens = target.split(" ").filter((t) => t.length > 1);
  for (const lab of labs) {
    const key = normalizeBiomarkerKey(lab.biomarker);
    if (key === target) return lab;
    // Soft contain: require primary hormone token hit
    if (tokens.some((t) => t.length >= 4 && key.includes(t))) return lab;
  }
  return null;
}

function genotypeRow(
  reportGeneKey: string,
  genotype: string | null
): { label: string | null; interpretation: string | null; rsid: string | null; pathway: string | null } {
  const deep = HORMONE_IQ_DEEP_DRAFTS[reportGeneKey];
  if (!deep) {
    return { label: null, interpretation: null, rsid: null, pathway: null };
  }
  const variant = deep.keyVariants[0];
  const rsid = variant?.rsid ?? null;
  if (!genotype || !variant) {
    return { label: null, interpretation: null, rsid, pathway: deep.pathway };
  }
  const normalized = genotype.replace(/[^A-Za-z]/g, "").toUpperCase();
  const hit =
    variant.genotypes.find(
      (g) => g.genotype.replace(/[^A-Za-z]/g, "").toUpperCase() === normalized
    ) ?? null;
  return {
    label: hit?.label ?? null,
    interpretation: hit?.interpretation ?? null,
    rsid,
    pathway: deep.pathway,
  };
}

/**
 * Build HormoneIQ cross-ref payload from user variants + labs.
 * Does not invent missing genotypes or lab values.
 */
export function buildHormoneIqCrossRef(
  variants: HormoneIqVariantRow[],
  labs: LabMarkerSnapshot[]
): HormoneIqCrossRefPayload {
  const snp_results: HormoneIqSnpCrossRef[] = [];
  const seenGenes = new Set<string>();

  for (const v of variants) {
    const key = geneKey(v.gene, v.rsid);
    if (!key) continue;
    seenGenes.add(key);
    const links = HORMONE_IQ_SNP_LAB_LINKS[key]!;
    const deep = genotypeRow(key, v.genotype);
    const related_labs_found = links.related_lab_analytes
      .map((analyte) => {
        const lab = matchLabToAnalyte(labs, analyte);
        if (!lab) return null;
        return {
          biomarker: lab.biomarker,
          value: lab.value,
          unit: lab.unit,
          measured_at: lab.measured_at,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    snp_results.push({
      gene: (v.gene ?? key).toUpperCase(),
      rsid: deep.rsid ?? v.rsid,
      genotype: v.genotype,
      severity: v.severity,
      is_sample: v.is_sample === true,
      pathway: deep.pathway,
      genotype_label: deep.label,
      genotype_interpretation: deep.interpretation,
      related_lab_analytes: links.related_lab_analytes,
      related_labs_found,
      related_c13_slugs: links.related_c13_slugs,
    });
  }

  const snps_missing = GENE_KEYS.filter((g) => !seenGenes.has(g)).map((g) =>
    g.toUpperCase()
  );

  const lab_analyte_coverage: HormoneIqLabCrossRef[] = HORMONE_IQ_LAB_ANALYTES.map(
    (analyte) => {
      const matched = matchLabToAnalyte(labs, analyte);
      return {
        analyte,
        matched_lab: matched,
        status: matched ? ("matched" as const) : ("not_in_labs" as const),
      };
    }
  );

  const lab_matched_count = lab_analyte_coverage.filter(
    (c) => c.status === "matched"
  ).length;

  return {
    panel: "HormoneIQ",
    panel_key: "hormone",
    genetics_href: "/genetics",
    snp_results,
    snps_missing,
    lab_analyte_coverage,
    summary: {
      snp_count: snp_results.length,
      snp_total: GENE_KEYS.length,
      lab_matched_count,
      lab_total: HORMONE_IQ_LAB_ANALYTES.length,
      has_any_data: snp_results.length > 0 || lab_matched_count > 0,
    },
  };
}
