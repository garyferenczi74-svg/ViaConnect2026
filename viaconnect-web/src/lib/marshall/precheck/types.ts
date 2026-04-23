/**
 * Marshall Pre-Check shared types (Prompt #121).
 * Namespaced under lib/marshall/precheck/ to keep the pipeline self-contained.
 */

import type { Finding, Severity } from "@/lib/compliance/engine/types";

export type PrecheckSource = "portal" | "extension" | "mobile_app" | "scheduler_webhook";

export type PrecheckStatus =
  | "initiated"
  | "normalizing"
  | "evaluating"
  | "findings_presented"
  | "remediation"
  | "final_evaluation"
  | "cleared"
  | "not_cleared"
  | "closed"
  | "errored";

export interface PrecheckDraftInput {
  text: string;
  mediaUrls?: string[];
  targetPlatform?:
    | "instagram"
    | "tiktok"
    | "youtube"
    | "x"
    | "linkedin"
    | "facebook"
    | "substack"
    | "wordpress"
    | "medium"
    | "beehiiv"
    | "convertkit"
    | "mailchimp"
    | "generic";
}

export interface NormalizedDraft {
  text: string;                       // cleaned text; never persisted plaintext
  hash: string;                       // SHA-256 hex of normalized text
  language?: string;
  productMatches: Array<{ sku: string; confidence: number; method: "lexical" | "semantic" | "image" }>;
  mediaHashes?: string[];
  charCount: number;
  normalizationVersion: string;
}

export interface PrecheckFindingDto extends Finding {
  confidence: number;
  round: number;
  proposedRewrite?: string;           // LLM-generated; only held in-memory
  rewriteRationale?: string;
  remediationKind: "auto_applied" | "user_accepted" | "user_dismissed" | "user_disputed" | "unremediable" | "pending";
}

export interface PrecheckSessionResult {
  sessionId: string;
  publicSessionId: string;            // human-readable e.g. PCS-2026-0423-00384
  practitionerId: string;
  status: PrecheckStatus;
  findings: PrecheckFindingDto[];
  worstSeverity: Severity | null;
  cleared: boolean;
  receipt?: ClearanceReceiptDto;
  recursionCount: number;
  summary: {
    p0: number; p1: number; p2: number; p3: number; advisory: number;
  };
}

export interface ClearanceReceiptDto {
  receiptId: string;
  jwt: string;
  issuedAt: string;
  expiresAt: string;
  signingKeyId: string;
  draftHashSha256: string;
  rulesRun: string[];
  findingsFinal: { p0: number; p1: number; p2: number; p3: number; advisory: number };
}

export interface ReceiptPayload {
  iss: "marshall.viaconnect";
  sub: string;                        // practitioner:<uuid>
  iat: number;
  exp: number;
  jti: string;
  draftHashSha256: string;
  normalizationVersion: string;
  ruleRegistryVersion: string;
  rulesRun: string[];
  findingsFinal: { p0: number; p1: number; p2: number; p3: number; advisory: number };
  sessionId: string;
}

export interface JwkEc {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
  kid: string;
  alg: "ES256";
  use: "sig";
}

export interface Jwks {
  keys: JwkEc[];
}

export const NORMALIZATION_VERSION = "v1.0.0";
export const RULE_REGISTRY_VERSION = "v4.3.7";
export const RECEIPT_TTL_SECONDS = 30 * 24 * 60 * 60;
export const MAX_RECURSION = 2;
