# ViaConnect™ — Performance Advisor: Manual Review Required
Generated: 2026-04-05
Prompt: #38b + #38c

## Summary

| Prompt | Initial | Fixed | Remaining |
|--------|---------|-------|-----------|
| #38b | 3 WARN, 97 INFO | 3 WARN (auth_rls_initplan), 1 INFO (unindexed FK) | 0 WARN, 101 INFO |
| #38c | 0 WARN, 100 INFO | 11 unused indexes dropped, 1 natural resolution | 0 WARN, 88 INFO |
| **Final** | **3 WARN, 100 INFO** | **15 total fixed** | **0 WARN, 88 INFO** |

## Indexes Dropped in #38c (11 total)

### Redundant Indexes (2)
These were fully covered by composite indexes on the same table:

| Dropped Index | Table | Covered By |
|--------------|-------|-----------|
| `idx_interactions_user` (user_id) | medication_interactions | `idx_interactions_severity` (user_id, severity) |
| `idx_verification_codes_email_lookup` (email WHERE NOT NULL) | verification_codes | `idx_verification_codes_email` (email, used, expires_at) |

### Internal Tooling NO-FK Indexes on Empty Tables (9)
Non-FK filtering/sorting indexes on internal agent infrastructure tables with 0 rows and 0 scans. Recreate commands preserved in migration comments.

| Dropped Index | Table |
|--------------|-------|
| `idx_advisor_issues_status` (status, severity) | advisor_issues |
| `idx_advisor_issues_category` (category, status) | advisor_issues |
| `idx_advisor_snapshots_run` (run_id, snapshot_at) | advisor_snapshots |
| `idx_sec_audit_scan` (scan_id) | security_audit_log |
| `idx_sec_audit_severity` (severity) | security_audit_log |
| `idx_sec_audit_status` (status) | security_audit_log |
| `idx_sec_audit_at` (scanned_at DESC) | security_audit_log |
| `idx_sec_pending_status` (status) | security_pending_repairs |
| `idx_sec_repair_success` (success) | security_repair_log |

---

## Remaining Items Requiring Human Decision (88)

### 1. unused_index — 87 Indexes (Pre-Launch, Must Keep)

**Reason:** ViaConnect is a pre-launch platform (launch: June 2026). All 87 remaining indexes have zero scans because there is no production query traffic, NOT because they are unnecessary. Dropping them would degrade performance at launch.

#### FK-Supporting Indexes (47) — DO NOT DROP
These support foreign key constraints. Removing them would cause slow CASCADE deletes and JOIN operations.

| Index | Table |
|-------|-------|
| `idx_advisor_fix_log_issue_id` | advisor_fix_log |
| `idx_advisor_issues_snapshot_id` | advisor_issues |
| `idx_botanical_formula_items_formula` | botanical_formula_items |
| `idx_botanical_formula_items_herb_id` | botanical_formula_items |
| `idx_brand_agent_log_brand` | brand_agent_log |
| `idx_bundle_components_bundle_name` | bundle_components |
| `idx_bundle_components_sku` | bundle_components |
| `idx_caq_assessment_versions_previous_version_id` | caq_assessment_versions |
| `idx_cav_user` | caq_assessment_versions |
| `idx_cogs_delta_reports_sku` | cogs_delta_reports |
| `idx_executive_recommendations_dashboard_id` | executive_recommendations |
| `idx_executive_risks_dashboard_id` | executive_risks |
| `idx_farma_tokens_user_id` | farma_tokens |
| `idx_helix_achievement_unlocks_achievement_id` | helix_achievement_unlocks |
| `idx_helix_challenge_participants_challenge_id` | helix_challenge_participants |
| `idx_helix_leaderboard_challenge_id` | helix_leaderboard |
| `idx_helix_redemptions_user_id` | helix_redemptions |
| `idx_helix_referrals_referrer_id` | helix_referrals |
| `idx_interactions_severity` | medication_interactions |
| `idx_migration_sync_log_advisor_snapshot_id` | migration_sync_log |
| `idx_notifications_user_unread` | notifications |
| `idx_order_items_order_id` | order_items |
| `idx_order_items_product_id` | order_items |
| `idx_pep_patterns_user` | peptide_detected_patterns |
| `idx_pep_recs_protocol` | peptide_stack_recommendations |
| `idx_pep_recs_user_id` | peptide_stack_recommendations |
| `idx_protocol_ingredients_herb_id` | protocol_ingredients |
| `idx_protocol_ingredients_protocol` | protocol_ingredients |
| `idx_recommendations_product_id` | recommendations |
| `idx_recommendations_user_id` | recommendations |
| `idx_reward_redemptions_reward_id` | reward_redemptions |
| `idx_safety_alerts_herb_id` | safety_alerts |
| `idx_safety_alerts_protocol_id` | safety_alerts |
| `idx_security_agent_config_updated_by` | security_agent_config |
| `idx_security_audit_log_resolved_by` | security_audit_log |
| `idx_security_pending_repairs_audit_log_id` | security_pending_repairs |
| `idx_security_pending_repairs_reviewed_by` | security_pending_repairs |
| `idx_sec_repair_audit` | security_repair_log |
| `idx_security_repair_log_applied_by` | security_repair_log |
| `idx_supplement_brand_aliases_brand_registry_id` | supplement_brand_aliases |
| `idx_toolchain_step_results_run_id` | toolchain_step_results |
| `idx_ultrathink_agent_log_protocol_id` | ultrathink_agent_log |
| `idx_ultrathink_agent_log_user_id` | ultrathink_agent_log |
| `idx_ut_recs_protocol` | ultrathink_recommendations |
| `idx_ut_recs_user` | ultrathink_recommendations |
| `idx_upp_user` | user_peptide_prescriptions |
| `idx_user_protocols_user_id` | user_protocols |

#### Search / GIN / Trigram Indexes (18) — DO NOT DROP
These power ViaConnect search engine, brand lookup, and supplement discovery.

| Index | Table | Type |
|-------|-------|------|
| `idx_ingredients_name_trgm` | ingredients | GIN trgm |
| `idx_sbr_name_trgm` | supplement_brand_registry | GIN trgm |
| `idx_sbr_search_vector` | supplement_brand_registry | GIN tsvector |
| `idx_brand_registry_search` | supplement_brand_registry | GIN tsvector |
| `idx_brand_registry_categories` | supplement_brand_registry | GIN |
| `idx_sbtp_name_trgm` | supplement_brand_top_products | GIN trgm |
| `idx_sbtp_search_vector` | supplement_brand_top_products | GIN tsvector |
| `idx_brand_products_search` | supplement_brand_top_products | GIN tsvector |
| `idx_brand_products_barcode` | supplement_brand_top_products | btree partial |
| `idx_brand_products_ean` | supplement_brand_top_products | btree partial |
| `idx_brand_products_enriched` | supplement_brand_top_products | btree partial |
| `idx_sba_normalized` | supplement_brand_aliases | btree |
| `idx_brand_aliases_search` | supplement_brand_aliases | GIN tsvector |
| `supplement_search_index_brand_name_trgm_idx` | supplement_search_index | GIN trgm |
| `supplement_search_index_normalized_name_trgm_idx` | supplement_search_index | GIN trgm |
| `supplement_search_index_product_name_trgm_idx` | supplement_search_index | GIN trgm |
| `idx_ingredients_search` | farmceutica_ingredients | GIN tsvector |
| `idx_ingredients_name` | farmceutica_ingredients | btree |

#### Functional / Filter Indexes (22) — DO NOT DROP (Pre-Launch)
These support app queries (filtering, RLS optimization, auth flows, template lookups).

| Index | Table | Purpose |
|-------|-------|---------|
| `idx_audit_logs_table_record` | audit_logs | Audit log lookup |
| `idx_botanical_formulas_id_practitioner` | botanical_formulas | RLS optimization |
| `idx_brand_enrichment_next` | brand_enrichment_state | Enrichment scheduling |
| `idx_brand_enrichment_tier` | brand_enrichment_state | Enrichment filtering |
| `idx_data_events_pending` | data_events | Event processing |
| `idx_email_otps_expires_at` | email_otps | OTP expiration cleanup |
| `idx_herbs_category` | herbs | Category filtering |
| `idx_ingredients_category` | farmceutica_ingredients | Category filtering |
| `idx_kit_registrations_barcode` | kit_registrations | Barcode lookup |
| `idx_orders_id_user_id` | orders | RLS optimization |
| `idx_pr_category` | peptide_registry | Category filtering |
| `idx_pr_evidence` | peptide_registry | Evidence level filtering |
| `idx_pst_key` | peptide_stack_templates | Template lookup |
| `idx_product_catalog_active` | product_catalog | Active product filtering |
| `idx_product_catalog_category` | product_catalog | Category filtering |
| `idx_product_cache_query` | product_lookup_cache | Cache query lookup |
| `idx_pr_trigger` | protocol_rules | Rule trigger lookup |
| `idx_pt_ids` | protocol_templates | Pattern ID lookup (GIN) |
| `idx_pt_key` | protocol_templates | Pattern key lookup |
| `idx_protocols_id_patient_id` | protocols | RLS optimization |
| `idx_protocols_id_user_id` | protocols | RLS optimization |
| `idx_verification_codes_email` | verification_codes | Auth flow |

**Recommended Action:** Run `SELECT pg_stat_reset();` 30 days after launch (July 2026). Wait another 30 days. Re-run advisor in August 2026. Only drop indexes that still show 0 scans with real production traffic.

---

### 2. auth_db_connections_absolute — Auth Connection Pool

**Detail:** The Auth server is configured to use at most 10 connections (absolute). Supabase recommends switching to percentage-based allocation so it scales with instance size.

**Recommended Action:** Review with Thomas (CTO). Supabase Dashboard > Project Settings > Database > adjust Auth connection pool from absolute (10) to percentage-based.

---

### 3. user_streaks / user_tiers FK Indexes

**Note:** `idx_user_streaks_user_id` and `idx_user_tiers_user_id` are FK-supporting indexes on tables with active data (4 rows each). These will be exercised once more users onboard. Keep.

---

## Review Sign-off

- [ ] Gary (Lead) reviewed unused_index decisions
- [ ] Thomas (CTO) reviewed auth_db_connections config
- [ ] Post-launch `pg_stat_reset()` scheduled for July 2026
- [ ] Re-evaluation scheduled for August 2026
