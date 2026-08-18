/**
 * Wire GeneX360 NutrigenDX (panel_key=nutrition) into Nutrition by Genetics.
 * Builds the Prompt 188 NutrigenDxResultSet from user_variants + deep education
 * + nutrition_genetic_findings. Never fabricates genotypes or findings.
 */

import { NUTRIGEN_DX_DEEP_DRAFTS } from "@/data/genex360/nutrigen-dx-deep.draft";
import type {
  FindingCategory,
  FindingConfidence,
  NutritionFindingInput,
  NutritionGeneticFinding,
  NutrigenDxMarker,
  NutrigenDxResultSet,
} from "./types";

export interface NutrigenDxVariantRow {
  rsid: string;
  gene: string | null;
  genotype: string | null;
  status: string | null;
  clinical_significance: string | null;
  is_sample: boolean;
  severity: string | null;
}

/** Gene key (lowercase) → finding category for marker cards. */
const GENE_CATEGORY: Record<string, FindingCategory> = {
  fto: "food",
  mthfr: "vitamin",
  fads1: "food",
  tcn2: "vitamin",
  vdr: "vitamin",
  slc23a1: "vitamin",
  slc30a8: "mineral",
  fut2: "vitamin",
  gc: "vitamin",
  pemt: "vitamin",
  apoa2: "food",
  amy1: "food",
  lipc: "food",
  tcf7l2: "food",
  sod2: "other",
  gpx1: "mineral",
  il6: "other",
  tnf: "other",
  cat: "other",
  gstm1: "other",
  gstt1: "other",
  mcm6: "food",
  ahr: "other",
  dao: "food",
  nat2: "other",
  abcg2: "other",
};

function geneKey(gene: string | null, rsid: string): string | null {
  if (gene) {
    const g = gene.trim().toLowerCase();
    if (g in NUTRIGEN_DX_DEEP_DRAFTS) return g;
  }
  for (const [key, report] of Object.entries(NUTRIGEN_DX_DEEP_DRAFTS)) {
    for (const v of report.keyVariants) {
      if (v.rsid.toLowerCase() === rsid.toLowerCase()) return key;
    }
  }
  return null;
}

function genotypeMeta(
  key: string,
  genotype: string | null
): {
  rsid: string;
  label: string | null;
  interpretation: string | null;
  pathway: string | null;
  laySummary: string | null;
} {
  const deep = NUTRIGEN_DX_DEEP_DRAFTS[key];
  if (!deep) {
    return {
      rsid: "",
      label: null,
      interpretation: null,
      pathway: null,
      laySummary: null,
    };
  }
  const variant = deep.keyVariants[0];
  const rsid = variant?.rsid ?? "";
  const lay =
    Array.isArray(deep.laySummary) && deep.laySummary.length > 0
      ? deep.laySummary[0]
      : null;
  if (!genotype || !variant) {
    return {
      rsid,
      label: null,
      interpretation: null,
      pathway: deep.pathway,
      laySummary: lay,
    };
  }
  const normalized = genotype.replace(/[^A-Za-z0-9+/]/g, "").toUpperCase();
  const hit =
    variant.genotypes.find(
      (g) =>
        g.genotype.replace(/[^A-Za-z0-9+/]/g, "").toUpperCase() === normalized
    ) ?? null;
  return {
    rsid,
    label: hit?.label ?? null,
    interpretation: hit?.interpretation ?? null,
    pathway: deep.pathway,
    laySummary: lay,
  };
}

function confidenceFromSeverity(severity: string | null): FindingConfidence {
  if (severity === "high" || severity === "severe") return "high";
  if (severity === "moderate" || severity === "medium") return "medium";
  return "low";
}

/**
 * Build NutrigenDxResultSet from GeneX360 nutrition variants + optional findings rows.
 */
export function buildNutrigenDxResultSet(
  variants: NutrigenDxVariantRow[],
  findings: NutritionGeneticFinding[],
  opts?: { panelId?: string; collectedDate?: string | null; processedDate?: string | null }
): NutrigenDxResultSet {
  const markers: NutrigenDxMarker[] = [];
  const seen = new Set<string>();

  for (const v of variants) {
    const key = geneKey(v.gene, v.rsid);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const meta = genotypeMeta(key, v.genotype);
    const gene = (v.gene ?? key).toUpperCase();
    const genotype = v.genotype?.trim() || "UNKNOWN";
    const impact =
      meta.interpretation ??
      meta.laySummary ??
      v.clinical_significance ??
      `${gene} NutrigenDX result. Educational genotype context is not available for this call yet.`;

    markers.push({
      gene,
      rsid: meta.rsid || v.rsid,
      genotype,
      category: GENE_CATEGORY[key] ?? "other",
      impactSummary: impact,
      confidence: confidenceFromSeverity(v.severity),
    });
  }

  markers.sort((a, b) => a.gene.localeCompare(b.gene));

  const nutrigendxFindings = findings.filter(
    (f) => f.source === "nutrigendx" && f.supersededAt === null
  );

  const findingInputs: NutritionFindingInput[] = nutrigendxFindings.map((f) => ({
    category: f.category,
    itemName: f.itemName,
    itemSlug: f.itemSlug,
    direction: f.direction,
    strength: f.strength,
    confidence: f.confidence,
    estimated: f.estimated,
    rationale: f.rationale,
  }));

  // Soft cross-ref: attach related finding item names that mention each gene
  // (informational only; does not invent findings).

  return {
    panelId: opts?.panelId ?? "nutrigen-dx",
    collectedDate: opts?.collectedDate ?? null,
    processedDate: opts?.processedDate ?? null,
    markers,
    findings: findingInputs,
  };
}

export function relatedFindingsForGene(
  gene: string,
  findings: NutritionFindingInput[]
): NutritionFindingInput[] {
  const g = gene.toLowerCase();
  return findings.filter((f) => {
    const blob = `${f.itemName} ${f.itemSlug} ${f.rationale ?? ""}`.toLowerCase();
    return blob.includes(g);
  });
}

export interface NutrigenDxCrossRefPayload {
  resultSet: NutrigenDxResultSet;
  summary: {
    marker_count: number;
    marker_total: number;
    finding_count: number;
    has_any_data: boolean;
    missing_genes: string[];
  };
  genetics_href: string;
}

export function buildNutrigenDxCrossRefPayload(
  variants: NutrigenDxVariantRow[],
  findings: NutritionGeneticFinding[]
): NutrigenDxCrossRefPayload {
  const resultSet = buildNutrigenDxResultSet(variants, findings);
  const allGenes = Object.keys(NUTRIGEN_DX_DEEP_DRAFTS).map((g) => g.toUpperCase());
  const present = new Set(resultSet.markers.map((m) => m.gene.toUpperCase()));
  const missing_genes = allGenes.filter((g) => !present.has(g));

  return {
    resultSet,
    summary: {
      marker_count: resultSet.markers.length,
      marker_total: allGenes.length,
      finding_count: resultSet.findings.length,
      has_any_data: resultSet.markers.length > 0 || resultSet.findings.length > 0,
      missing_genes,
    },
    genetics_href: "/genetics",
  };
}
