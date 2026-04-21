-- =============================================================================
-- Prompt #105 Workstream A — aggregation snapshots + KPI library + KPI snapshots.
-- =============================================================================
-- EXCLUDES: any helix_* individual-user data, legal_privileged_communications,
--           practitioner_tax_documents row-level access.
--
-- Aggregation layer pre-computes every KPI a board pack references. Packs
-- never run ad-hoc queries against operational data — every figure in an
-- issued pack traces back through the provenance JSON recorded here.
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='aggregation_snapshot_state') THEN
    CREATE TYPE public.aggregation_snapshot_state AS ENUM (
      'draft','computing','computed','cfo_review','cfo_approved','locked','failed'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='aggregation_period_type') THEN
    CREATE TYPE public.aggregation_period_type AS ENUM (
      'monthly','quarterly','annual','trailing_12_months','ytd','ad_hoc'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.aggregation_snapshots (
  snapshot_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type             public.aggregation_period_type NOT NULL,
  period_start            DATE NOT NULL,
  period_end              DATE NOT NULL,
  as_of_timestamp         TIMESTAMPTZ NOT NULL,
  state                   public.aggregation_snapshot_state NOT NULL DEFAULT 'draft',
  computation_started_at  TIMESTAMPTZ,
  computation_ended_at    TIMESTAMPTZ,
  total_kpis_computed     INTEGER NOT NULL DEFAULT 0,
  cfo_reviewer_id         UUID REFERENCES auth.users(id),
  cfo_reviewed_at         TIMESTAMPTZ,
  cfo_review_notes        TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_type, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_agg_snapshots_as_of ON public.aggregation_snapshots(as_of_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agg_snapshots_state ON public.aggregation_snapshots(state);

DROP TRIGGER IF EXISTS trg_agg_snapshots_touch ON public.aggregation_snapshots;
CREATE TRIGGER trg_agg_snapshots_touch BEFORE UPDATE ON public.aggregation_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.kpi_library (
  kpi_id                  TEXT NOT NULL,
  version                 INTEGER NOT NULL,
  display_name            TEXT NOT NULL,
  definition_md           TEXT NOT NULL,
  source_prompt           TEXT NOT NULL,
  source_table            TEXT NOT NULL,
  source_query_sha256     TEXT NOT NULL,
  computation_type        TEXT NOT NULL CHECK (computation_type IN ('sum','avg','median','ratio','count','custom')),
  unit                    TEXT NOT NULL,
  display_format          TEXT NOT NULL,
  direction_of_good       TEXT NOT NULL CHECK (direction_of_good IN ('higher_is_better','lower_is_better','context_dependent')),
  comparison_kpi_ids      TEXT[] NOT NULL DEFAULT '{}',
  owner_role              TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kpi_id, version)
);
CREATE INDEX IF NOT EXISTS idx_kpi_library_source_prompt ON public.kpi_library(source_prompt);
CREATE INDEX IF NOT EXISTS idx_kpi_library_status ON public.kpi_library(status);

DROP TRIGGER IF EXISTS trg_kpi_library_touch ON public.kpi_library;
CREATE TRIGGER trg_kpi_library_touch BEFORE UPDATE ON public.kpi_library
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.board_pack_kpi_snapshots (
  snapshot_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregation_snapshot_id UUID NOT NULL REFERENCES public.aggregation_snapshots(snapshot_id) ON DELETE CASCADE,
  kpi_id                  TEXT NOT NULL,
  kpi_version             INTEGER NOT NULL,
  computed_value_numeric  NUMERIC(20,6),
  computed_value_integer  BIGINT,
  computed_value_json     JSONB,
  unit                    TEXT NOT NULL,
  prior_period_value      NUMERIC(20,6),
  comparison_delta_pct    NUMERIC(10,4),
  provenance_json         JSONB NOT NULL,
  computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (kpi_id, kpi_version) REFERENCES public.kpi_library(kpi_id, version),
  UNIQUE (aggregation_snapshot_id, kpi_id, kpi_version)
);
CREATE INDEX IF NOT EXISTS idx_bpks_aggregation ON public.board_pack_kpi_snapshots(aggregation_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_bpks_kpi ON public.board_pack_kpi_snapshots(kpi_id, kpi_version);

-- Guard: once an aggregation snapshot is `locked`, its KPI snapshots
-- become immutable. Any UPDATE or DELETE raises P0001.
CREATE OR REPLACE FUNCTION public.enforce_locked_kpi_snapshot_immutability()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE parent_state TEXT;
BEGIN
  SELECT state::TEXT INTO parent_state FROM public.aggregation_snapshots
  WHERE snapshot_id = COALESCE(OLD.aggregation_snapshot_id, NEW.aggregation_snapshot_id);
  IF parent_state = 'locked' THEN
    RAISE EXCEPTION 'KPI snapshot belongs to a locked aggregation_snapshot; mutation forbidden' USING ERRCODE = 'P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_bpks_locked_immutable ON public.board_pack_kpi_snapshots;
CREATE TRIGGER trg_bpks_locked_immutable
  BEFORE UPDATE OR DELETE ON public.board_pack_kpi_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.enforce_locked_kpi_snapshot_immutability();

COMMENT ON TABLE public.aggregation_snapshots IS 'One row per (period_type, period_start, period_end). Locked snapshots are read-only forever.';
COMMENT ON TABLE public.kpi_library IS 'Versioned definitions of every KPI referenced in any board pack template. New versions required for formula changes; historical packs keep their original version.';
COMMENT ON TABLE public.board_pack_kpi_snapshots IS 'Computed KPI values frozen against a specific aggregation_snapshot_id. Immutable once parent snapshot is locked.';
