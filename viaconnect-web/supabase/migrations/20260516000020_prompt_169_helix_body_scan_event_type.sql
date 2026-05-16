-- =============================================================
-- Prompt #169: Helix transaction type extension
-- Adds 'body_scan_completed' to helix_transactions.type CHECK enumeration
-- Updates fn_emit_helix_body_scan_event to use the new type
-- Append only; supersedes 'earn_supplement' workaround in 20260516000010
-- =============================================================

-- Step 1: Drop the existing type CHECK constraint.
-- Live constraint name confirmed via pg_constraint query (2026-05-16):
--   helix_transactions_type_check
--   current values: 'earn', 'redeem', 'bonus', 'referral', 'adjustment'
ALTER TABLE helix_transactions
  DROP CONSTRAINT IF EXISTS helix_transactions_type_check;

-- Step 2: Re-add the CHECK constraint with 'body_scan_completed' appended.
-- All five existing values preserved verbatim from the live pg_constraint result.
ALTER TABLE helix_transactions
  ADD CONSTRAINT helix_transactions_type_check
  CHECK (type IN (
    'earn',
    'redeem',
    'bonus',
    'referral',
    'adjustment',
    'body_scan_completed'
  ));

-- Step 3: Replace fn_emit_helix_body_scan_event so the INSERT uses
-- type='body_scan_completed' instead of the 'earn_supplement' workaround.
-- All other payload fields (description, metadata, source, related_entity_id,
-- amount=0) are preserved identically from 20260516000010.
-- Trigger trg_emit_helix_body_scan_event does not need to be dropped or
-- recreated; CREATE OR REPLACE updates the underlying function in place.
CREATE OR REPLACE FUNCTION fn_emit_helix_body_scan_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.helix_transactions (
    user_id,
    type,
    amount,
    description,
    metadata,
    source,
    related_entity_id,
    created_at
  ) VALUES (
    NEW.user_id,
    'body_scan_completed',
    0,
    'body_scan_completed',
    jsonb_build_object(
      'event_type',         'body_scan_completed',
      'session_id',         NEW.id,
      'tier',               COALESCE(
                              (SELECT tier FROM body_scan_tier_log WHERE session_id = NEW.id),
                              1
                            ),
      'scan_quality_score', NEW.scan_quality_score
    ),
    'body_scan',
    NEW.id,
    now()
  );
  RETURN NEW;
END;
$$;
