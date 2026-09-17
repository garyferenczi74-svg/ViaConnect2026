/**
 * Concrete on-file lab → ViaCura SKU pairs for Labs Soft.
 * Arnold Soft scan (caq-compare + ViaConnect labs surfaces): ZERO pairs today.
 * Honesty Soft path: empty table. Do not invent from Master product names.
 * Missing pair → empty / unavailable. Educational mapping only.
 *
 * SUPPLEMENT_BIOMARKER_LINKS is the reverse direction (supplement → biomarker
 * monitor) and is not a lab→SKU map. Do not reuse it here.
 */

import {
  STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS,
  isStageAViacuraSupplementEduId,
} from "@/lib/jeffery/grounded/viacura-supplement-edu";
import type { ProtocolEntryCite } from "@/lib/caq/protocol-next-order/types";

export interface LabsSkuPair {
  biomarker_key: string;
  /** Catalog SKU on file, or null when the marker is known but has no Soft pair. */
  via_cura_sku: string | null;
}

/** Empty on purpose. Soft FAIL if this is filled from Master names / invented maps. */
export const LABS_SKU_PAIRS: readonly LabsSkuPair[] = [];

const PAIR_BY_KEY = new Map<string, LabsSkuPair>();

for (const pair of LABS_SKU_PAIRS) {
  PAIR_BY_KEY.set(pair.biomarker_key.toLowerCase(), pair);
}

export function findLabSkuPair(biomarkerKey: string | null | undefined): LabsSkuPair | null {
  const key = (biomarkerKey ?? "").trim().toLowerCase();
  if (!key) return null;
  return PAIR_BY_KEY.get(key) ?? null;
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
    cite_id: `labs-map:${sku.toLowerCase()}`,
    label: sku,
  };
}
