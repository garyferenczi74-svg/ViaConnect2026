-- Prompt 227a G60 Lex sign-off (lex-g60-227a-20260822).
-- APPROVED_WITH_CONDITIONS: stamp cleared live signal sources; degrade broken feeds.

-- 1. Degrade broken RSS feeds (Lex conditions 1-2)
UPDATE public.authorities_sources
SET registry_status = 'degraded',
    notes = COALESCE(notes, '') || ' Lex G60 2026-08-22: feed 404/unavailable; degraded pending corrected URL.',
    lex_review_id = 'lex-g60-227a-20260822-degraded-feed',
    updated_at = now()
WHERE domain IN ('examine.com', 'www.healthline.com');

-- 2. Stamp cleared live signal domains
UPDATE public.authorities_sources
SET lex_review_id = 'lex-g60-227a-20260822',
    notes = COALESCE(notes, '') || ' Lex G60 APPROVED_WITH_CONDITIONS 2026-08-22: signal lane copyright paraphrase-only; no person IDs; dosing claims store no dose values.',
    updated_at = now()
WHERE domain IN (
  'youtube.com',
  'www.precisionnutrition.com',
  'longevity.technology',
  'www.projectcbd.org'
)
AND lane = 'signal';

-- 3. Reaffirm Mercola exclusion
UPDATE public.authorities_sources
SET lane = 'excluded',
    is_active = false,
    approval_status = 'rejected',
    registry_status = 'blocked',
    lex_review_id = 'lex-g60-227a-20260822-excluded',
    blocked_reason = COALESCE(blocked_reason, 'G56 credibility exclusion; never wire'),
    updated_at = now()
WHERE domain ILIKE '%mercola%';

-- 4. Platforms remain Lex-pending
UPDATE public.authorities_sources
SET lex_review_id = 'lex-g60-227a-20260822-platform-pending',
    registry_status = 'pending_access',
    is_active = false,
    updated_at = now()
WHERE domain IN (
  'reddit.com', 'x.com', 'tiktok.com', 'instagram.com', 'facebook.com', 'linkedin.com'
);
