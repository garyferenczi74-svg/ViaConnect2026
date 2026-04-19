-- =============================================================================
-- Prompt #91, Phase 3.3: Extend shop_orders for practitioner channels
-- =============================================================================
-- Append-only ALTER. Adds the columns the wholesale + drop-ship engine
-- writes when a practitioner places an order. Pre-existing consumer order
-- flow continues to insert without these fields (defaults preserve current
-- behavior).
--
-- order_type values:
--   consumer            existing consumer self-checkout (default)
--   practitioner_stock  practitioner stocking their own inventory
--   drop_ship           practitioner-placed, ships direct to a patient
--   wholesale_bulk      large pre-paid replenishment order
-- =============================================================================

ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'consumer'
    CHECK (order_type IN ('consumer', 'practitioner_stock', 'drop_ship', 'wholesale_bulk')),
  ADD COLUMN IF NOT EXISTS placed_by_practitioner_id UUID REFERENCES public.practitioners(id),
  ADD COLUMN IF NOT EXISTS drop_ship_patient_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS practitioner_note TEXT,
  ADD COLUMN IF NOT EXISTS wholesale_total_cents INTEGER CHECK (
    wholesale_total_cents IS NULL OR wholesale_total_cents >= 0
  ),
  ADD COLUMN IF NOT EXISTS meets_moq BOOLEAN;

COMMENT ON COLUMN public.shop_orders.order_type IS
  'Routing label. consumer is the default for backward compatibility; practitioner channels (stock, drop_ship, wholesale_bulk) bypass consumer subscription discount logic.';
COMMENT ON COLUMN public.shop_orders.drop_ship_patient_user_id IS
  'When order_type=drop_ship, the patient (auth.users.id) the order ships to. The practitioner-patient relationship must be active at order time (enforced in application code, not RLS).';

-- Indexes for the practitioner panel and patient order history queries.
CREATE INDEX IF NOT EXISTS idx_shop_orders_placed_by_practitioner
  ON public.shop_orders(placed_by_practitioner_id)
  WHERE placed_by_practitioner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_orders_drop_ship_patient
  ON public.shop_orders(drop_ship_patient_user_id)
  WHERE drop_ship_patient_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_orders_type
  ON public.shop_orders(order_type)
  WHERE order_type <> 'consumer';

-- Additive RLS: practitioners may SELECT and INSERT shop_orders rows where
-- they are the placing practitioner, and SELECT drop-ship orders that
-- ship to one of their active patients. Existing consumer-self policies
-- on shop_orders are unchanged.

DROP POLICY IF EXISTS shop_orders_practitioner_self_read ON public.shop_orders;
CREATE POLICY shop_orders_practitioner_self_read
  ON public.shop_orders FOR SELECT
  TO authenticated
  USING (
    placed_by_practitioner_id IN (
      SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shop_orders_practitioner_insert ON public.shop_orders;
CREATE POLICY shop_orders_practitioner_insert
  ON public.shop_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    placed_by_practitioner_id IN (
      SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

-- The drop-ship target patient may also see orders that shipped to them.
DROP POLICY IF EXISTS shop_orders_drop_ship_patient_read ON public.shop_orders;
CREATE POLICY shop_orders_drop_ship_patient_read
  ON public.shop_orders FOR SELECT
  TO authenticated
  USING (drop_ship_patient_user_id = auth.uid());
