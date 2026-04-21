-- Prompt #105 Workstream B — templates + AI prompts + packs + sections + artifacts.
-- EXCLUDES: helix_* individual-user data, legal_privileged_communications.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='pack_state') THEN
    CREATE TYPE public.pack_state AS ENUM (
      'draft','mdna_pending','mdna_drafted','cfo_review',
      'cfo_approved','pending_ceo_approval','issued','erratum_issued','archived'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.board_pack_templates (
  template_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name           TEXT NOT NULL,
  version                 INTEGER NOT NULL,
  section_schema_json     JSONB NOT NULL,
  default_board_scope     TEXT[] NOT NULL DEFAULT ARRAY['director','executive']::TEXT[],
  counsel_reviewed_at     TIMESTAMPTZ,
  counsel_reviewer_id     UUID REFERENCES auth.users(id),
  status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_name, version)
);
CREATE INDEX IF NOT EXISTS idx_bpt_status ON public.board_pack_templates(status);
DROP TRIGGER IF EXISTS trg_bpt_touch ON public.board_pack_templates;
CREATE TRIGGER trg_bpt_touch BEFORE UPDATE ON public.board_pack_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.board_pack_ai_prompts (
  prompt_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version                 INTEGER NOT NULL,
  section_type            TEXT NOT NULL,
  system_prompt_md        TEXT NOT NULL,
  output_schema_json      JSONB NOT NULL,
  token_budget            INTEGER NOT NULL DEFAULT 18000,
  reviewed_by_cfo_id      UUID REFERENCES auth.users(id),
  reviewed_at_cfo         TIMESTAMPTZ,
  status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (section_type, version)
);
CREATE INDEX IF NOT EXISTS idx_bpap_active ON public.board_pack_ai_prompts(section_type) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.board_packs (
  pack_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code              TEXT NOT NULL,
  pack_title              TEXT NOT NULL,
  meeting_id              UUID,
  template_id             UUID NOT NULL REFERENCES public.board_pack_templates(template_id),
  template_version        INTEGER NOT NULL,
  aggregation_snapshot_id UUID NOT NULL REFERENCES public.aggregation_snapshots(snapshot_id),
  period_type             public.aggregation_period_type NOT NULL,
  period_start            DATE NOT NULL,
  period_end              DATE NOT NULL,
  state                   public.pack_state NOT NULL DEFAULT 'draft',
  cfo_approved_by         UUID REFERENCES auth.users(id),
  cfo_approved_at         TIMESTAMPTZ,
  ceo_issued_by           UUID REFERENCES auth.users(id),
  ceo_issued_at           TIMESTAMPTZ,
  supersedes_pack_id      UUID REFERENCES public.board_packs(pack_id),
  erratum_description_md  TEXT,
  created_by              UUID NOT NULL REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (short_code)
);
CREATE INDEX IF NOT EXISTS idx_bp_state ON public.board_packs(state);
CREATE INDEX IF NOT EXISTS idx_bp_period ON public.board_packs(period_end DESC);
DROP TRIGGER IF EXISTS trg_bp_touch ON public.board_packs;
CREATE TRIGGER trg_bp_touch BEFORE UPDATE ON public.board_packs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Issued pack immutability: once state=issued, forbid any UPDATE that
-- changes anything other than state transitions to archived/erratum_issued.
CREATE OR REPLACE FUNCTION public.enforce_issued_pack_immutability()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.state = 'issued'::pack_state THEN
    -- Permitted transitions from issued: erratum_issued, archived.
    IF NEW.state NOT IN ('issued','erratum_issued','archived')::pack_state[] THEN
      RAISE EXCEPTION 'issued board_pack is immutable except for erratum_issued or archived transitions' USING ERRCODE = 'P0001';
    END IF;
    -- Verify the content didn't change: snapshot, template, commentary references, etc.
    IF OLD.aggregation_snapshot_id != NEW.aggregation_snapshot_id
       OR OLD.template_id != NEW.template_id
       OR OLD.template_version != NEW.template_version
       OR OLD.period_start != NEW.period_start
       OR OLD.period_end != NEW.period_end
       OR OLD.pack_title != NEW.pack_title
       OR OLD.short_code != NEW.short_code
    THEN
      RAISE EXCEPTION 'issued board_pack core fields cannot be modified' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_bp_issued_immutable ON public.board_packs;
CREATE TRIGGER trg_bp_issued_immutable
  BEFORE UPDATE ON public.board_packs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_issued_pack_immutability();

CREATE TABLE IF NOT EXISTS public.board_pack_sections (
  section_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id                 UUID NOT NULL REFERENCES public.board_packs(pack_id) ON DELETE CASCADE,
  section_type            TEXT NOT NULL,
  section_order           INTEGER NOT NULL,
  title                   TEXT NOT NULL,
  content_json            JSONB NOT NULL,
  commentary_md           TEXT,
  commentary_source       TEXT NOT NULL DEFAULT 'system' CHECK (commentary_source IN (
    'system','ai_drafted','human_authored','ai_drafted_human_edited'
  )),
  ai_prompt_version       INTEGER,
  ai_model                TEXT,
  ai_thinking_tokens      INTEGER,
  cfo_reviewed_by         UUID REFERENCES auth.users(id),
  cfo_reviewed_at         TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pack_id, section_order)
);
CREATE INDEX IF NOT EXISTS idx_bps_pack ON public.board_pack_sections(pack_id, section_order);
DROP TRIGGER IF EXISTS trg_bps_touch ON public.board_pack_sections;
CREATE TRIGGER trg_bps_touch BEFORE UPDATE ON public.board_pack_sections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Section immutability inherited from parent pack's issued state.
CREATE OR REPLACE FUNCTION public.enforce_issued_pack_section_immutability()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE parent_state TEXT;
BEGIN
  SELECT state::TEXT INTO parent_state FROM public.board_packs
  WHERE pack_id = COALESCE(OLD.pack_id, NEW.pack_id);
  IF parent_state = 'issued' THEN
    RAISE EXCEPTION 'section belongs to an issued board_pack; mutation forbidden' USING ERRCODE = 'P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_bps_issued_immutable ON public.board_pack_sections;
CREATE TRIGGER trg_bps_issued_immutable BEFORE UPDATE OR DELETE ON public.board_pack_sections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_issued_pack_section_immutability();

CREATE TABLE IF NOT EXISTS public.board_pack_artifacts (
  artifact_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id                 UUID NOT NULL REFERENCES public.board_packs(pack_id),
  distribution_id         UUID,
  artifact_format         TEXT NOT NULL CHECK (artifact_format IN ('pdf','xlsx','pptx')),
  storage_path            TEXT NOT NULL,
  sha256_hash             TEXT NOT NULL,
  rendered_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  byte_size               BIGINT
);
CREATE INDEX IF NOT EXISTS idx_bpa_pack ON public.board_pack_artifacts(pack_id);
CREATE INDEX IF NOT EXISTS idx_bpa_distribution ON public.board_pack_artifacts(distribution_id);

DROP TRIGGER IF EXISTS trg_bpa_issued_immutable ON public.board_pack_artifacts;
CREATE TRIGGER trg_bpa_issued_immutable BEFORE UPDATE OR DELETE ON public.board_pack_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_issued_pack_section_immutability();
