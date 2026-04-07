-- ============================================================
-- Prompt #52: Cart, Orders & Checkout
-- ============================================================

-- 1. Shopping Cart (server-synced, one row per product+delivery_form per user)
CREATE TABLE IF NOT EXISTS shop_cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'supplement',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 99),
  delivery_form TEXT,
  unit_price_cents INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-(user, slug, delivery_form) uniqueness, with NULL delivery_form
-- handled via a coalesced expression so two NULL rows still collide.
CREATE UNIQUE INDEX IF NOT EXISTS shop_cart_items_user_slug_form_uniq
  ON shop_cart_items (user_id, product_slug, COALESCE(delivery_form, ''));

-- 2. Orders
CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),

  -- Shipping
  shipping_first_name TEXT,
  shipping_last_name TEXT,
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  shipping_country TEXT DEFAULT 'US',
  shipping_phone TEXT,
  shipping_email TEXT,

  -- Totals (cents)
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,

  discount_code TEXT,
  notes TEXT,
  portal_type TEXT NOT NULL DEFAULT 'consumer'
    CHECK (portal_type IN ('consumer','practitioner','naturopath')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Order Line Items (snapshot at purchase time)
CREATE TABLE IF NOT EXISTS shop_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  delivery_form TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  line_total_cents INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RLS
ALTER TABLE shop_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own cart" ON shop_cart_items;
CREATE POLICY "Users manage own cart" ON shop_cart_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own orders" ON shop_orders;
CREATE POLICY "Users view own orders" ON shop_orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own orders" ON shop_orders;
CREATE POLICY "Users create own orders" ON shop_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own order items" ON shop_order_items;
CREATE POLICY "Users view own order items" ON shop_order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM shop_orders WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users create own order items" ON shop_order_items;
CREATE POLICY "Users create own order items" ON shop_order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM shop_orders WHERE user_id = auth.uid())
  );

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_shop_cart_user ON shop_cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_number ON shop_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON shop_order_items(order_id);

-- 6. updated_at trigger for cart + orders
CREATE OR REPLACE FUNCTION shop_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_cart_items_updated_at ON shop_cart_items;
CREATE TRIGGER shop_cart_items_updated_at
  BEFORE UPDATE ON shop_cart_items
  FOR EACH ROW EXECUTE FUNCTION shop_set_updated_at();

DROP TRIGGER IF EXISTS shop_orders_updated_at ON shop_orders;
CREATE TRIGGER shop_orders_updated_at
  BEFORE UPDATE ON shop_orders
  FOR EACH ROW EXECUTE FUNCTION shop_set_updated_at();

-- 7. Order number generator
CREATE OR REPLACE FUNCTION generate_shop_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'FC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
