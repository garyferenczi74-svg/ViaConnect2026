/**
 * Bridge collector stubs + harness.
 *
 * Every platform collector is registered here as a stub. Each stub implements
 * the Collector interface and throws CollectorNotConfiguredError on tick()
 * until the corresponding SDK + API keys are approved in a follow-up prompt.
 *
 * Policy guarantees baked in:
 *   - Zero scraping. Every real implementation will use an official API or a
 *     licensed listening provider; the stub makes this explicit in its note.
 *   - Zero network calls today. Stubs return a disabled result immediately.
 *   - hounddog_collector_state row per collector is seeded in the migration
 *     (enabled=false). Flipping `enabled=true` before the real tick() is in
 *     place is a no-op because the stub short-circuits on enabled.
 */

import type {
  Collector,
  CollectorCtx,
  CollectorId,
  CollectorResult,
  ProviderKind,
} from "../bridge-types";
import { CollectorNotConfiguredError } from "../bridge-types";

interface StubSpec {
  id: CollectorId;
  providerKind: ProviderKind;
  reason: string;
  rateLimit: { requests: number; perSeconds: number };
}

const SPECS: StubSpec[] = [
  { id: "instagram", providerKind: "official_api", reason: "Meta Graph API SDK + app review not yet provisioned", rateLimit: { requests: 60, perSeconds: 60 } },
  { id: "tiktok", providerKind: "official_api", reason: "TikTok Research API eligibility + SDK not yet provisioned", rateLimit: { requests: 30, perSeconds: 60 } },
  { id: "youtube", providerKind: "official_api", reason: "YouTube Data API v3 key + googleapis SDK not yet provisioned", rateLimit: { requests: 60, perSeconds: 60 } },
  { id: "x", providerKind: "official_api", reason: "X API v2 enterprise access + twitter-api-v2 SDK not yet provisioned", rateLimit: { requests: 60, perSeconds: 900 } },
  { id: "linkedin", providerKind: "official_api", reason: "LinkedIn Marketing Developer access + SDK not yet provisioned", rateLimit: { requests: 30, perSeconds: 60 } },
  { id: "facebook", providerKind: "official_api", reason: "Meta Graph API (shared with Instagram) not yet provisioned", rateLimit: { requests: 60, perSeconds: 60 } },
  { id: "podcast", providerKind: "licensed_listening_provider", reason: "Listen Notes + Deepgram ASR SDKs not yet provisioned", rateLimit: { requests: 10, perSeconds: 60 } },
  { id: "substack", providerKind: "official_api", reason: "RSS inbound webhook route not yet wired", rateLimit: { requests: 60, perSeconds: 60 } },
  { id: "web", providerKind: "licensed_listening_provider", reason: "SerpAPI / Bright Data licensed-tier SDK not yet provisioned", rateLimit: { requests: 30, perSeconds: 60 } },
  { id: "amazon", providerKind: "official_api", reason: "Amazon Selling Partner API (Brand Registry) credentials not yet provisioned", rateLimit: { requests: 30, perSeconds: 60 } },
  { id: "ebay", providerKind: "official_api", reason: "eBay Finding API credentials not yet provisioned", rateLimit: { requests: 60, perSeconds: 60 } },
  { id: "walmart", providerKind: "official_api", reason: "Walmart Marketplace API credentials not yet provisioned", rateLimit: { requests: 30, perSeconds: 60 } },
  { id: "etsy", providerKind: "official_api", reason: "Etsy Open API v3 credentials not yet provisioned", rateLimit: { requests: 30, perSeconds: 60 } },
  { id: "reddit", providerKind: "official_api", reason: "Reddit API OAuth app not yet provisioned", rateLimit: { requests: 60, perSeconds: 60 } },
];

function makeStub(spec: StubSpec): Collector {
  return {
    id: spec.id,
    providerKind: spec.providerKind,
    tosVersionPinned: null,
    enabled: false,
    rateLimit: spec.rateLimit,
    async tick(ctx: CollectorCtx): Promise<CollectorResult> {
      if (!ctx.enabled || !this.enabled) {
        return {
          rawSignals: [],
          errors: [{ code: "COLLECTOR_DISABLED", retryable: false, detail: spec.reason }],
        };
      }
      // Defensive: even if someone flips enabled=true in the DB, do not pretend
      // to collect anything. The real implementation lands in a follow-up prompt
      // after deps + credentials are approved.
      throw new CollectorNotConfiguredError(spec.id, spec.reason);
    },
  };
}

export const collectors: Readonly<Record<CollectorId, Collector>> = SPECS.reduce(
  (acc, s) => { acc[s.id] = makeStub(s); return acc; },
  {} as Record<CollectorId, Collector>,
);

export function getCollector(id: CollectorId): Collector {
  return collectors[id];
}
