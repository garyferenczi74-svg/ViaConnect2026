-- Prompt #143 §6: add video_url and video_poster_url columns to categories.
--
-- Both nullable text. Default state is NULL on every row, which means
-- <CollectionTileVideoLayer> renders nothing and the existing static
-- bento tile renders unchanged. #143a is the follow-up that writes URLs.
--
-- video_url stores the .mp4 URL. The .webm sibling is constructed at
-- render time via lib/shop/videoUrlHelpers.ts replace .mp4 to .webm.
-- video_poster_url is optional; falls back to hero_image_url if null.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS so re-runs are no-ops.

ALTER TABLE public.categories
    ADD COLUMN IF NOT EXISTS video_url text,
    ADD COLUMN IF NOT EXISTS video_poster_url text;

COMMENT ON COLUMN public.categories.video_url IS
    'Optional CDN URL for the bento tile background video. Null means no video, tile renders static hero_image_url. Stores the .mp4 URL; the .webm variant is implied by replacing the extension.';

COMMENT ON COLUMN public.categories.video_poster_url IS
    'Optional poster frame URL. Falls back to hero_image_url if null.';
