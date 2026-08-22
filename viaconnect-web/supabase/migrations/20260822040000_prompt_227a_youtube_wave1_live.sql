-- Prompt 227a: YouTube Wave 1 ready for official Data API (key on Vercel).
-- Runtime ingest flips last_item_yielded_at; this marks registry live.

UPDATE public.authorities_sources
SET registry_status = 'live',
    is_active = true,
    transport = 'rest_api',
    lane = 'signal',
    expected_cadence = COALESCE(expected_cadence, '24h'),
    staleness_threshold = COALESCE(staleness_threshold, interval '14 days'),
    lex_review_id = COALESCE(lex_review_id, 'lex-wave1-youtube-official-api'),
    notes = 'G58 Wave 1 live via official YouTube Data API v3 (YOUTUBE_DATA_API_KEY). No scraping. No channel handles or person IDs stored.',
    updated_at = now()
WHERE domain = 'youtube.com';

-- Other platforms remain Lex-pending
UPDATE public.authorities_sources
SET registry_status = 'pending_access',
    is_active = false,
    updated_at = now()
WHERE domain IN (
  'reddit.com', 'x.com', 'tiktok.com', 'instagram.com', 'facebook.com', 'linkedin.com'
);
