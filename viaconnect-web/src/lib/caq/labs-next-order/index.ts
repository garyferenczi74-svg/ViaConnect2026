/**
 * Labs Soft next-order — engines/labs SSOT + on-file map only.
 * Zero concrete pairs today → honesty empty / unavailable.
 * Flag default false.
 */

export { LABS_NEXT_ORDER_FLAG, isLabsNextOrderEnabled } from "./flag";
export { LABS_SKU_PAIRS, citeForMappedSku, findLabSkuPair } from "./lab-sku-map";
export type { LabsSkuPair } from "./lab-sku-map";
export { attachLabsNextOrder } from "./attach";
export {
  assembleLabsNextOrder,
  LABS_ASSEMBLE_ROUTE,
} from "./assemble";
export type { AssembleLabsNextOrderFn, LabsAssembleInput } from "./assemble";
export {
  isBannedDemoLabRow,
  mapEnginePayloadToNextOrder,
  mapMemberLabsToNextOrder,
} from "./map";
export type { LabsEnginePayload, LabsMapHit, LabsMapResult, LabsMemberRow } from "./map";
export type { LabsEngineLoadStatus, LabsEngineStatus, LabsMapStatus } from "./types";
export {
  LABS_ENGINE_LOAD_STATUSES,
  LABS_ENGINE_STATUSES,
  LABS_MAP_STATUSES,
  LABS_SSOT_READ,
  LABS_SSOT_ROUTE,
} from "./types";
