-- ============================================================
-- Prompt #54a: Protocol Sharing & Provider Relationships
-- ============================================================
-- Consumer-initiated protocol sharing. Patients share their wellness
-- data (supplements, bio score, genetics, CAQ, etc.) with a chosen
-- naturopath or practitioner via email or share code. Providers can
-- only see what was explicitly shared and only act within the
-- permissions the patient granted.
--
-- Note: Prompt #54 (multi-tier shop pricing + practitioner_patients)
-- has not been built on main yet, so this migration is self-contained:
-- it does NOT depend on shop_pricing_tiers or practitioner_patients.
-- The provider↔patient relationship lives directly on protocol_shares.

-- 1. Protocol Share Invitations (consumer-initiated)
CREATE TABLE IF NOT EXISTS protocol_shares (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- provider_id is NULL until the share is accepted by the recipient.
  provider_type   TEXT NOT NULL CHECK (provider_type IN ('naturopath','practitioner')),
  invite_email    TEXT,
  invite_code     TEXT NOT NULL UNIQUE,
  -- 8-char alphanumeric code (no I, O, 0, 1) the patient can hand off
  -- to a provider verbally / on paper / via any channel.

  -- What's shared (boolean per data category)
  share_supplements              BOOLEAN NOT NULL DEFAULT true,
  share_genetic_results          BOOLEAN NOT NULL DEFAULT false,
  share_caq_data                 BOOLEAN NOT NULL DEFAULT false,
  share_bio_optimization_score   BOOLEAN NOT NULL DEFAULT true,
  share_wellness_analytics       BOOLEAN NOT NULL DEFAULT false,
  share_peptide_recommendations  BOOLEAN NOT NULL DEFAULT false,
  share_lab_results              BOOLEAN NOT NULL DEFAULT false,

  -- What the provider may DO (action permissions)
  can_order_on_behalf            BOOLEAN NOT NULL DEFAULT false,
  can_modify_protocol            BOOLEAN NOT NULL DEFAULT false,
  can_recommend_products         BOOLEAN NOT NULL DEFAULT true,

  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','revoked','expired','declined')),
  accepted_at     TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  notes           TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A patient can hold at most one ACTIVE share to the same provider.
CREATE UNIQUE INDEX IF NOT EXISTS protocol_shares_active_unique
  ON protocol_shares (patient_id, provider_id)
  WHERE status = 'active' AND provider_id IS NOT NULL;

-- 2. Audit log
CREATE TABLE IF NOT EXISTS protocol_share_activity (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id    UUID NOT NULL REFERENCES protocol_shares(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  -- 'created' | 'accepted' | 'declined' | 'revoked' | 'updated_permissions'
  -- 'viewed_protocol' | 'ordered_for_patient' | 'recommended_product' | 'modified_protocol'
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Naturopath profile extensions
CREATE TABLE IF NOT EXISTS naturopath_profiles (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  license_number    TEXT,
  license_state     TEXT,
  license_type      TEXT CHECK (license_type IS NULL OR license_type IN ('ND','NMD','RHN','CNP','other')),
  practice_name     TEXT,
  practice_address  TEXT,
  practice_city     TEXT,
  practice_state    TEXT,
  practice_zip      TEXT,
  practice_phone    TEXT,
  specialties       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  accepting_patients BOOLEAN NOT NULL DEFAULT true,
  bio               TEXT,
  profile_photo_url TEXT,
  website_url       TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RLS
ALTER TABLE protocol_shares          ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_share_activity  ENABLE ROW LEVEL SECURITY;
ALTER TABLE naturopath_profiles      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients manage own shares" ON protocol_shares;
CREATE POLICY "Patients manage own shares" ON protocol_shares
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Providers read own shares" ON protocol_shares;
CREATE POLICY "Providers read own shares" ON protocol_shares
  FOR SELECT USING (auth.uid() = provider_id AND status = 'active');

DROP POLICY IF EXISTS "Share parties read activity" ON protocol_share_activity;
CREATE POLICY "Share parties read activity" ON protocol_share_activity
  FOR SELECT USING (
    share_id IN (
      SELECT id FROM protocol_shares
      WHERE patient_id = auth.uid() OR provider_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Share parties write activity" ON protocol_share_activity;
CREATE POLICY "Share parties write activity" ON protocol_share_activity
  FOR INSERT WITH CHECK (
    actor_id = auth.uid() AND
    share_id IN (
      SELECT id FROM protocol_shares
      WHERE patient_id = auth.uid() OR provider_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Naturopaths manage own profile" ON naturopath_profiles;
CREATE POLICY "Naturopaths manage own profile" ON naturopath_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public reads naturopath profiles" ON naturopath_profiles;
CREATE POLICY "Public reads naturopath profiles" ON naturopath_profiles
  FOR SELECT USING (true);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_shares_patient        ON protocol_shares(patient_id);
CREATE INDEX IF NOT EXISTS idx_shares_provider       ON protocol_shares(provider_id);
CREATE INDEX IF NOT EXISTS idx_shares_invite_email   ON protocol_shares(LOWER(invite_email));
CREATE INDEX IF NOT EXISTS idx_shares_invite_code    ON protocol_shares(invite_code);
CREATE INDEX IF NOT EXISTS idx_shares_status         ON protocol_shares(status);
CREATE INDEX IF NOT EXISTS idx_share_activity_share  ON protocol_share_activity(share_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_naturopath_profiles_user ON naturopath_profiles(user_id);

-- 6. Invite code generator (excludes confusables I, O, 0, 1)
CREATE OR REPLACE FUNCTION generate_protocol_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars  TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i      INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 7. updated_at trigger
CREATE OR REPLACE FUNCTION protocol_shares_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protocol_shares_updated_at ON protocol_shares;
CREATE TRIGGER protocol_shares_updated_at
  BEFORE UPDATE ON protocol_shares
  FOR EACH ROW EXECUTE FUNCTION protocol_shares_set_updated_at();

DROP TRIGGER IF EXISTS naturopath_profiles_updated_at ON naturopath_profiles;
CREATE TRIGGER naturopath_profiles_updated_at
  BEFORE UPDATE ON naturopath_profiles
  FOR EACH ROW EXECUTE FUNCTION protocol_shares_set_updated_at();

-- 8. Atomic create-share RPC
CREATE OR REPLACE FUNCTION protocol_share_create(
  p_provider_type     TEXT,
  p_invite_email      TEXT,
  p_share_supplements             BOOLEAN,
  p_share_genetic_results         BOOLEAN,
  p_share_caq_data                BOOLEAN,
  p_share_bio_optimization_score  BOOLEAN,
  p_share_wellness_analytics      BOOLEAN,
  p_share_peptide_recommendations BOOLEAN,
  p_share_lab_results             BOOLEAN,
  p_can_order_on_behalf           BOOLEAN,
  p_can_modify_protocol           BOOLEAN,
  p_can_recommend_products        BOOLEAN,
  p_notes                         TEXT DEFAULT NULL
)
RETURNS protocol_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code    TEXT;
  v_row     protocol_shares;
  v_attempts INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'protocol_share_create: not authenticated';
  END IF;

  IF p_provider_type NOT IN ('naturopath','practitioner') THEN
    RAISE EXCEPTION 'protocol_share_create: invalid provider_type';
  END IF;

  LOOP
    v_code := generate_protocol_invite_code();
    BEGIN
      INSERT INTO protocol_shares (
        patient_id, provider_type, invite_email, invite_code,
        share_supplements, share_genetic_results, share_caq_data,
        share_bio_optimization_score, share_wellness_analytics,
        share_peptide_recommendations, share_lab_results,
        can_order_on_behalf, can_modify_protocol, can_recommend_products,
        notes
      ) VALUES (
        v_user_id, p_provider_type, LOWER(NULLIF(TRIM(p_invite_email), '')), v_code,
        COALESCE(p_share_supplements, true),
        COALESCE(p_share_genetic_results, false),
        COALESCE(p_share_caq_data, false),
        COALESCE(p_share_bio_optimization_score, true),
        COALESCE(p_share_wellness_analytics, false),
        COALESCE(p_share_peptide_recommendations, false),
        COALESCE(p_share_lab_results, false),
        COALESCE(p_can_order_on_behalf, false),
        COALESCE(p_can_modify_protocol, false),
        COALESCE(p_can_recommend_products, true),
        p_notes
      ) RETURNING * INTO v_row;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts >= 5 THEN
        RAISE EXCEPTION 'protocol_share_create: could not allocate a unique invite code';
      END IF;
    END;
  END LOOP;

  INSERT INTO protocol_share_activity (share_id, actor_id, action, details)
  VALUES (v_row.id, v_user_id, 'created', jsonb_build_object('invite_email', v_row.invite_email));

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION protocol_share_create(TEXT,TEXT,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,TEXT) TO authenticated;

-- 9. Atomic accept-share RPC
CREATE OR REPLACE FUNCTION protocol_share_accept(p_invite_code TEXT)
RETURNS protocol_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_user_email TEXT;
  v_row        protocol_shares;
  v_normalized TEXT := UPPER(REGEXP_REPLACE(COALESCE(p_invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'protocol_share_accept: not authenticated';
  END IF;

  IF length(v_normalized) <> 8 THEN
    RAISE EXCEPTION 'protocol_share_accept: invite code must be 8 characters';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  SELECT * INTO v_row
  FROM protocol_shares
  WHERE invite_code = v_normalized
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'protocol_share_accept: invite code not found, expired, or already accepted';
  END IF;

  IF v_row.patient_id = v_user_id THEN
    RAISE EXCEPTION 'protocol_share_accept: cannot accept your own share';
  END IF;

  IF v_row.invite_email IS NOT NULL AND LOWER(v_row.invite_email) <> LOWER(COALESCE(v_user_email, '')) THEN
    RAISE EXCEPTION 'protocol_share_accept: this share was sent to a different email';
  END IF;

  UPDATE protocol_shares
     SET provider_id  = v_user_id,
         status       = 'active',
         accepted_at  = NOW()
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  INSERT INTO protocol_share_activity (share_id, actor_id, action)
  VALUES (v_row.id, v_user_id, 'accepted');

  INSERT INTO user_notifications (user_id, type, title, body, link, metadata)
  VALUES (
    v_row.patient_id,
    'protocol_share_accepted',
    'Your protocol share was accepted',
    'A provider accepted your protocol share invitation.',
    '/settings/shared-access',
    jsonb_build_object('share_id', v_row.id, 'provider_id', v_user_id)
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION protocol_share_accept(TEXT) TO authenticated;

-- 10. Revoke RPC
CREATE OR REPLACE FUNCTION protocol_share_revoke(p_share_id UUID)
RETURNS protocol_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row     protocol_shares;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'protocol_share_revoke: not authenticated';
  END IF;

  UPDATE protocol_shares
     SET status     = 'revoked',
         revoked_at = NOW()
   WHERE id = p_share_id
     AND patient_id = v_user_id
     AND status IN ('pending', 'active')
   RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'protocol_share_revoke: share not found or not yours';
  END IF;

  INSERT INTO protocol_share_activity (share_id, actor_id, action)
  VALUES (v_row.id, v_user_id, 'revoked');

  IF v_row.provider_id IS NOT NULL THEN
    INSERT INTO user_notifications (user_id, type, title, body, metadata)
    VALUES (
      v_row.provider_id,
      'protocol_share_revoked',
      'A patient revoked your protocol access',
      'Your access to a patient protocol has been revoked.',
      jsonb_build_object('share_id', v_row.id, 'patient_id', v_row.patient_id)
    );
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION protocol_share_revoke(UUID) TO authenticated;
