-- =============================================================================
-- Prompt #118 Phase 1: Body Tracker graphics upgrade.
-- Adds 3 tables:
--   body_graphics_preferences (per-user display prefs)
--   body_regions (canonical reference data for ~66 regions)
--   body_graphic_interactions (telemetry of region taps/hovers/focus)
-- Plus inline seed of all composition + muscle regions referenced by the
-- 4 gender/view SVG assets.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- body_graphics_preferences: per-user display choices.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.body_graphics_preferences (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_gender         TEXT NOT NULL DEFAULT 'male'   CHECK (default_gender IN ('male','female')),
  default_view           TEXT NOT NULL DEFAULT 'front'  CHECK (default_view IN ('front','back')),
  show_anatomical_detail BOOLEAN NOT NULL DEFAULT TRUE,
  show_region_labels     BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_size         TEXT NOT NULL DEFAULT 'standard' CHECK (preferred_size IN ('compact','standard','large')),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.body_graphics_preferences IS
  'Prompt #118 per-user preferences for the Body Graphic component (gender + view + detail toggles).';

CREATE INDEX IF NOT EXISTS idx_body_prefs_updated ON public.body_graphics_preferences (updated_at DESC);

ALTER TABLE public.body_graphics_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='body_graphics_preferences' AND policyname='bgp_self_rw') THEN
    CREATE POLICY "bgp_self_rw" ON public.body_graphics_preferences FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- body_regions: canonical region definitions. Read-only to all authenticated
-- users; write is admin-only via service role.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.body_regions (
  region_id        TEXT PRIMARY KEY,
  display_name     TEXT NOT NULL,
  display_name_fr  TEXT,
  region_type      TEXT NOT NULL CHECK (region_type IN ('composition','muscle','both')),
  parent_region    TEXT REFERENCES public.body_regions(region_id),
  anatomical_group TEXT NOT NULL,
  applicable_views TEXT[] NOT NULL DEFAULT ARRAY['front','back']::TEXT[],
  display_order    INTEGER NOT NULL DEFAULT 0,
  is_bilateral     BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.body_regions IS
  'Prompt #118 canonical region registry. Mirrored by src/components/body-tracker/body-graphic/regions/*.ts.';

CREATE INDEX IF NOT EXISTS idx_body_regions_type  ON public.body_regions (region_type);
CREATE INDEX IF NOT EXISTS idx_body_regions_group ON public.body_regions (anatomical_group);

ALTER TABLE public.body_regions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='body_regions' AND policyname='br_read_all') THEN
    CREATE POLICY "br_read_all" ON public.body_regions FOR SELECT TO authenticated, anon USING (TRUE);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- body_graphic_interactions: telemetry (user-scoped INSERT + SELECT).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.body_graphic_interactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id        TEXT NOT NULL REFERENCES public.body_regions(region_id),
  mode             TEXT NOT NULL CHECK (mode IN ('composition','muscle')),
  gender           TEXT NOT NULL CHECK (gender IN ('male','female')),
  view             TEXT NOT NULL CHECK (view IN ('front','back')),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('click','hover','focus','long-press')),
  session_id       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.body_graphic_interactions IS
  'Prompt #118 telemetry of user interactions with the Body Graphic. User-scoped RLS (self-INSERT + self-SELECT); admin read via service role.';

CREATE INDEX IF NOT EXISTS idx_bgi_user_created   ON public.body_graphic_interactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bgi_region_created ON public.body_graphic_interactions (region_id, created_at DESC);

ALTER TABLE public.body_graphic_interactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='body_graphic_interactions' AND policyname='bgi_self_insert') THEN
    CREATE POLICY "bgi_self_insert" ON public.body_graphic_interactions FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='body_graphic_interactions' AND policyname='bgi_self_read') THEN
    CREATE POLICY "bgi_self_read" ON public.body_graphic_interactions FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Region seed: 10 composition zones + 26 front muscles + 29 back muscles = 65 rows.
-- ---------------------------------------------------------------------------
INSERT INTO public.body_regions (region_id, display_name, display_name_fr, region_type, anatomical_group, applicable_views, display_order, is_bilateral) VALUES
-- Composition (10)
('comp-head',       'Head & Face',        'Tête et visage',    'composition', 'upper-body', ARRAY['front','back'], 10,  FALSE),
('comp-neck',       'Neck',               'Cou',               'composition', 'upper-body', ARRAY['front','back'], 20,  FALSE),
('comp-chest',      'Chest',              'Poitrine',          'composition', 'upper-body', ARRAY['front'],         30,  FALSE),
('comp-upper-back', 'Upper Back',         'Haut du dos',       'composition', 'upper-body', ARRAY['back'],          40,  FALSE),
('comp-abdomen',    'Abdomen',            'Abdomen',           'composition', 'core',       ARRAY['front'],         50,  FALSE),
('comp-lower-back', 'Lower Back',         'Bas du dos',        'composition', 'core',       ARRAY['back'],          60,  FALSE),
('comp-right-arm',  'Right Arm',          'Bras droit',        'composition', 'upper-limb', ARRAY['front','back'], 70,  TRUE),
('comp-left-arm',   'Left Arm',           'Bras gauche',       'composition', 'upper-limb', ARRAY['front','back'], 80,  TRUE),
('comp-right-leg',  'Right Leg',          'Jambe droite',      'composition', 'lower-limb', ARRAY['front','back'], 90,  TRUE),
('comp-left-leg',   'Left Leg',           'Jambe gauche',      'composition', 'lower-limb', ARRAY['front','back'], 100, TRUE),
-- Muscles, front view (26)
('sternocleidomastoid',        'Sternocleidomastoid',          'Sterno-cléido-mastoïdien',     'muscle', 'upper-body', ARRAY['front'], 110, FALSE),
('pectoralis-major-right',     'Right Pectoralis Major',       'Grand pectoral droit',         'muscle', 'upper-body', ARRAY['front'], 120, TRUE),
('pectoralis-major-left',      'Left Pectoralis Major',        'Grand pectoral gauche',        'muscle', 'upper-body', ARRAY['front'], 130, TRUE),
('deltoid-anterior-right',     'Right Anterior Deltoid',       'Deltoïde antérieur droit',     'muscle', 'upper-limb', ARRAY['front'], 140, TRUE),
('deltoid-anterior-left',      'Left Anterior Deltoid',        'Deltoïde antérieur gauche',    'muscle', 'upper-limb', ARRAY['front'], 150, TRUE),
('biceps-brachii-right',       'Right Biceps Brachii',         'Biceps brachial droit',        'muscle', 'upper-limb', ARRAY['front'], 160, TRUE),
('biceps-brachii-left',        'Left Biceps Brachii',          'Biceps brachial gauche',       'muscle', 'upper-limb', ARRAY['front'], 170, TRUE),
('brachialis-right',           'Right Brachialis',             'Brachial droit',               'muscle', 'upper-limb', ARRAY['front'], 180, TRUE),
('brachialis-left',            'Left Brachialis',              'Brachial gauche',              'muscle', 'upper-limb', ARRAY['front'], 190, TRUE),
('forearm-flexors-right',      'Right Forearm Flexors',        'Fléchisseurs avant-bras droit','muscle', 'upper-limb', ARRAY['front'], 200, TRUE),
('forearm-flexors-left',       'Left Forearm Flexors',         'Fléchisseurs avant-bras gauche','muscle','upper-limb', ARRAY['front'], 210, TRUE),
('rectus-abdominis',           'Rectus Abdominis',             'Grand droit de l''abdomen',    'muscle', 'core',       ARRAY['front'], 220, FALSE),
('external-oblique-right',     'Right External Oblique',       'Oblique externe droit',        'muscle', 'core',       ARRAY['front'], 230, TRUE),
('external-oblique-left',      'Left External Oblique',        'Oblique externe gauche',       'muscle', 'core',       ARRAY['front'], 240, TRUE),
('serratus-anterior-right',    'Right Serratus Anterior',      'Dentelé antérieur droit',      'muscle', 'core',       ARRAY['front'], 250, TRUE),
('serratus-anterior-left',     'Left Serratus Anterior',       'Dentelé antérieur gauche',     'muscle', 'core',       ARRAY['front'], 260, TRUE),
('rectus-femoris-right',       'Right Rectus Femoris',         'Droit fémoral droit',          'muscle', 'lower-limb', ARRAY['front'], 270, TRUE),
('rectus-femoris-left',        'Left Rectus Femoris',          'Droit fémoral gauche',         'muscle', 'lower-limb', ARRAY['front'], 280, TRUE),
('vastus-lateralis-right',     'Right Vastus Lateralis',       'Vaste latéral droit',          'muscle', 'lower-limb', ARRAY['front'], 290, TRUE),
('vastus-lateralis-left',      'Left Vastus Lateralis',        'Vaste latéral gauche',         'muscle', 'lower-limb', ARRAY['front'], 300, TRUE),
('vastus-medialis-right',      'Right Vastus Medialis',        'Vaste médial droit',           'muscle', 'lower-limb', ARRAY['front'], 310, TRUE),
('vastus-medialis-left',       'Left Vastus Medialis',         'Vaste médial gauche',          'muscle', 'lower-limb', ARRAY['front'], 320, TRUE),
('adductors-right',            'Right Adductors',              'Adducteurs droit',             'muscle', 'lower-limb', ARRAY['front'], 330, TRUE),
('adductors-left',             'Left Adductors',               'Adducteurs gauche',            'muscle', 'lower-limb', ARRAY['front'], 340, TRUE),
('tibialis-anterior-right',    'Right Tibialis Anterior',      'Tibial antérieur droit',       'muscle', 'lower-limb', ARRAY['front'], 350, TRUE),
('tibialis-anterior-left',     'Left Tibialis Anterior',       'Tibial antérieur gauche',      'muscle', 'lower-limb', ARRAY['front'], 360, TRUE),
-- Muscles, back view (30)
('trapezius-upper',            'Upper Trapezius',              'Trapèze supérieur',            'muscle', 'upper-body', ARRAY['back'], 400, FALSE),
('trapezius-middle',           'Middle Trapezius',             'Trapèze moyen',                'muscle', 'upper-body', ARRAY['back'], 410, FALSE),
('trapezius-lower',            'Lower Trapezius',              'Trapèze inférieur',            'muscle', 'upper-body', ARRAY['back'], 420, FALSE),
('deltoid-posterior-right',    'Right Posterior Deltoid',      'Deltoïde postérieur droit',    'muscle', 'upper-limb', ARRAY['back'], 430, TRUE),
('deltoid-posterior-left',     'Left Posterior Deltoid',       'Deltoïde postérieur gauche',   'muscle', 'upper-limb', ARRAY['back'], 440, TRUE),
('triceps-brachii-right',      'Right Triceps Brachii',        'Triceps brachial droit',       'muscle', 'upper-limb', ARRAY['back'], 450, TRUE),
('triceps-brachii-left',       'Left Triceps Brachii',         'Triceps brachial gauche',      'muscle', 'upper-limb', ARRAY['back'], 460, TRUE),
('forearm-extensors-right',    'Right Forearm Extensors',      'Extenseurs avant-bras droit',  'muscle', 'upper-limb', ARRAY['back'], 470, TRUE),
('forearm-extensors-left',     'Left Forearm Extensors',       'Extenseurs avant-bras gauche', 'muscle', 'upper-limb', ARRAY['back'], 480, TRUE),
('latissimus-dorsi-right',     'Right Latissimus Dorsi',       'Grand dorsal droit',           'muscle', 'upper-body', ARRAY['back'], 490, TRUE),
('latissimus-dorsi-left',      'Left Latissimus Dorsi',        'Grand dorsal gauche',          'muscle', 'upper-body', ARRAY['back'], 500, TRUE),
('rhomboids',                  'Rhomboids',                    'Rhomboïdes',                   'muscle', 'upper-body', ARRAY['back'], 510, FALSE),
('teres-major-right',          'Right Teres Major',            'Grand rond droit',             'muscle', 'upper-body', ARRAY['back'], 520, TRUE),
('teres-major-left',           'Left Teres Major',             'Grand rond gauche',            'muscle', 'upper-body', ARRAY['back'], 530, TRUE),
('erector-spinae',             'Erector Spinae',               'Érecteurs du rachis',          'muscle', 'core',       ARRAY['back'], 540, FALSE),
('gluteus-maximus-right',      'Right Gluteus Maximus',        'Grand fessier droit',          'muscle', 'lower-limb', ARRAY['back'], 550, TRUE),
('gluteus-maximus-left',       'Left Gluteus Maximus',         'Grand fessier gauche',         'muscle', 'lower-limb', ARRAY['back'], 560, TRUE),
('gluteus-medius-right',       'Right Gluteus Medius',         'Moyen fessier droit',          'muscle', 'lower-limb', ARRAY['back'], 570, TRUE),
('gluteus-medius-left',        'Left Gluteus Medius',          'Moyen fessier gauche',         'muscle', 'lower-limb', ARRAY['back'], 580, TRUE),
('biceps-femoris-right',       'Right Biceps Femoris',         'Biceps fémoral droit',         'muscle', 'lower-limb', ARRAY['back'], 590, TRUE),
('biceps-femoris-left',        'Left Biceps Femoris',          'Biceps fémoral gauche',        'muscle', 'lower-limb', ARRAY['back'], 600, TRUE),
('semitendinosus-right',       'Right Semitendinosus',         'Semi-tendineux droit',         'muscle', 'lower-limb', ARRAY['back'], 610, TRUE),
('semitendinosus-left',        'Left Semitendinosus',          'Semi-tendineux gauche',        'muscle', 'lower-limb', ARRAY['back'], 620, TRUE),
('semimembranosus-right',      'Right Semimembranosus',        'Semi-membraneux droit',        'muscle', 'lower-limb', ARRAY['back'], 630, TRUE),
('semimembranosus-left',       'Left Semimembranosus',         'Semi-membraneux gauche',       'muscle', 'lower-limb', ARRAY['back'], 640, TRUE),
('gastrocnemius-right',        'Right Gastrocnemius',          'Gastrocnémien droit',          'muscle', 'lower-limb', ARRAY['back'], 650, TRUE),
('gastrocnemius-left',         'Left Gastrocnemius',           'Gastrocnémien gauche',         'muscle', 'lower-limb', ARRAY['back'], 660, TRUE),
('soleus-right',               'Right Soleus',                 'Soléaire droit',               'muscle', 'lower-limb', ARRAY['back'], 670, TRUE),
('soleus-left',                'Left Soleus',                  'Soléaire gauche',              'muscle', 'lower-limb', ARRAY['back'], 680, TRUE)
ON CONFLICT (region_id) DO NOTHING;
