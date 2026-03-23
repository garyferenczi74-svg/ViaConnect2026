-- Custom OTP table for email verification via SendGrid HTTP API.
-- Bypasses Supabase's built-in SMTP relay which requires separate sender verification.

CREATE TABLE IF NOT EXISTS public.email_otps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  otp_hash text NOT NULL,
  type text NOT NULL CHECK (type IN ('signup', 'recovery')),
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, type)
);

-- RLS: only service_role (Edge Functions) can access this table
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- No policies = no client access. Only service_role bypasses RLS.
COMMENT ON TABLE public.email_otps IS 'Server-only OTP storage for email verification via SendGrid';

-- Auto-cleanup expired OTPs (run via pg_cron or periodic edge function)
CREATE INDEX idx_email_otps_expires_at ON public.email_otps (expires_at);
