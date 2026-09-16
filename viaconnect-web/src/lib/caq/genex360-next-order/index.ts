/**
 * GeneX360 Soft next-order — engines SSOT + on-file catalog map.
 * Hub/umbrella GeneX360. Methylation/reference chip GeneXM (no dash).
 * Flag default false.
 */

export { GENEX360_NEXT_ORDER_FLAG, isGenex360NextOrderEnabled } from "./flag";
export {
  GENEX360_GENE_SKU_PAIRS,
  NUTRIGEN_DX_SOFT_GENES,
  NUTRIGEN_DX_SOFT_RSIDS,
  citeForMappedSku,
  findGeneSkuPair,
  isNutrigenDxSoftTarget,
} from "./gene-sku-map";
export { attachGenex360NextOrder } from "./attach";
export { isPresentGenotype, mapEnginePayloadToNextOrder, mapMemberSnpsToNextOrder } from "./map";
export type { Genex360MapHit, Genex360MapResult, Genex360MemberSnp } from "./map";
export type { Genex360EngineStatus, Genex360MapStatus, Genex360SkuPanel } from "./types";
export {
  GENEX360_ENGINE_STATUSES,
  GENEX360_MAP_STATUSES,
  GENEX360_SKU_PANELS,
  GENEX360_SPOKEN_GENEXM,
  GENEX360_SPOKEN_HUB,
} from "./types";
