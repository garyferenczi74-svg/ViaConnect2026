-- ============================================================================
-- ViaConnect GeneX360 — Research Hub Tables
-- research_queries: stores all research queries, responses, evidence grades
-- research_library: user-saved research items with tags and notes
-- ============================================================================

-- ── research_queries ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS research_queries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query         text NOT NULL,
  response_markdown text,
  evidence_grade    numeric(3,1),
  evidence_label    text CHECK (evidence_label IN ('Weak', 'Moderate', 'Strong', 'Very Strong')),
  sources_used      text[],
  citations         jsonb,
  source_results    jsonb,
  filters_applied   jsonb,
  genetics_included boolean DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

-- Index for user lookups and ordering
CREATE INDEX idx_research_queries_user_id ON research_queries(user_id);
CREATE INDEX idx_research_queries_created_at ON research_queries(created_at DESC);

-- RLS
ALTER TABLE research_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY research_queries_select ON research_queries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY research_queries_insert ON research_queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ── research_library (saved items) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS research_library (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  research_query_id uuid NOT NULL REFERENCES research_queries(id) ON DELETE CASCADE,
  title             text NOT NULL,
  tags              text[] DEFAULT '{}',
  notes             text,
  created_at        timestamptz DEFAULT now()
);

-- Index for user lookups
CREATE INDEX idx_research_library_user_id ON research_library(user_id);

-- RLS
ALTER TABLE research_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY research_library_select ON research_library
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY research_library_insert ON research_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY research_library_update ON research_library
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY research_library_delete ON research_library
  FOR DELETE USING (auth.uid() = user_id);


-- ── Audit trigger (per project rules: every DB mutation writes to audit_logs) ─

CREATE OR REPLACE FUNCTION audit_research_queries()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, user_id, new_data)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    COALESCE(NEW.user_id, OLD.user_id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_research_queries
  AFTER INSERT OR UPDATE OR DELETE ON research_queries
  FOR EACH ROW EXECUTE FUNCTION audit_research_queries();

CREATE TRIGGER trg_audit_research_library
  AFTER INSERT OR UPDATE OR DELETE ON research_library
  FOR EACH ROW EXECUTE FUNCTION audit_research_queries();
