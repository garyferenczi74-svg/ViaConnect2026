/**
 * Prompt 227a G58 Wave 1: YouTube Data API v3 signal ingest.
 * Official API only. No scraping. No channel handles, usernames, or person IDs.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import {
  buildClaimParaphrase,
  classifyClaimType,
  extractTopicHint,
  headlineHash,
} from '@/lib/research-hub/claimsObservatory227a';

const YT_SEARCH = 'https://www.googleapis.com/youtube/v3/search';

/** Wellness / peptide / nutrition queries for observatory coverage. */
const WAVE1_QUERIES = [
  'NMN longevity',
  'peptide therapy wellness',
  'methylation supplements',
  'ashwagandha stress',
  'vitamin D genetics',
] as const;

export type YoutubeIngestResult = {
  ok: boolean;
  claimsUpserted: number;
  hubItemsInserted: number;
  queried: number;
  error?: string;
  skippedNoKey?: boolean;
};

function apiKey(): string | null {
  const k =
    process.env.YOUTUBE_DATA_API_KEY?.trim() ||
    process.env.YOUTUBE_API_KEY?.trim() ||
    '';
  return k || null;
}

type YtItem = {
  title: string;
  videoId: string;
  publishedAt: string | null;
};

async function searchVideos(query: string, key: string, max = 3): Promise<YtItem[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: String(max),
    q: query,
    safeSearch: 'strict',
    key,
  });
  const res = await fetch(`${YT_SEARCH}?${params.toString()}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`youtube_http_${res.status}:${body.slice(0, 120)}`);
  }
  const json = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        publishedAt?: string;
      };
    }>;
  };
  const out: YtItem[] = [];
  for (const it of json.items ?? []) {
    const videoId = it.id?.videoId;
    const title = (it.snippet?.title ?? '').trim();
    if (!videoId || !title) continue;
    out.push({
      title,
      videoId,
      publishedAt: it.snippet?.publishedAt ?? null,
    });
  }
  return out;
}

export async function ingestYoutubeWave1(options?: {
  maxPerQuery?: number;
}): Promise<YoutubeIngestResult> {
  const key = apiKey();
  const result: YoutubeIngestResult = {
    ok: false,
    claimsUpserted: 0,
    hubItemsInserted: 0,
    queried: 0,
  };
  if (!key) {
    result.skippedNoKey = true;
    result.error = 'YOUTUBE_DATA_API_KEY not configured';
    return result;
  }

  const admin = createAdminClient();
  const maxPerQuery = options?.maxPerQuery ?? 2;

  const { data: source } = await admin
    .from('authorities_sources')
    .select('id, domain, label, source_tier')
    .eq('domain', 'youtube.com')
    .maybeSingle();

  if (!source?.id) {
    result.error = 'youtube_registry_missing';
    return result;
  }

  const { data: cat } = await admin
    .from('research_hub_categories')
    .select('id')
    .eq('slug', 'social_media')
    .maybeSingle();
  const categoryId = cat?.id ? String(cat.id) : null;

  try {
    for (const q of WAVE1_QUERIES) {
      result.queried += 1;
      const videos = await searchVideos(q, key, maxPerQuery);
      for (const video of videos) {
        const claimType = classifyClaimType(video.title);
        const topic = extractTopicHint(video.title) || q;
        const paraphrase = buildClaimParaphrase({
          headline: video.title,
          sourceLabel: 'YouTube',
          claimType,
          topicHint: topic,
        });
        const hash = headlineHash('youtube.com', video.videoId);
        // Content URL only; no channel identity fields stored
        const url = `https://www.youtube.com/watch?v=${video.videoId}`;

        const { data: existing } = await admin
          .from('observed_claims')
          .select('id, observation_count')
          .eq('source_domain', 'youtube.com')
          .eq('headline_hash', hash)
          .eq('claim_type', claimType)
          .maybeSingle();

        if (existing?.id) {
          await admin
            .from('observed_claims')
            .update({
              last_observed_at: new Date().toISOString(),
              observation_count: Number(existing.observation_count ?? 1) + 1,
            })
            .eq('id', existing.id);
          result.claimsUpserted += 1;
        } else {
          const { error } = await admin.from('observed_claims').insert({
            source_id: source.id,
            source_domain: 'youtube.com',
            source_tier: source.source_tier ?? 4,
            claim_text: paraphrase.claimText,
            compound_or_topic: topic,
            claim_type: claimType,
            evidence_status: 'not_yet_assessed',
            headline_hash: hash,
            platform: 'youtube',
            original_url: url,
            stores_dose: false,
            stores_body_text: false,
            stores_person_id: false,
          });
          if (!error) result.claimsUpserted += 1;
        }

        if (categoryId) {
          const { error: hubErr } = await admin.from('research_hub_items').insert({
            category_id: categoryId,
            source_name: 'YouTube',
            title: video.title.slice(0, 300),
            summary:
              claimType === 'dosing' || claimType === 'sourcing'
                ? paraphrase.claimText
                : `Commentary signal from YouTube (official Data API). ${paraphrase.claimText}`.slice(
                    0,
                    500,
                  ),
            original_url: url,
            published_at: video.publishedAt,
            tags: ['signal-lane', 'commentary', 'youtube', 'wave1', claimType],
            raw_metadata: {
              lane: 'signal',
              prompt: '227a-youtube-wave1',
              transport: 'youtube_data_api_v3',
              claim_type: claimType,
              source_tier: 4,
              stores_dose: false,
              stores_body_text: false,
              stores_person_id: false,
              // video id is content id, not a person handle
              content_id: video.videoId,
              visual: 'commentary',
            },
          });
          if (!hubErr) result.hubItemsInserted += 1;
        }
      }
    }

    if (result.claimsUpserted > 0 || result.hubItemsInserted > 0) {
      await admin
        .from('authorities_sources')
        .update({
          registry_status: 'live',
          is_active: true,
          last_successful_run: new Date().toISOString(),
          last_item_yielded_at: new Date().toISOString(),
          staleness_state: 'fresh',
          notes:
            'G58 Wave 1 live via official YouTube Data API v3. No scraping. No channel handles or person IDs stored.',
          lex_review_id: 'lex-wave1-youtube-official-api',
        })
        .eq('domain', 'youtube.com');
    }

    result.ok = true;
    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    safeLog.error('research-hub.youtube-wave1', 'threw', { error: result.error });
    return result;
  }
}
