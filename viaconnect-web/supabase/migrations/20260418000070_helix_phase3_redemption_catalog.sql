-- Prompt #92 Phase 3: Helix redemption catalog + atomic redeem RPC.
-- Interpretation B locked: supplement_discount redemptions apply to the
-- post-discount price, capped at 15 percent of that reduced price.

CREATE TABLE IF NOT EXISTS public.helix_redemption_catalog (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  redemption_type TEXT NOT NULL CHECK (redemption_type IN (
    'supplement_discount','membership_credit','exclusive_access',
    'family_genex360_discount','merchandise','early_feature_access'
  )),
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  discount_percent INTEGER CHECK (discount_percent IS NULL OR (discount_percent BETWEEN 0 AND 100)),
  credit_dollars_cents INTEGER,
  stock_limit INTEGER,
  stock_remaining INTEGER,
  redemption_limit_per_user INTEGER,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.helix_redemption_catalog ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='helix_redemption_catalog' AND policyname='redemption_catalog_read_all') THEN
    CREATE POLICY "redemption_catalog_read_all" ON public.helix_redemption_catalog FOR SELECT TO authenticated USING (is_active = true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_helix_redemption_catalog_type ON public.helix_redemption_catalog(redemption_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_helix_redemption_catalog_sort ON public.helix_redemption_catalog(sort_order) WHERE is_active = true;

-- Seed: supplement discounts 5/10/15%, membership credits $5/$10/$25,
-- family GeneX360 +10%, Q1 early access (limited).
INSERT INTO public.helix_redemption_catalog (id, display_name, description, redemption_type, points_cost, discount_percent, sort_order) VALUES
  ('supp_5pct','5% off next supplement order','Apply 5 percent discount to your next supplement purchase','supplement_discount',500,5,1),
  ('supp_10pct','10% off next supplement order','Apply 10 percent discount to your next supplement purchase','supplement_discount',1000,10,2),
  ('supp_15pct','15% off next supplement order','Apply the maximum 15 percent discount to your next supplement purchase','supplement_discount',1500,15,3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.helix_redemption_catalog (id, display_name, description, redemption_type, points_cost, credit_dollars_cents, sort_order) VALUES
  ('membership_5','$5 membership credit','Apply $5 credit toward your next membership charge','membership_credit',600,500,10),
  ('membership_10','$10 membership credit','Apply $10 credit toward your next membership charge','membership_credit',1100,1000,11),
  ('membership_25','$25 membership credit','Apply $25 credit toward your next membership charge','membership_credit',2500,2500,12)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.helix_redemption_catalog (id, display_name, description, redemption_type, points_cost, discount_percent, sort_order) VALUES
  ('family_genex_10pct','Family GeneX360 +10% off','Stack additional 10 percent off family member GeneX360 panel (Platinum+ Family only)','family_genex360_discount',2000,10,20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.helix_redemption_catalog (id, display_name, description, redemption_type, points_cost, stock_limit, stock_remaining, sort_order) VALUES
  ('early_feature_q1','Q1 new feature early access','Early access to Q1 2027 feature drops before public launch','early_feature_access',5000,100,100,30)
ON CONFLICT (id) DO NOTHING;

-- Atomic catalog-item redemption. Validates balance + stock + per-user limit,
-- deducts balance, decrements stock, writes redemption + transaction rows.
CREATE OR REPLACE FUNCTION public.helix_redeem_catalog_item(
  p_user_id UUID,
  p_catalog_item_id TEXT,
  p_application_context JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_item public.helix_redemption_catalog;
  v_redemption_id UUID;
  v_redemption_count INTEGER;
  v_balance_after INTEGER;
BEGIN
  SELECT * INTO v_item FROM public.helix_redemption_catalog WHERE id = p_catalog_item_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Redemption item not available'; END IF;
  IF v_item.valid_from IS NOT NULL AND v_item.valid_from > NOW() THEN RAISE EXCEPTION 'Redemption not yet available'; END IF;
  IF v_item.valid_until IS NOT NULL AND v_item.valid_until < NOW() THEN RAISE EXCEPTION 'Redemption expired'; END IF;
  IF v_item.stock_limit IS NOT NULL AND (v_item.stock_remaining IS NULL OR v_item.stock_remaining <= 0) THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;
  IF v_item.redemption_limit_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_redemption_count FROM public.helix_redemptions
      WHERE user_id = p_user_id AND catalog_item_id = p_catalog_item_id;
    IF v_redemption_count >= v_item.redemption_limit_per_user THEN
      RAISE EXCEPTION 'Redemption limit reached for this item';
    END IF;
  END IF;
  IF v_item.redemption_type = 'supplement_discount' AND COALESCE(v_item.discount_percent, 0) > 15 THEN
    RAISE EXCEPTION 'Supplement discount redemption exceeds 15 percent cap';
  END IF;
  UPDATE public.helix_balances SET current_balance = current_balance - v_item.points_cost,
      lifetime_redeemed = lifetime_redeemed + v_item.points_cost, updated_at = NOW()
    WHERE user_id = p_user_id AND current_balance >= v_item.points_cost
    RETURNING current_balance INTO v_balance_after;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient Helix balance'; END IF;
  INSERT INTO public.helix_redemptions (user_id, reward_type, reward_description, tokens_spent, status,
      catalog_item_id, application_context, created_at)
    VALUES (p_user_id, v_item.redemption_type, v_item.display_name, v_item.points_cost, 'active',
      v_item.id, p_application_context, NOW())
    RETURNING id INTO v_redemption_id;
  INSERT INTO public.helix_transactions (user_id, type, amount, source, description, balance_after, related_entity_id, created_at)
    VALUES (p_user_id, 'redemption', -v_item.points_cost, 'redemption', v_item.display_name, v_balance_after, v_redemption_id, NOW());
  IF v_item.stock_limit IS NOT NULL AND v_item.stock_remaining IS NOT NULL THEN
    UPDATE public.helix_redemption_catalog SET stock_remaining = stock_remaining - 1
      WHERE id = v_item.id AND stock_remaining > 0;
  END IF;
  RETURN v_redemption_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.helix_redeem_catalog_item(UUID, TEXT, JSONB) TO authenticated, service_role;
