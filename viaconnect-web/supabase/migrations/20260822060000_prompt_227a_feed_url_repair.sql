-- Prompt 227a follow-up: repair signal-lane feed URLs.
-- Project: nnhkcufyqjojdbvdrpky only. Append-only.

-- Healthline: nutrition/rss 404s. Official public feed is health-news (50 items proved 2026-08-22).
UPDATE public.authorities_sources
SET feed_url = 'https://www.healthline.com/rss/health-news',
    registry_status = 'live',
    label = 'Healthline Health News',
    notes = '227a signal lane. Commercial media. Headlines only. Feed repaired 2026-08-22 to /rss/health-news (nutrition/rss was 404; no nutrition-specific RSS exists).',
    lex_review_id = 'lex-g60-227a-20260822',
    updated_at = now()
WHERE domain = 'www.healthline.com'
  AND lane = 'signal';

-- Examine: no public RSS discovered. Direct fetch hits Vercel bot checkpoint (429).
-- Keep degraded; do not fake a live feed_url. Clear 404 wording (root cause is bot wall / no feed).
UPDATE public.authorities_sources
SET feed_url = NULL,
    registry_status = 'degraded',
    notes = '227a signal lane. Secondary synthesis; headlines only; do not reproduce body. Lex G60: remains degraded. Probe 2026-08-22 found no public RSS; examine.com returns Vercel Security Checkpoint (429) to automated clients. Research Feed is member product, not an open feed. Restore only after official public feed or Lex-cleared transport.',
    lex_review_id = 'lex-g60-227a-20260822-degraded-feed',
    updated_at = now()
WHERE domain = 'examine.com'
  AND lane = 'signal';
