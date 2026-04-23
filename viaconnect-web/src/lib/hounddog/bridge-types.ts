/**
 * Hounddog -> Marshall Bridge shared types (Prompt #120).
 *
 * Namespaced away from the existing outbound Hounddog content-creation
 * module (src/lib/hounddog/types.ts). The outbound tool's types stay
 * untouched.
 */

export type CollectorId =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "x"
  | "linkedin"
  | "facebook"
  | "podcast"
  | "substack"
  | "web"
  | "amazon"
  | "ebay"
  | "walmart"
  | "etsy"
  | "reddit";

export type ProviderKind = "official_api" | "licensed_listening_provider";

export interface RawSocialSignal {
  collectorId: CollectorId;
  providerId: string;
  externalId: string;
  url: string;
  authorHandle: string;
  authorDisplayName?: string;
  authorExternalId: string;
  authorVerified?: boolean;
  contentType: "text" | "image" | "video" | "audio" | "listing";
  text?: string;
  mediaUrls?: string[];
  engagement?: { likes?: number; shares?: number; views?: number; comments?: number };
  publishedAt: string;
  capturedAt: string;
  rawPayload: unknown;
}

export interface SocialSignal {
  id: string;
  rawSignalRef?: string;
  collectorId: CollectorId;
  url: string;
  capturedAt: string;
  publishedAt?: string;

  author: {
    handle: string;
    externalId?: string;
    displayName?: string;
    verifiedByPlatform?: boolean;
    matchedPractitionerId?: string | null;
    practitionerMatchConfidence?: number | null;
    practitionerMatchMethod?: "self_registered" | "npi_public" | "steve_manual" | "meta_business_verification" | null;
  };

  content: {
    language?: string;
    textRaw?: string;
    textDerived?: string;
    mediaHashes: { perceptual?: string[]; sha256?: string[] };
    fingerprint?: string;
  };

  productMatches: Array<{
    sku: string;
    confidence: number;
    method: "lexical" | "semantic" | "image";
  }>;

  pricing?: {
    extracted: number;
    currency: string;
    mapFloor?: number;
    underMapBy?: number;
  };

  jurisdiction?: { country?: string; region?: string };

  audienceSignals?: {
    creatorSelfDeclaredMinor?: boolean;
    audienceUnder18Pct?: number;
  };

  fingerprintNetwork?: {
    sameAuthorPlatforms: string[];
    matchedPractitionersLast72h: number;
  };

  contentQualityScore: number;
  overallConfidence: number;
}

export interface EvidenceArtifact {
  kind: "pdf" | "png" | "html" | "wayback" | "transcript" | "ocr" | "headers" | "trace" | "stub";
  storageKey: string;
  sha256: string;
  sizeBytes: number;
}

export interface EvidenceBundle {
  id: string;
  signalId?: string;
  collectedAt: string;
  collectedBy: string;
  artifacts: EvidenceArtifact[];
  waybackUrl?: string;
  manifestSha256: string;
  retentionUntil: string;
  legalHold: boolean;
}

export interface CollectorCtx {
  since?: string;
  maxItems?: number;
  cursor?: string;
  enabled: boolean;
}

export interface CollectorResult {
  rawSignals: RawSocialSignal[];
  nextCursor?: string;
  errors: Array<{ code: string; retryable: boolean; detail: string }>;
}

export interface Collector {
  id: CollectorId;
  providerKind: ProviderKind;
  tosVersionPinned: string | null;
  enabled: boolean;
  rateLimit: { requests: number; perSeconds: number };
  tick(ctx: CollectorCtx): Promise<CollectorResult>;
}

export class CollectorNotConfiguredError extends Error {
  constructor(public collectorId: CollectorId, public reason: string) {
    super(`Collector "${collectorId}" not configured: ${reason}`);
    this.name = "CollectorNotConfiguredError";
  }
}
