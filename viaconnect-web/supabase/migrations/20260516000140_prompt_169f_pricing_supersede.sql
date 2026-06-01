-- =============================================================
-- Prompt #169f: Four-tier Via Cura membership pricing supersede
-- =============================================================
-- Per Farmceutica Wellness Ltd (Gary's decision 2026-05-31), the
-- prices defined in 169f sections 2 and 7 SUPERSEDE the prices
-- seeded by 20260418000010_consumer_pricing_reference.sql. That
-- migration is append-only and immutable; this migration carries
-- the new values forward as plain, re-runnable UPDATE statements
-- keyed by id, so applying it more than once is idempotent.
--
-- Annual prices use the 169f 15 percent annual discount on the
-- monthly price times 12, rounded to the nearest cent:
--   gold:            11.88 * 12 * 0.85 = 121.176 -> $121.18 -> 12118 cents
--   platinum:        28.88 * 12 * 0.85 = 294.576 -> $294.58 -> 29458 cents
--   platinum_family: 48.88 * 12 * 0.85 = 498.576 -> $498.58 -> 49858 cents
--
-- annual_savings_cents is a GENERATED column (monthly * 12 minus
-- annual) and is therefore NOT set here; Postgres recomputes it.
--
-- Tier-by-tier change summary:
--   gold:            monthly 888  -> 1188 ; annual 8800  -> 12118
--   platinum:        monthly 2888 unchanged ; annual 28800 -> 29458
--   platinum_family: monthly 4888 unchanged (base) ; annual 48888 -> 49858
--
-- Family add-on reconciliation (169f section 5.1, "$11.88 per
-- additional child" beyond the base members):
--   additional_children_chunk_price_cents 888 -> 1188 (per child)
--   children_chunk_size                   2   -> 1    (per-child billing)
-- NOTE: changing children_chunk_size from 2 to 1 changes billing
-- semantics. Previously children were billed in 2-child chunks at
-- $8.88 per chunk; now each additional child is billed individually
-- at $11.88. 169f does NOT specify an additional-ADULT price change,
-- so additional_adult_price_cents is intentionally left as-is.
-- =============================================================

UPDATE public.membership_tiers
SET monthly_price_cents = 1188,
    annual_price_cents  = 12118,
    updated_at          = NOW()
WHERE id = 'gold';

UPDATE public.membership_tiers
SET monthly_price_cents = 2888,
    annual_price_cents  = 29458,
    updated_at          = NOW()
WHERE id = 'platinum';

UPDATE public.membership_tiers
SET monthly_price_cents                   = 4888,
    annual_price_cents                    = 49858,
    additional_children_chunk_price_cents = 1188,
    children_chunk_size                   = 1,
    updated_at                            = NOW()
WHERE id = 'platinum_family';
