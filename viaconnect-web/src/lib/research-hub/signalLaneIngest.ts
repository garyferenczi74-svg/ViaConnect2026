/**
 * Prompt 227a signal lane: claims observatory ingest.
 * Headlines + link + date + source only. Never body text, dose values, or person IDs.
 */

import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { redactDoseInstructionText } from '@/lib/thanos/doseRedaction';
import { safeLog } from '@/lib/utils/safe-log';
import {
  buildClaimParaphrase,
  classifyClaimType,
  extractTopicHint,
  headlineHash,
} from '@/lib/research-hub/claimsObservatory227a';

type SignalSource = {
  id: string;
  domain: string;
  label: string;
  source_tier: number | null;
  feed_url: string | null;
  cursor_topic_key: string | null;
};

function sanitize(input: string): string {
  return redactDoseInstructionText(input)
    .text.replace(/[\u2013\u2014]/g, '-')
    .trim();
}

function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  publishedAt: string | null;
}> {
  const items: Array<{ title: string; link: string; publishedAt: string | null }> =
    [];
  for (const chunk of xml.split(/<item[\s>]/i).slice(1)) {
    const title =
      chunk.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] ||
      chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
      '';
    const link =
      chunk.match(/<link[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/link>/i)?.[1] ||
      chunk.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ||
      '';
    const pub = chunk.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || null;
    const cleanTitle = sanitize(title.replace(/<[^>]+>/g, ' '));
    const cleanLink = link.replace(/<[^>]+>/g, '').trim();
    if (!cleanTitle || !cleanLink.startsWith('http')) continue;
    if (
      cleanLink.includes('tap-en-') ||
      cleanLink.includes('/settings') ||
      cleanLink.includes('/ads')
    ) {
      continue;
    }
    let publishedAt: string | null = null;
    if (pub) {
      const d = new Date(pub.replace(/<[^>]+>/g, '').trim());
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    items.push({ title: cleanTitle, link: cleanLink, publishedAt });
  }
  return items;
}

export type SignalLaneResult = {
  ok: boolean;
  runId: string;
  sourcesAttempted: number;
  claimsUpserted: number;
  hubItemsInserted: number;
  bySource: Array<{
    domain: string;
    insertedClaims: number;
    insertedHub: number;
    error?: string;
  }>;
  error?: string;
};

export async function runSignalLaneIngest(options?: {
  batchSize?: number;
}): Promise<SignalLaneResult> {
  const batchSize = options?.batchSize ?? 3;
  const runId = `ops-research-hub-signal-${crypto.randomUUID()}`;
  const startedAt = new Date().toISOString();
  const runDate = startedAt.slice(0, 10);
  const admin = createAdminClient();
  const result: SignalLaneResult = {
    ok: false,
    runId,
    sourcesAttempted: 0,
    claimsUpserted: 0,
    hubItemsInserted: 0,
    bySource: [],
  };

  try {
    const { data: cat } = await admin
      .from('research_hub_categories')
      .select('id')
      .eq('slug', 'platforms')
      .maybeSingle();
    const categoryId = cat?.id ? String(cat.id) : null;

    const { data: sources, error: srcErr } = await admin
      .from('authorities_sources')
      .select('id, domain, label, source_tier, feed_url, cursor_topic_key')
      .eq('lane', 'signal')
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .eq('registry_status', 'live')
      .eq('transport', 'rss')
      .not('domain', 'ilike', '%mercola%')
      .not('feed_url', 'is', null)
      .limit(20);

    if (srcErr) {
      result.error = srcErr.message;
      return result;
    }

    for (const source of (sources ?? []) as SignalSource[]) {
      result.sourcesAttempted += 1;
      const row = {
        domain: source.domain,
        insertedClaims: 0,
        insertedHub: 0,
        error: undefined as string | undefined,
      };
      try {
        const res = await fetch(String(source.feed_url), {
          headers: { 'User-Agent': 'ViaConnectClaimsObservatory/227a' },
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) {
          row.error = `rss_http_${res.status}`;
          result.bySource.push(row);
          continue;
        }
        const xml = await res.text();
        // Never store article body: ignore description content beyond title parse
        const items = parseRssItems(xml).slice(0, batchSize);

        for (const item of items) {
          const claimType = classifyClaimType(item.title);
          const topic = extractTopicHint(item.title);
          const paraphrase = buildClaimParaphrase({
            headline: item.title,
            sourceLabel: source.label,
            claimType,
            topicHint: topic,
          });
          const hash = headlineHash(source.domain, item.title);

          const { data: existing } = await admin
            .from('observed_claims')
            .select('id, observation_count')
            .eq('source_domain', source.domain)
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
            row.insertedClaims += 1;
            result.claimsUpserted += 1;
          } else {
            const { error } = await admin.from('observed_claims').insert({
              source_id: source.id,
              source_domain: source.domain,
              source_tier: source.source_tier ?? 4,
              claim_text: paraphrase.claimText,
              compound_or_topic: topic,
              claim_type: claimType,
              evidence_status: 'not_yet_assessed',
              headline_hash: hash,
              platform: source.domain,
              original_url: item.link,
              stores_dose: paraphrase.storesDose,
              stores_body_text: false,
              stores_person_id: false,
            });
            if (!error) {
              row.insertedClaims += 1;
              result.claimsUpserted += 1;
            }
          }

          if (categoryId) {
            const { error: hubErr } = await admin.from('research_hub_items').insert({
              category_id: categoryId,
              source_name: source.label,
              title: item.title.slice(0, 300),
              summary:
                claimType === 'dosing' || claimType === 'sourcing'
                  ? paraphrase.claimText
                  : `Commentary signal (not evidence). ${paraphrase.claimText}`.slice(
                      0,
                      500,
                    ),
              original_url: item.link,
              published_at: item.publishedAt,
              tags: ['signal-lane', 'commentary', '227a', claimType],
              raw_metadata: {
                lane: 'signal',
                prompt: '227a-signal-lane',
                claim_type: claimType,
                transport: 'rss',
                source_tier: source.source_tier ?? 4,
                stores_dose: false,
                stores_body_text: false,
                stores_person_id: false,
                visual: 'commentary',
              },
            });
            if (!hubErr) {
              row.insertedHub += 1;
              result.hubItemsInserted += 1;
            }
          }
        }

        if (row.insertedClaims > 0 || row.insertedHub > 0) {
          await admin
            .from('authorities_sources')
            .update({
              last_successful_run: new Date().toISOString(),
              last_item_yielded_at: new Date().toISOString(),
              staleness_state: 'fresh',
            })
            .eq('domain', source.domain);
        }
      } catch (err) {
        row.error = err instanceof Error ? err.message : String(err);
      }
      result.bySource.push(row);
    }

    result.ok = true;
    await admin.from('pipeline_runs').upsert(
      {
        run_id: runId,
        run_date: runDate,
        status: result.claimsUpserted > 0 ? 'ok' : 'empty',
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        stages: {
          phase: '227a-signal-lane',
          claimsUpserted: result.claimsUpserted,
          hubItemsInserted: result.hubItemsInserted,
          bySource: result.bySource,
        },
      },
      { onConflict: 'run_id' },
    );
    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    safeLog.error('research-hub.signal-lane', 'threw', { error: result.error });
    return result;
  }
}

/** Synthetic dosing claim proof helper (no dose stored). */
export function proveDosingClaimRedaction(rawHeadline: string): {
  claimType: string;
  claimText: string;
  storesDose: boolean;
  containsDoseToken: boolean;
} {
  const claimType = classifyClaimType(rawHeadline);
  const paraphrase = buildClaimParaphrase({
    headline: rawHeadline,
    sourceLabel: 'Synthetic Feed',
    claimType,
    topicHint: extractTopicHint(rawHeadline),
  });
  return {
    claimType,
    claimText: paraphrase.claimText,
    storesDose: paraphrase.storesDose,
    containsDoseToken: /\b\d+\s*mg\b/i.test(paraphrase.claimText),
  };
}

export function contentHashHeadline(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}
