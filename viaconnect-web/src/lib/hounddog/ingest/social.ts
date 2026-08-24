/**
 * Prompt 214b: public social/web discovery via Firecrawl search.
 * Aggregate signal only; no private individual PII.
 */

import { firecrawlSearch, type FirecrawlBudget } from '@/lib/hounddog/firecrawl/client';
import { contentHash } from './contentHash';
import { safeLog } from '@/lib/utils/safe-log';

/** Domains we refuse to crawl (auth walls / ToS). */
const DISALLOWED_HOSTS = [
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
];

export function isHostDisallowed(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return DISALLOWED_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return true;
  }
}

/** Relevance: simple token overlap against topic query (0-1). */
export function relevanceScore(text: string, topicQuery: string): number {
  const tokens = topicQuery
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length > 2);
  if (tokens.length === 0) return 0;
  const hay = text.toLowerCase();
  let hit = 0;
  for (const t of tokens) {
    if (hay.includes(t)) hit += 1;
  }
  return hit / tokens.length;
}

export interface SocialStagedItem {
  externalId: string;
  sourceUrl: string;
  title: string;
  summary: string;
  contentHash: string;
  relevance: number;
  skippedReason?: string;
}

export async function runSocialDiscovery(opts: {
  topicKey: string;
  query: string;
  budget: FirecrawlBudget;
  minRelevance?: number;
}): Promise<{ items: SocialStagedItem[]; skippedDisallowed: number }> {
  const minRel = opts.minRelevance ?? 0.25;
  const search = await firecrawlSearch(`${opts.query} health wellness research`, opts.budget, 6);
  if (!search.ok) {
    safeLog.warn('social.discovery', 'search skipped', { reason: search.reason });
    return { items: [], skippedDisallowed: 0 };
  }

  let skippedDisallowed = 0;
  const items: SocialStagedItem[] = [];

  for (const r of search.results) {
    if (isHostDisallowed(r.url)) {
      skippedDisallowed += 1;
      safeLog.info('social.discovery', 'disallowed source skipped', {
        host: (() => {
          try {
            return new URL(r.url).hostname;
          } catch {
            return 'invalid';
          }
        })(),
      });
      continue;
    }

    const title = (r.title ?? 'Public discussion').slice(0, 240);
    // Aggregate framing only: no author names stored as identity.
    const summary = `Public aggregate discussion signal: ${(r.description ?? title).slice(0, 400)}`;
    const rel = relevanceScore(`${title} ${summary}`, opts.query);
    if (rel < minRel) continue;

    // PII guard: drop if summary looks like private individual contact
    if (/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(summary) || /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(summary)) {
      continue;
    }

    items.push({
      externalId: `social:${contentHash([r.url]).slice(0, 16)}`,
      sourceUrl: r.url,
      title,
      summary,
      contentHash: contentHash([r.url, title, summary]),
      relevance: rel,
    });
  }

  return { items, skippedDisallowed };
}

/** Schema/sample audit: social staging must be aggregate-only. */
export function assertAggregateOnlySample(rows: Array<{ is_aggregate_only?: boolean; summary?: string }>): boolean {
  return rows.every((r) => r.is_aggregate_only !== false && !/\b[\w.+-]+@[\w-]+\./.test(r.summary ?? ''));
}
