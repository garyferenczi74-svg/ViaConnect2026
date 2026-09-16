/**
 * CAQ compare external quality feeds (Prove It / Suppie honesty stubs +
 * MediSearch refuse-if-no-key shape). Not Hannah RAG. Flag default OFF.
 */

export type {
  ExternalQualityCite,
  ExternalQualityFeedResult,
  ExternalQualitySource,
  ExternalQualityStatus,
  ExternalQualityUnavailableReason,
} from "./types";

export {
  CAQ_MEDISEARCH_FLAG,
  MEDISEARCH_API_KEY_ENV,
  hasMedisearchApiKey,
  isCaqMedisearchEnabled,
} from "./flag";

export { CAQ_MEDISEARCH_CITE_MAX, getMediSearchFeed } from "./medisearch";
export { getProveItFeed } from "./proveit";
export { getSuppieFeed } from "./suppie";
