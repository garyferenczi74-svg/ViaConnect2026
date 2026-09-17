/**
 * Concrete on-file gene → ViaCura SNP SKU pairs for GeneX360 Soft.
 * Missing pair → empty / unavailable. Do not invent extra Master SKU genes.
 *
 * Live nutrigen_dx Soft map today: FTO rs9939609, VDR rs1544410, ACTN3 rs1815739.
 * MTHFR (and MTR if ever) live on genex_m / GeneXM — not nutrigen_dx.
 * edu-viacura cite_id+label only when allowlisted (MTHFR+). MTR+ / VDR+ = catalog name only.
 */

import {
  STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS,
  isStageAViacuraSupplementEduId,
} from "@/lib/jeffery/grounded/viacura-supplement-edu";
import type { ProtocolEntryCite } from "@/lib/caq/protocol-next-order/types";
import type { Genex360SkuPanel } from "./types";

export interface Genex360GeneSkuPair {
  gene: string;
  rsids: readonly string[];
  panel: Genex360SkuPanel;
  /** Catalog SKU on file, or null when the gene is live but has no Soft pair. */
  via_cura_sku: string | null;
}

export const NUTRIGEN_DX_SOFT_RSIDS = ["rs9939609", "rs1544410", "rs1815739"] as const;
export const NUTRIGEN_DX_SOFT_GENES = ["FTO", "VDR", "ACTN3"] as const;

export const GENEXM_SOFT_MTHFR_RSIDS = ["rs1801133", "rs1801131"] as const;
/** On-file MTR rsid if a GeneXM row is ever present. Never invent the genotype. */
export const GENEXM_SOFT_MTR_RSIDS = ["rs1805087"] as const;

export const GENEX360_GENE_SKU_PAIRS: readonly Genex360GeneSkuPair[] = [
  {
    gene: "MTHFR",
    rsids: GENEXM_SOFT_MTHFR_RSIDS,
    panel: "genex_m",
    via_cura_sku: "MTHFR+",
  },
  {
    gene: "MTR",
    rsids: GENEXM_SOFT_MTR_RSIDS,
    panel: "genex_m",
    via_cura_sku: "MTR+",
  },
  {
    gene: "VDR",
    rsids: ["rs1544410"],
    panel: "nutrigen_dx",
    via_cura_sku: "VDR+",
  },
  {
    gene: "FTO",
    rsids: ["rs9939609"],
    panel: "nutrigen_dx",
    via_cura_sku: null,
  },
  {
    gene: "ACTN3",
    rsids: ["rs1815739"],
    panel: "nutrigen_dx",
    via_cura_sku: null,
  },
] as const;

const PAIR_BY_RSID = new Map<string, Genex360GeneSkuPair>();
const PAIR_BY_GENE_PANEL = new Map<string, Genex360GeneSkuPair>();

for (const pair of GENEX360_GENE_SKU_PAIRS) {
  PAIR_BY_GENE_PANEL.set(`${pair.gene.toLowerCase()}::${pair.panel}`, pair);
  for (const rsid of pair.rsids) {
    PAIR_BY_RSID.set(rsid.toLowerCase(), pair);
  }
}

export function findGeneSkuPair(input: {
  rsid?: string | null;
  gene?: string | null;
  panel?: Genex360SkuPanel | null;
}): Genex360GeneSkuPair | null {
  const rsid = (input.rsid ?? "").trim().toLowerCase();
  if (rsid && PAIR_BY_RSID.has(rsid)) {
    return PAIR_BY_RSID.get(rsid) ?? null;
  }
  const gene = (input.gene ?? "").trim().toLowerCase();
  if (gene && input.panel) {
    return PAIR_BY_GENE_PANEL.get(`${gene}::${input.panel}`) ?? null;
  }
  return null;
}

function eduCiteForSku(sku: string): ProtocolEntryCite | undefined {
  for (const seed of Object.values(STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS)) {
    if (!seed.product_skus.includes(sku)) continue;
    if (!isStageAViacuraSupplementEduId(seed.cite_id)) continue;
    return { cite_id: seed.cite_id, label: seed.label };
  }
  return undefined;
}

/** Allowlisted edu-viacura cite, else catalog name-only. Never invent edu-viacura ids. */
export function citeForMappedSku(sku: string): ProtocolEntryCite {
  const edu = eduCiteForSku(sku);
  if (edu) return edu;
  return {
    cite_id: `genex360-map:${sku.toLowerCase()}`,
    label: sku,
  };
}

export function isNutrigenDxSoftTarget(rsid?: string | null, gene?: string | null): boolean {
  const id = (rsid ?? "").trim().toLowerCase();
  if (id && (NUTRIGEN_DX_SOFT_RSIDS as readonly string[]).includes(id)) return true;
  const g = (gene ?? "").trim().toUpperCase();
  return (NUTRIGEN_DX_SOFT_GENES as readonly string[]).includes(g);
}
