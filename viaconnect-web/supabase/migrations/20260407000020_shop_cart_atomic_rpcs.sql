-- ============================================================
-- Prompt #52 follow-up: atomic cart + order RPCs
-- ============================================================

-- 1. shop_cart_add_item — atomic upsert that increments quantity
-- on conflict instead of overwriting it. Eliminates the race window
-- in CartContext.addItem() where two parallel adds could clobber.
CREATE OR REPLACE FUNCTION shop_cart_add_item(
  p_product_slug    TEXT,
  p_product_name    TEXT,
  p_product_type    TEXT,
  p_quantity        INTEGER,
  p_delivery_form   TEXT,
  p_unit_price_cents INTEGER,
  p_metadata        JSONB
)
RETURNS shop_cart_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_qty INTEGER := GREATEST(1, LEAST(99, COALESCE(p_quantity, 1)));
  v_row shop_cart_items;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'shop_cart_add_item: not authenticated';
  END IF;

  -- Atomic insert-or-increment via the COALESCE'd unique index.
  INSERT INTO shop_cart_items (
    user_id, product_slug, product_name, product_type,
    quantity, delivery_form, unit_price_cents, metadata
  ) VALUES (
    v_user_id, p_product_slug, p_product_name, COALESCE(p_product_type, 'supplement'),
    v_qty, p_delivery_form, p_unit_price_cents, COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (user_id, product_slug, COALESCE(delivery_form, ''))
  DO UPDATE SET
    quantity = LEAST(99, shop_cart_items.quantity + EXCLUDED.quantity),
    -- Refresh the snapshot fields in case the catalog has updated price/name
    product_name = EXCLUDED.product_name,
    product_type = EXCLUDED.product_type,
    unit_price_cents = EXCLUDED.unit_price_cents,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION shop_cart_add_item(TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, JSONB) TO authenticated;

-- 2. shop_create_order_with_items — transactional order creation.
-- Creates the order + all line items in a single SQL transaction so
-- the checkout flow can never end up with an order that has zero items.
CREATE OR REPLACE FUNCTION shop_create_order_with_items(
  p_shipping       JSONB,
  p_totals         JSONB,
  p_items          JSONB,
  p_discount_code  TEXT DEFAULT NULL,
  p_portal_type    TEXT DEFAULT 'consumer'
)
RETURNS shop_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order shop_orders;
  v_item JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'shop_create_order_with_items: not authenticated';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'shop_create_order_with_items: items array is empty';
  END IF;

  INSERT INTO shop_orders (
    user_id, order_number, status,
    shipping_first_name, shipping_last_name,
    shipping_address_line1, shipping_address_line2,
    shipping_city, shipping_state, shipping_zip, shipping_country,
    shipping_phone, shipping_email,
    subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents,
    discount_code, portal_type
  ) VALUES (
    v_user_id, generate_shop_order_number(), 'pending',
    p_shipping->>'first_name', p_shipping->>'last_name',
    p_shipping->>'address1', p_shipping->>'address2',
    p_shipping->>'city', p_shipping->>'state', p_shipping->>'zip',
    COALESCE(p_shipping->>'country', 'US'),
    p_shipping->>'phone', p_shipping->>'email',
    COALESCE((p_totals->>'subtotal_cents')::INT, 0),
    COALESCE((p_totals->>'discount_cents')::INT, 0),
    COALESCE((p_totals->>'shipping_cents')::INT, 0),
    COALESCE((p_totals->>'tax_cents')::INT, 0),
    COALESCE((p_totals->>'total_cents')::INT, 0),
    p_discount_code,
    COALESCE(p_portal_type, 'consumer')
  )
  RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO shop_order_items (
      order_id, product_slug, product_name, product_type,
      delivery_form, quantity, unit_price_cents, line_total_cents, metadata
    ) VALUES (
      v_order.id,
      v_item->>'product_slug',
      v_item->>'product_name',
      v_item->>'product_type',
      v_item->>'delivery_form',
      COALESCE((v_item->>'quantity')::INT, 1),
      COALESCE((v_item->>'unit_price_cents')::INT, 0),
      COALESCE((v_item->>'unit_price_cents')::INT, 0) * COALESCE((v_item->>'quantity')::INT, 1),
      COALESCE(v_item->'metadata', '{}'::jsonb)
    );
  END LOOP;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION shop_create_order_with_items(JSONB, JSONB, JSONB, TEXT, TEXT) TO authenticated;
