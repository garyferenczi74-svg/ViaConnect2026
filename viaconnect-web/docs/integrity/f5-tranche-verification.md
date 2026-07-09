# F5 Tranche Verification: Prompt 210f White Label Additive Migration

Date: 2026-07-08 (UTC apply timestamp recorded by the migration runner)
Project: ViaConnect2026 (nnhkcufyqjojdbvdrpky), production
Authority: Gary Decision 3 (2026-07-07); fable review READY-WITH-CONDITIONS; condition 1 (view lockdown) satisfied by commit 22691ae0 before apply; condition 2 (post-apply view grant verification) satisfied below at check (c).

## Migration applied

- File: supabase/migrations/20260708090000_prompt_210f_white_label_additive.sql
- apply_migration name: 20260708090000_prompt_210f_white_label_additive
- Result: success on first attempt (no timeout, no retry)
- Recorded in supabase_migrations.schema_migrations as version 20260709012307, name 20260708090000_prompt_210f_white_label_additive (the MCP runner assigns the apply-time version; the file timestamp rides in the name, same pattern as the F1 record)

## Post-apply verification results (SELECT-only)

### a. Table count: PASS (15 of 15)

All 15 tables created by the migration are present in pg_tables (schema public):
white_label_enrollments, white_label_catalog_config, practitioner_brand_configurations, white_label_label_designs, white_label_compliance_reviews, white_label_production_orders, white_label_production_order_items, white_label_inventory_lots, white_label_sku_mappings, white_label_recalls, white_label_compliance_reviewer_roles, white_label_reviewer_assignments, white_label_dispensary_settings, white_label_discount_tiers, white_label_parameters.

### b. RLS: PASS

All 15 tables have rowsecurity = true and at least one policy. No zero-policy table. Policy counts: white_label_dispensary_settings 3 (self_rw, admin_all, tightened wl_disp_published_read); white_label_compliance_reviewer_roles 1 (admin_all, by design); the remaining 13 tables 2 each.

### c. Views and grants (review condition 2): PASS

Full grant list from information_schema.role_table_grants for wl_pending_reviews_with_sla and white_label_economics (table_schema public):

| view | grantee | privileges |
|---|---|---|
| white_label_economics | authenticated | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER |
| white_label_economics | postgres | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER |
| white_label_economics | service_role | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER |
| wl_pending_reviews_with_sla | authenticated | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER |
| wl_pending_reviews_with_sla | postgres | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER |
| wl_pending_reviews_with_sla | service_role | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER |

anon holds NOTHING on either view (zero rows for grantee anon). pg_class.reloptions confirms security_invoker=on for both views, so base-table RLS governs every read through them. Views are not updatable in practice (aggregates and joins); the non-SELECT grants to authenticated are inert Postgres defaults.

### d. Storage: PASS

storage.buckets contains both ids: white-label-brand-assets, white-label-proofs (2 of 2, both private). storage.objects policies mentioning those bucket ids: 6 (wl_brand_assets_self_read, wl_brand_assets_self_write, wl_brand_assets_self_delete, wl_proofs_self_read, wl_proofs_self_write, wl_storage_admin_all). Count method note: the two INSERT policies carry the bucket condition in with_check rather than qual, so the sweep matched on qual OR with_check; a qual-only sweep shows 4.

### e. Seeds (certification-independent): PASS

- white_label_discount_tiers: 3 rows (tier_100_499, tier_500_999, tier_1000_plus)
- white_label_parameters: 1 row (default)
- launch_phases: 1 row (white_label_products_2028)
- pricing_domains: 7 rows (wl_discount_tier_100_499, wl_discount_tier_500_999, wl_discount_tier_1000_plus, wl_minimum_order_value, wl_expedited_surcharge, wl_storage_fee_per_unit_day, wl_free_storage_days)
- Informational: white_label_catalog_config seeded 1 row, matching the single active category = supplement row in live product_catalog; the seed is data-dependent by design and re-runs are guarded.

### f. Sequence: PASS

public.white_label_order_number_seq exists (pg_class relkind = S, count 1).

### g. Deferred RPC: PASS

pg_proc count for sum_practitioner_wholesale_volume = 0. The function remains deferred (live shop_orders lacks wholesale_total_cents, placed_by_practitioner_id, order_type); eligibility Path 3 keeps fail-open behavior until the shop_orders extension lands.

### h. Anon-exposure sweep: EXPLAINED ANOMALY (98, expected 0)

Query (ORs parenthesized correctly): count of role_table_grants rows where table_schema = public, grantee = anon, and (table_name like white_label% or table_name like wl_%). Result: 98 = 14 base tables x 7 privileges. The two views contribute zero (anon fully revoked, see check c). practitioner_brand_configurations sits outside both LIKE patterns and carries the same 7.

Explanation: these are the project-wide Supabase default privileges applied to every table in the public schema at creation, not grants added by this migration. Verified identical on the pre-existing F1 table practitioner_patients (same 7 privileges to anon). Row access for anon is blocked because RLS is enabled on all 15 tables and every policy is TO authenticated. The review's binding condition targeted the two views, which pass with zero anon grants. Tightening the schema-wide anon default posture is a project-level decision beyond this tranche; flagged for the F6 checklist as an observation, not a launch blocker.

## F6 standing gates (launch checklist, not blocked by this apply)

1. Stripe walk: exercise the production-order deposit and final-payment intents end to end (stripe_deposit_payment_intent_id, stripe_final_payment_intent_id, refund idempotency via stripe_refund_id) before enabling real orders.
2. Ops readiness: reviewer role assignments populated (compliance_officer, medical_director), SLA inbox wired to wl_pending_reviews_with_sla, brand-asset upload UX confirmed against the two new buckets (no code path references them yet).
3. Content clearance: entity string RESOLVED as LLC per Gary 2026-07-08; the manufacturer_line default (Manufactured by FarmCeutica Wellness LLC, Buffalo NY) stands as carried. Remaining content clearance covers label template copy and claims review flow.

## Rollback reference

Reversal of this tranche, should it ever be ordered, removes (dependency order):

1. Views (2): wl_pending_reviews_with_sla, white_label_economics
2. Tables (15, children before parents): white_label_dispensary_settings, white_label_sku_mappings, white_label_inventory_lots, white_label_production_order_items, white_label_production_orders, white_label_reviewer_assignments, white_label_compliance_reviews, white_label_compliance_reviewer_roles, white_label_label_designs, practitioner_brand_configurations, white_label_catalog_config, white_label_recalls, white_label_enrollments, white_label_discount_tiers, white_label_parameters (table drops remove their RLS policies, indexes, and triggers)
3. Sequence (1): white_label_order_number_seq
4. Buckets (2) plus their storage.objects policies (6): white-label-brand-assets, white-label-proofs; policies wl_brand_assets_self_read, wl_brand_assets_self_write, wl_brand_assets_self_delete, wl_proofs_self_read, wl_proofs_self_write, wl_storage_admin_all
5. Also created by this migration and covered by a full reversal: functions block_compliance_review_mutation, clone_label_design_revision, next_white_label_order_number; seed rows in launch_phases (white_label_products_2028) and pricing_domains (the 7 wl_ ids)

Rollback must ship as a NEW migration file (existing migrations are append-only per standing protections); this document is reference only and contains no executable statements.
