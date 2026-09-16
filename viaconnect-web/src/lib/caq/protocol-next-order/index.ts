/**
 * Protocol next-order Soft — CAQ map + daily protocol SSOT.
 * Not Hannah RAG invent. Flag default false.
 */

export { PROTOCOL_NEXT_ORDER_FLAG, isProtocolNextOrderEnabled } from "./flag";
export {
  CAQ_CATEGORY_ROWS,
  CAQ_EXACT_PAIR_ROWS,
  VIA_CURA_MAP_SKUS,
  matchCaqReplacement,
} from "./caq-replacement-map";
export {
  attachProtocolNextOrder,
  sourceFromDataSource,
  splitBrandProduct,
  suggestProtocolNextOrder,
} from "./suggest";
export { WHY_VIACURA_PILLAR_LABELS } from "./why-viacura";
export type {
  CaqMapCategory,
  CaqMapMatch,
  CurrentProtocolProduct,
  ProtocolEntryCite,
  ProtocolEntrySource,
  ProtocolEntryStatus,
  ProtocolNextOrderEntry,
  WhyViacuraPillarId,
} from "./types";
export {
  CAQ_MAP_CATEGORIES,
  PROTOCOL_ENTRY_SOURCES,
  PROTOCOL_ENTRY_STATUSES,
  WHY_VIACURA_PILLAR_IDS,
} from "./types";
