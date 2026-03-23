-- Verification codes for email OTP (bypasses Supabase built-in email)
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_verification_codes_email ON verification_codes (email, used, expires_at);

-- Auto-cleanup expired codes (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM verification_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_verification_codes
  AFTER INSERT ON verification_codes
  EXECUTE FUNCTION cleanup_expired_verification_codes();

-- RLS: only service_role can access (Edge Functions use admin client)
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
