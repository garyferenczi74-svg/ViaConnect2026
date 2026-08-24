-- Prompt 216d: Hannah daily note as compilation output (per user per day).
-- Append-only. Service role writes; consumers read own rows.

CREATE TABLE IF NOT EXISTS public.hannah_daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_date date NOT NULL,
  run_id text,
  note_text text NOT NULL,
  note_kind text NOT NULL DEFAULT 'compiled'
    CHECK (note_kind IN ('compiled', 'welcome')),
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  supplier_agents jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Snapshot of the same-compile status read used for distinctness at write time.
  read_today_snapshot text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  compile_ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One note row per user per day (idempotent recompile overwrites).
CREATE UNIQUE INDEX IF NOT EXISTS uq_hannah_daily_notes_user_day
  ON public.hannah_daily_notes (user_id, run_date);

CREATE INDEX IF NOT EXISTS idx_hannah_daily_notes_user_generated
  ON public.hannah_daily_notes (user_id, generated_at DESC);

ALTER TABLE public.hannah_daily_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own hannah daily notes" ON public.hannah_daily_notes;
CREATE POLICY "Users read own hannah daily notes"
  ON public.hannah_daily_notes
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.hannah_daily_notes IS
  'Prompt 216d Hannah personal note from daily compile; provenance via run_id and source_refs.';

-- Consumers need own compile_runs for staleness (note.generated_at >= last compile).
DROP POLICY IF EXISTS "Users read own hannah compile runs" ON public.hannah_compile_runs;
CREATE POLICY "Users read own hannah compile runs"
  ON public.hannah_compile_runs
  FOR SELECT USING (auth.uid() = user_id);
