-- ============================================================
-- Prompt #55: Order Tracking & Account
-- ============================================================
-- Adds the schema needed for the /account hub:
--   - shop_order_status_history: per-order status timeline
--   - user_addresses: saved shipping addresses
--   - user_notification_preferences: per-channel toggles
--   - shop_orders extensions: tracking + cancellation columns
--   - trigger to seed an initial "Order Placed" status row on insert
-- All idempotent. Append-only per project rules.

-- 1. Order status history (tracking timeline)
CREATE TABLE IF NOT EXISTS shop_order_status_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  -- 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery'
  -- | 'delivered' | 'cancelled' | 'refunded'
  title           TEXT NOT NULL,
  description     TEXT,
  tracking_number TEXT,
  tracking_url    TEXT,
  carrier         TEXT,
  -- 'usps' | 'ups' | 'fedex' | 'dhl' | 'other'
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Saved addresses
CREATE TABLE IF NOT EXISTS user_addresses (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label          TEXT NOT NULL DEFAULT 'Home',
  is_default     BOOLEAN NOT NULL DEFAULT false,
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  address_line1  TEXT NOT NULL,
  address_line2  TEXT,
  city           TEXT NOT NULL,
  state          TEXT NOT NULL,
  zip            TEXT NOT NULL,
  country        TEXT NOT NULL DEFAULT 'US',
  phone          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Notification preferences (one row per user)
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id                              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_order_updates             BOOLEAN NOT NULL DEFAULT true,
  email_shipping_updates          BOOLEAN NOT NULL DEFAULT true,
  email_delivery_confirmation     BOOLEAN NOT NULL DEFAULT true,
  email_protocol_recommendations  BOOLEAN NOT NULL DEFAULT true,
  email_promotions                BOOLEAN NOT NULL DEFAULT false,
  email_newsletter                BOOLEAN NOT NULL DEFAULT false,
  push_order_updates              BOOLEAN NOT NULL DEFAULT true,
  push_protocol_changes           BOOLEAN NOT NULL DEFAULT true,
  push_bio_score_milestones       BOOLEAN NOT NULL DEFAULT true,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tracking + cancellation columns on shop_orders (idempotent)
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS tracking_number          TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url             TEXT,
  ADD COLUMN IF NOT EXISTS carrier                  TEXT,
  ADD COLUMN IF NOT EXISTS estimated_delivery_date  DATE,
  ADD COLUMN IF NOT EXISTS delivered_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason      TEXT;

-- 5. RLS
ALTER TABLE shop_order_status_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own order history" ON shop_order_status_history;
CREATE POLICY "Users view own order history" ON shop_order_status_history
  FOR SELECT USING (
    order_id IN (SELECT id FROM shop_orders WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users insert own order history" ON shop_order_status_history;
CREATE POLICY "Users insert own order history" ON shop_order_status_history
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM shop_orders WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users manage own addresses" ON user_addresses;
CREATE POLICY "Users manage own addresses" ON user_addresses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own notification prefs" ON user_notification_preferences;
CREATE POLICY "Users manage own notification prefs" ON user_notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order   ON shop_order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created ON shop_order_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user          ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status                ON shop_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created               ON shop_orders(created_at DESC);

-- 7. Auto-insert initial status on order creation
CREATE OR REPLACE FUNCTION insert_initial_order_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO shop_order_status_history (order_id, status, title, description)
  VALUES (
    NEW.id,
    'pending',
    'Order Placed',
    'Your order has been received and is awaiting confirmation.'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_initial_status ON shop_orders;
CREATE TRIGGER trg_order_initial_status
  AFTER INSERT ON shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION insert_initial_order_status();

-- 8. Backfill: any pre-existing orders without a status row get one now
INSERT INTO shop_order_status_history (order_id, status, title, description, created_at)
SELECT o.id, 'pending', 'Order Placed', 'Your order has been received.', o.created_at
  FROM shop_orders o
  LEFT JOIN shop_order_status_history h ON h.order_id = o.id
 WHERE h.id IS NULL;
