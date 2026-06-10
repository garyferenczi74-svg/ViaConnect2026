-- Prompt 185a slice 7: protocol_adherence_log (mark as taken).
--
-- Discovery 2026-06-09: the original table migration (20260407000100
-- dashboard_adherence) was never applied to the live DB (drift: absent from the
-- live migration history; the table did not exist), so the prior mark-as-taken
-- silently failed open. Recreated here append-only with the same shape + owner
-- RLS so the Daily Schedule take control persists. CREATE IF NOT EXISTS keeps
-- this safe if the original is ever applied. No emojis. No em or en dashes.

CREATE TABLE IF NOT EXISTS public.protocol_adherence_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug    TEXT NOT NULL,
  scheduled_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  time_of_day     TEXT NOT NULL CHECK (time_of_day IN ('morning','midday','afternoon','evening','bedtime','asNeeded')),
  completed       BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  points_awarded  INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug, scheduled_date, time_of_day)
);

CREATE INDEX IF NOT EXISTS idx_protocol_adherence_user_date
  ON public.protocol_adherence_log (user_id, scheduled_date);

ALTER TABLE public.protocol_adherence_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own adherence" ON public.protocol_adherence_log;
CREATE POLICY "Users manage own adherence"
  ON public.protocol_adherence_log
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
