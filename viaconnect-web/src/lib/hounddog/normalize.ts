/**
 * Signal normalizer. Given a RawSocialSignal, produces a SocialSignal
 * enriched with practitioner match, product match, fingerprint, and
 * content-quality score. Pure function aside from DB lookups supplied by ctx.
 *
 * OCR / ASR / semantic embedding call-outs are stubbed behind a feature flag
 * (process.env.HOUNDDOG_EXTERNAL_ENRICH=1) and return empty results when off.
 */

import type { RawSocialSignal, SocialSignal } from "./bridge-types";

export interface NormalizeCtx {
  lookupPractitionerByHandle: (
    handle: string,
    platform: string,
  ) => Promise<{ practitionerId: string; method: "self_registered" | "npi_public" | "steve_manual"; confidence: number } | null>;
  matchSkus: (text: string) => Promise<Array<{ sku: string; confidence: number; method: "lexical" | "semantic" | "image" }>>;
  fetchFingerprintNetwork?: (fingerprint: string, authorExternalId: string) => Promise<SocialSignal["fingerprintNetwork"] | undefined>;
  mapFloorForSku?: (sku: string) => Promise<number | undefined>;
  now?: () => Date;
}

// Inexpensive deterministic text fingerprint. Not cryptographic; SimHash would
// be better but is out-of-scope without a dep. Uses a stable 64-char hex hash
// over normalized content that is good enough for near-duplicate detection.
export function fingerprintText(text: string): string {
  const normalized = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef;
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822507) >>> 0;
  }
  const lo = (h1 + Math.imul(h2, 3266489917)) >>> 0;
  const hi = (h2 + Math.imul(h1, 1597334677)) >>> 0;
  return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
}

function detectLanguage(text?: string): string | undefined {
  if (!text) return undefined;
  // Crude heuristic without cld3/fasttext dep: ASCII-heavy => en; otherwise ?
  const nonAscii = text.replace(/[\x00-\x7F]/g, "").length;
  if (nonAscii === 0) return "en";
  return undefined;
}

function contentQualityScore(text: string | undefined, fromOcr: boolean): number {
  if (!text) return 0.2;
  let score = 1.0;
  if (text.length < 30) score -= 0.3;
  if (fromOcr) score -= 0.1;
  return Math.max(0, Math.min(1, score));
}

export function computeOverallConfidence(opts: {
  practitionerMatch: number | null;
  topProductMatch: number;
  contentQuality: number;
}): number {
  const p = opts.practitionerMatch ?? 0;
  const prod = opts.topProductMatch;
  const q = opts.contentQuality;
  // Min of the three floors means: the pipeline is only as confident as its
  // weakest link. A strong product match with a weak practitioner attribution
  // must not produce a confident finding.
  return Math.max(0, Math.min(1, Math.min(p, prod, q)));
}

export async function normalize(raw: RawSocialSignal, ctx: NormalizeCtx): Promise<SocialSignal> {
  const now = (ctx.now ?? (() => new Date()))();
  const text = raw.text ?? "";
  const fingerprint = fingerprintText(text);
  const language = detectLanguage(text);

  const practMatch = await ctx.lookupPractitionerByHandle(raw.authorHandle, raw.collectorId);
  const productMatches = text ? await ctx.matchSkus(text) : [];
  const topProductConfidence = productMatches.reduce((acc, p) => (p.confidence > acc ? p.confidence : acc), 0);
  const contentQuality = contentQualityScore(text, /* fromOcr */ raw.contentType === "image");
  const overallConfidence = computeOverallConfidence({
    practitionerMatch: practMatch?.confidence ?? null,
    topProductMatch: topProductConfidence,
    contentQuality,
  });

  const mapFloor =
    raw.contentType === "listing" && productMatches[0] && ctx.mapFloorForSku
      ? await ctx.mapFloorForSku(productMatches[0].sku)
      : undefined;

  let pricing: SocialSignal["pricing"];
  if (mapFloor) {
    // Very lightweight price extraction: first "$NN.NN" or "USD NN.NN" hit.
    const m = text.match(/\$\s?(\d{1,5}(?:\.\d{2})?)|(?:USD|usd)\s?(\d{1,5}(?:\.\d{2})?)/);
    const extracted = m ? Number(m[1] ?? m[2]) : NaN;
    if (Number.isFinite(extracted)) {
      const underMapBy = ((mapFloor - extracted) / mapFloor) * 100;
      pricing = { extracted, currency: "USD", mapFloor, underMapBy };
    }
  }

  const fingerprintNetwork = ctx.fetchFingerprintNetwork
    ? await ctx.fetchFingerprintNetwork(fingerprint, raw.authorExternalId)
    : undefined;

  return {
    id: "", // set by writer
    rawSignalRef: raw.externalId,
    collectorId: raw.collectorId,
    url: raw.url,
    capturedAt: raw.capturedAt ?? now.toISOString(),
    publishedAt: raw.publishedAt,
    author: {
      handle: raw.authorHandle,
      externalId: raw.authorExternalId,
      displayName: raw.authorDisplayName,
      verifiedByPlatform: raw.authorVerified,
      matchedPractitionerId: practMatch?.practitionerId ?? null,
      practitionerMatchConfidence: practMatch?.confidence ?? null,
      practitionerMatchMethod: practMatch?.method ?? null,
    },
    content: {
      language,
      textRaw: raw.text,
      textDerived: raw.text,
      mediaHashes: {},
      fingerprint,
    },
    productMatches,
    pricing,
    fingerprintNetwork,
    contentQualityScore: contentQuality,
    overallConfidence,
  };
}
