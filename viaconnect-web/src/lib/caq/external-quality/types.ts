/**
 * CAQ compare external quality feed types.
 *
 * Lane lock: CAQ compare + protocol next-order only.
 * Not Hannah RAG. Not a grounded retriever Sources attach.
 * Optional score fields exist only when a vendor returns them — never invent.
 * Status / reason are machine enums only (Lex: no member-facing copy here).
 */

export type ExternalQualitySource = "proveit" | "suppie" | "medisearch";

/** Machine status only. PR A stubs always return `unavailable`. */
export type ExternalQualityStatus = "unavailable" | "ok";

export type ExternalQualityUnavailableReason =
  | "no_public_api"
  | "flag_off"
  | "missing_key"
  | "live_hold";

/**
 * One vendor cite / quality row. Score fields stay undefined unless the
 * vendor actually returned them. This module never fills them in.
 */
export interface ExternalQualityCite {
  source: ExternalQualitySource;
  cite_url?: string;
  retrieved_at?: string;
  quality_score?: number;
  consistency?: number | string;
  bioavailability?: number | string;
}

export interface ExternalQualityFeedResult {
  source: ExternalQualitySource;
  status: ExternalQualityStatus;
  reason?: ExternalQualityUnavailableReason;
  items: readonly ExternalQualityCite[];
}
