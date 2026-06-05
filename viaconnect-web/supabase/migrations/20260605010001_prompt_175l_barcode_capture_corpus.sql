-- =============================================================================
-- Prompt 175l (2026-06-05): barcode capture corpus index.
--
-- Per 175f Section 6.1. PHI-free metadata index that points at the
-- captured frame stored in the barcode-analyzer bucket. One row per
-- scan attempt (success or failure). storage_path is NULL when consent
-- was not granted; the row is still written so failure analytics work
-- without the image content.
--
-- APPEND-ONLY: this is a NEW migration.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.barcode_capture_corpus (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path    text,
  user_hash       text NOT NULL,
  consent         boolean NOT NULL DEFAULT false,
  decode_success  boolean NOT NULL DEFAULT false,
  decoded_value   text,
  symbology       text,
  valid_checksum  boolean,
  image_bytes     integer,
  frame_width     integer,
  frame_height    integer,
  device          text,
  region          text,
  captured_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_corpus_image_bytes_nonneg
    CHECK (image_bytes IS NULL OR image_bytes >= 0),
  CONSTRAINT chk_corpus_dims_nonneg
    CHECK (
      (frame_width IS NULL OR frame_width >= 0)
      AND (frame_height IS NULL OR frame_height >= 0)
    )
);

COMMENT ON TABLE public.barcode_capture_corpus IS
  'PHI-free index of barcode capture attempts (Prompt 175f Section 6.1). Pointer to barcode-analyzer bucket object when consent allowed image storage; metadata-only row otherwise. Salted user_hash, never auth.uid().';

CREATE INDEX IF NOT EXISTS idx_barcode_corpus_success_captured
  ON public.barcode_capture_corpus (decode_success, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_barcode_corpus_user_hash_captured
  ON public.barcode_capture_corpus (user_hash, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_barcode_corpus_symbology_captured
  ON public.barcode_capture_corpus (symbology, captured_at DESC)
  WHERE symbology IS NOT NULL;

ALTER TABLE public.barcode_capture_corpus ENABLE ROW LEVEL SECURITY;

-- No SELECT / INSERT / UPDATE / DELETE policies. RLS denies all without
-- policies, so only the service role bypasses (intentional).
