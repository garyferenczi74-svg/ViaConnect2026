-- Prompt #141 v3 Phase F6b.2: helix_transactions related_entity_id index.
--
-- Background: F6b.2 adds reverseHelixForOrder, which on every Stripe
-- charge.refunded webhook hit runs two queries against helix_transactions
-- filtered by related_entity_id:
--   (1) idempotency check  (.eq related_entity_id, .eq source='shop_refund')
--   (2) original txn lookup (.eq related_entity_id, .in source [...])
--
-- helix_transactions accumulates the fastest of any table in the system
-- (every shop earn + every shop burn + every adherence checkin writes a
-- row). At ~100k+ rows the existing unindexed seqscan on related_entity_id
-- exceeds the 3000ms withTimeout envelope on the reversal helper, which
-- under Stripe's hours-long retry policy compounds Postgres load.
--
-- The partial WHERE clause cuts index size since most legacy rows
-- (challenge / streak / referral earns) have null related_entity_id.
-- The composite (related_entity_id, source) is overkill at sub-million
-- rows: PG plans the lookup with the partial single-column index plus a
-- heap filter on source.
--
-- IF NOT EXISTS guard makes the migration replay-safe in case the index
-- was already created out-of-band.

CREATE INDEX IF NOT EXISTS idx_helix_transactions_related_entity_id
    ON public.helix_transactions(related_entity_id)
    WHERE related_entity_id IS NOT NULL;

COMMENT ON INDEX public.idx_helix_transactions_related_entity_id IS
    'Supports shop refund reversal lookups; source=shop_refund is reserved for the webhook-driven helix-reversal helper (lib/shop/helix-reversal.ts).';
