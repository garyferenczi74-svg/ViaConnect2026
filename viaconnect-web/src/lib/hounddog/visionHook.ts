// Prompt #124 P5: Hounddog → Marshall Vision hook.
//
// Called from the Hounddog signal persist path (or a scheduled enrichment
// worker) with a normalized SocialSignal and the bytes of each image URL
// attached to it. For each image the hook runs the full vision
// orchestrator; results are written to counterfeit_evaluations +
// counterfeit_determinations + (conditionally) compliance_findings by the
// orchestrator itself.
//
// Key decisions:
//   - The hook NEVER fetches remote URLs itself. Callers supply bytes so
//     fetch safety (host allowlist, timeout, content-type validation) lives
//     in the collector, which already has these guards from #120.
//   - Dedupe happens inside the orchestrator via pHash — re-running against
//     an already-evaluated image returns a cached result cheaply because
//     normalize()+phash is deterministic.
//   - The hook respects the config's `source.hounddog_marketplace` and
//     `source.hounddog_social` toggles. If disabled, returns an empty
//     array without calling the vision model.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { VisionConfigSnapshot } from '@/lib/marshall/vision/types';
import {
  runVisionEvaluation,
  type RunVisionResult,
} from '@/lib/marshall/vision/orchestrator';
import { canEvaluate } from '@/lib/marshall/vision/config';
import { log } from '@/lib/marshall/vision/logging';

export type HounddogVisionSource = 'hounddog_marketplace' | 'hounddog_social';

export interface HounddogVisionImage {
  bytes: Uint8Array;
  url: string;
  declaredContentType?: string;
}

export interface HounddogVisionHookInput {
  supabase: SupabaseClient;
  /** Signal identifier from social_signals. */
  signalId: string;
  /** Platform source; `hounddog_marketplace` for Amazon/eBay/Walmart/Etsy, `hounddog_social` for IG/TikTok. */
  source: HounddogVisionSource;
  /** The listing URL; used to enrich finding.location and the vision prompt. */
  listingUrl: string | null;
  /** The image(s) attached to the signal. */
  images: readonly HounddogVisionImage[];
  /** Optional candidate SKU from Hounddog's product matcher (narrows the corpus fetch). */
  matchedSku?: string;
  /** Optional signal: this listing is on an unauthorized marketplace for the matched SKU. */
  unauthorizedMarketplaceContext?: boolean;
  /** Loaded VisionConfigSnapshot (avoid reloading per-image). */
  config: VisionConfigSnapshot;
}

export interface HounddogVisionHookResult {
  evaluations: RunVisionResult[];
  skipped: boolean;
  skipReason?: 'source_disabled' | 'mode_off' | 'no_images';
}

/**
 * Run vision evaluation across every image attached to a Hounddog signal.
 * Returns one RunVisionResult per image. Failures are captured inside the
 * orchestrator (content_safety_skip fallback) so a single bad image cannot
 * abort the batch.
 */
export async function runHounddogVisionHook(input: HounddogVisionHookInput): Promise<HounddogVisionHookResult> {
  if (!canEvaluate(input.config, input.source)) {
    log.info('hounddog_vision_skipped', {
      source: input.source,
      note: `signal=${input.signalId} mode=${input.config.mode} source_enabled=${input.config.sourceEnabled[input.source]}`,
    });
    return {
      evaluations: [],
      skipped: true,
      skipReason: input.config.mode === 'off' ? 'mode_off' : 'source_disabled',
    };
  }
  if (input.images.length === 0) {
    return { evaluations: [], skipped: true, skipReason: 'no_images' };
  }

  const results: RunVisionResult[] = [];
  for (const img of input.images) {
    const result = await runVisionEvaluation({
      supabase: input.supabase,
      source: input.source,
      sourceReference: {
        signal_id: input.signalId,
        image_url: img.url,
      },
      imageBytes: img.bytes,
      declaredContentType: img.declaredContentType,
      config: input.config,
      listingUrl: input.listingUrl ?? undefined,
      hintSku: input.matchedSku,
      unauthorizedMarketplaceContext: input.unauthorizedMarketplaceContext,
    });
    results.push(result);
  }

  log.info('hounddog_vision_complete', {
    source: input.source,
    note: `signal=${input.signalId} evaluated=${results.length}`,
  });

  return { evaluations: results, skipped: false };
}
