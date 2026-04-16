-- =============================================================
-- Prompt #86B: Body Photo Progress Tracking + Arnold's Vision Brain
-- New tables: body_photo_sessions, photo_share_permissions
-- New storage bucket: body-progress-photos (private)
-- Paths inside bucket: {userId}/{sessionId}/{pose}_{size}.{ext}
-- Append-only; no existing tables touched.
-- =============================================================

-- 1. Photo session metadata
CREATE TABLE IF NOT EXISTS body_photo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,

  front_full_path  TEXT,
  front_thumb_path TEXT,
  back_full_path   TEXT,
  back_thumb_path  TEXT,
  left_full_path   TEXT,
  left_thumb_path  TEXT,
  right_full_path  TEXT,
  right_thumb_path TEXT,

  poses_completed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_complete BOOLEAN GENERATED ALWAYS AS (
    front_full_path IS NOT NULL AND
    back_full_path  IS NOT NULL AND
    left_full_path  IS NOT NULL AND
    right_full_path IS NOT NULL
  ) STORED,

  lighting_condition TEXT DEFAULT 'unknown'
    CHECK (lighting_condition IN ('natural','indoor_bright','indoor_dim','unknown')),
  clothing_type TEXT DEFAULT 'unknown'
    CHECK (clothing_type IN ('minimal','fitted','loose','unknown')),

  arnold_analysis      JSONB,
  arnold_analyzed_at   TIMESTAMPTZ,
  arnold_confidence    NUMERIC(3,2)
    CHECK (arnold_confidence IS NULL OR (arnold_confidence >= 0 AND arnold_confidence <= 1)),
  arnold_status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (arnold_status IN ('pending','queued','analyzing','complete','failed')),
  arnold_error         TEXT,

  linked_entry_id UUID REFERENCES body_tracker_entries(id) ON DELETE SET NULL,

  shared_with_practitioner BOOLEAN NOT NULL DEFAULT false,
  share_expires_at TIMESTAMPTZ,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE body_photo_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='body_photo_sessions' AND policyname='Users manage own photo sessions') THEN
    CREATE POLICY "Users manage own photo sessions"
      ON body_photo_sessions FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_photo_sessions_user_date
  ON body_photo_sessions(user_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_photo_sessions_pending_analysis
  ON body_photo_sessions(arnold_status, created_at)
  WHERE arnold_status IN ('queued','analyzing');

-- 2. Practitioner share permissions
CREATE TABLE IF NOT EXISTS photo_share_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_session_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_session_id      UUID NOT NULL REFERENCES body_photo_sessions(id) ON DELETE CASCADE,
  practitioner_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  note        TEXT,
  CONSTRAINT unique_user_practitioner_session
    UNIQUE (photo_session_id, practitioner_id)
);

ALTER TABLE photo_share_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='photo_share_permissions' AND policyname='User manages own shares') THEN
    CREATE POLICY "User manages own shares"
      ON photo_share_permissions FOR ALL
      USING (auth.uid() = photo_session_user_id)
      WITH CHECK (auth.uid() = photo_session_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='photo_share_permissions' AND policyname='Practitioner reads shares granted to them') THEN
    CREATE POLICY "Practitioner reads shares granted to them"
      ON photo_share_permissions FOR SELECT
      USING (auth.uid() = practitioner_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_photo_shares_practitioner_active
  ON photo_share_permissions(practitioner_id, expires_at)
  WHERE revoked_at IS NULL;

-- 3. Storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'body-progress-photos',
  'body-progress-photos',
  false,
  15728640, -- 15 MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS: user owns all photos in their folder; practitioner can read when share is active
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users upload own body photos') THEN
    CREATE POLICY "Users upload own body photos"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'body-progress-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users view own body photos') THEN
    CREATE POLICY "Users view own body photos"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'body-progress-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users update own body photos') THEN
    CREATE POLICY "Users update own body photos"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'body-progress-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users delete own body photos') THEN
    CREATE POLICY "Users delete own body photos"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'body-progress-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Practitioners view shared body photos') THEN
    CREATE POLICY "Practitioners view shared body photos"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'body-progress-photos'
        AND EXISTS (
          SELECT 1 FROM photo_share_permissions p
          JOIN body_photo_sessions s ON s.id = p.photo_session_id
          WHERE p.practitioner_id = auth.uid()
            AND p.revoked_at IS NULL
            AND p.expires_at > now()
            AND p.photo_session_user_id::text = (storage.foldername(name))[1]
        )
      );
  END IF;
END $$;

-- 5. updated_at trigger for body_photo_sessions
CREATE OR REPLACE FUNCTION body_photo_sessions_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_body_photo_sessions_updated_at') THEN
    CREATE TRIGGER trg_body_photo_sessions_updated_at
    BEFORE UPDATE ON body_photo_sessions
    FOR EACH ROW EXECUTE FUNCTION body_photo_sessions_set_updated_at();
  END IF;
END $$;
