-- =============================================================================
-- Prompt #91, Phase 1.6: Practitioner waitlist email queue
-- =============================================================================
-- Append-only. Drives the 6-step waitlist nurture sequence using SUPABASE
-- built-in SMTP only. No third-party transports are permitted; the project
-- standing rule mandates Supabase email for everything. The
-- practitioner-waitlist-mailer Edge Function consumes this queue on a
-- pg_cron tick; pg_cron schedule will be added in a later phase once Phase 1
-- lands.
--
-- Each row represents one outbound email. Inserted by the API route on
-- waitlist signup (step 1) and by a follower function for steps 2-6.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.practitioner_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id UUID NOT NULL REFERENCES public.practitioner_waitlist(id) ON DELETE CASCADE,
  step INTEGER NOT NULL CHECK (step BETWEEN 1 AND 6),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  -- Transport tag locks the queue to Supabase SMTP. Any future provider
  -- added here is a policy decision, not an accident.
  transport TEXT NOT NULL DEFAULT 'supabase_smtp' CHECK (transport IN ('supabase_smtp')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (waitlist_id, step)
);

COMMENT ON TABLE public.practitioner_email_queue IS
  'Practitioner waitlist email nurture queue. Supabase SMTP only; no third-party transports permitted.';

CREATE INDEX IF NOT EXISTS idx_pwlq_due
  ON public.practitioner_email_queue(scheduled_for)
  WHERE status = 'pending';

ALTER TABLE public.practitioner_email_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only access. Edge Function uses service role to enqueue and consume.
DROP POLICY IF EXISTS "pwlq_admin_all" ON public.practitioner_email_queue;
CREATE POLICY "pwlq_admin_all"
  ON public.practitioner_email_queue FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Helper: enqueue the welcome email (step 1) on signup. Called by API route.
CREATE OR REPLACE FUNCTION public.enqueue_practitioner_welcome_email(p_waitlist_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.practitioner_email_queue (waitlist_id, step, scheduled_for)
  VALUES (p_waitlist_id, 1, NOW())
  ON CONFLICT (waitlist_id, step) DO NOTHING
  RETURNING id INTO v_id;

  UPDATE public.practitioner_waitlist
     SET email_sequence_step = GREATEST(email_sequence_step, 1),
         updated_at = NOW()
   WHERE id = p_waitlist_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_practitioner_welcome_email(UUID) FROM public;
REVOKE ALL ON FUNCTION public.enqueue_practitioner_welcome_email(UUID) FROM anon;
-- Server-only. Anonymous origins must not be able to enqueue arbitrary
-- welcome emails for discovered waitlist UUIDs. The public API route does
-- NOT call this RPC; instead, the AFTER INSERT trigger below enqueues
-- step 1 automatically as a side-effect of row creation.
GRANT EXECUTE ON FUNCTION public.enqueue_practitioner_welcome_email(UUID) TO service_role;

-- Trigger: enqueue welcome email automatically on waitlist row creation.
-- Runs as table owner (no RLS conflict) and is the only path to step 1.
CREATE OR REPLACE FUNCTION public.tg_practitioner_waitlist_enqueue_welcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.enqueue_practitioner_welcome_email(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioner_waitlist_enqueue_welcome
  ON public.practitioner_waitlist;
CREATE TRIGGER practitioner_waitlist_enqueue_welcome
  AFTER INSERT ON public.practitioner_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.tg_practitioner_waitlist_enqueue_welcome();
