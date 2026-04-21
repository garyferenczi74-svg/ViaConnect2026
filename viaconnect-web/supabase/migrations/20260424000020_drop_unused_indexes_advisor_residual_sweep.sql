-- =============================================================================
-- Performance advisor remediation: drop 156 confirmed-unused indexes
-- =============================================================================
-- Cuts the 186 unused_index INFO advisor findings by ~84%.
--
-- Drop criteria (all four required):
--   pg_stat_user_indexes.idx_scan = 0           -- never read since last reset
--   NOT pg_index.indisunique                     -- not enforcing uniqueness
--   NOT pg_index.indisprimary                    -- not a primary key
--   NOT EXISTS pg_constraint.conindid = ...      -- not backing any constraint
--   pg_index.indpred IS NULL                     -- not a partial index (cold-path safe)
--   relname not in (*_audit_log, *_kpi_snapshots, *_archive)  -- cold-path tables retained
--
-- Plain DROP INDEX IF EXISTS (not CONCURRENTLY): these indexes have zero
-- scans, so the AccessExclusiveLock acquired is microseconds — there is
-- no concurrent reader to wait on the lock. apply_migration runs in a
-- transaction; CONCURRENTLY is incompatible with that.
--
-- Reclaim is small (~1.6 MB), but the bigger win is removing write-
-- amplification on hot tables (commission_accruals, body_tracker_*,
-- map_*, pricing_proposals).
-- =============================================================================

DROP INDEX IF EXISTS public.idx_aggregation_snapshots_cfo_reviewer_id;
DROP INDEX IF EXISTS public.idx_approver_assignments_assigned_by;
DROP INDEX IF EXISTS public.idx_approver_assignments_unassigned_by;
DROP INDEX IF EXISTS public.idx_approver_assignments_user_id;
DROP INDEX IF EXISTS public.idx_board_pack_ai_prompts_reviewed_by_cfo_id;
DROP INDEX IF EXISTS public.idx_bpa_pack;
DROP INDEX IF EXISTS public.idx_bpd_member;
DROP INDEX IF EXISTS public.idx_bpd_pack;
DROP INDEX IF EXISTS public.idx_bpde_distribution;
DROP INDEX IF EXISTS public.idx_board_pack_sections_cfo_reviewed_by;
DROP INDEX IF EXISTS public.idx_bps_pack;
DROP INDEX IF EXISTS public.idx_board_pack_templates_counsel_reviewer_id;
DROP INDEX IF EXISTS public.idx_board_packs_aggregation_snapshot_id;
DROP INDEX IF EXISTS public.idx_board_packs_ceo_issued_by;
DROP INDEX IF EXISTS public.idx_board_packs_cfo_approved_by;
DROP INDEX IF EXISTS public.idx_board_packs_created_by;
DROP INDEX IF EXISTS public.idx_board_packs_supersedes_pack_id;
DROP INDEX IF EXISTS public.idx_board_packs_template_id;
DROP INDEX IF EXISTS public.idx_body_photo_sessions_linked_entry_id;
DROP INDEX IF EXISTS public.idx_scan_measurements_session;
DROP INDEX IF EXISTS public.idx_scan_measurements_user_date;
DROP INDEX IF EXISTS public.idx_bt_entries_user_date;
DROP INDEX IF EXISTS public.idx_body_tracker_metabolic_entry_id;
DROP INDEX IF EXISTS public.idx_bt_milestones_user_active;
DROP INDEX IF EXISTS public.idx_bt_milestones_user_status;
DROP INDEX IF EXISTS public.idx_body_tracker_segmental_fat_entry_id;
DROP INDEX IF EXISTS public.idx_body_tracker_segmental_muscle_entry_id;
DROP INDEX IF EXISTS public.idx_body_tracker_weight_entry_id;
DROP INDEX IF EXISTS public.idx_cva_channel;
DROP INDEX IF EXISTS public.idx_cvc_channel;
DROP INDEX IF EXISTS public.idx_commission_accruals_practitioner_status;
DROP INDEX IF EXISTS public.idx_commission_accruals_source_order_id;
DROP INDEX IF EXISTS public.idx_commission_accruals_source_order_item_id;
DROP INDEX IF EXISTS public.idx_commission_reconciliation_lines_related_violation_id;
DROP INDEX IF EXISTS public.idx_commission_reconciliation_lines_source_accrual_id;
DROP INDEX IF EXISTS public.idx_commission_reconciliation_lines_source_order_id;
DROP INDEX IF EXISTS public.idx_crl_run;
DROP INDEX IF EXISTS public.idx_crr_practitioner;
DROP INDEX IF EXISTS public.idx_competitor_pricing_observed_by_user_id;
DROP INDEX IF EXISTS public.idx_cfi_formulation;
DROP INDEX IF EXISTS public.idx_cfi_ingredient;
DROP INDEX IF EXISTS public.idx_custom_formulation_medical_reviews_custom_formulation_id;
DROP INDEX IF EXISTS public.idx_custom_formulation_medical_reviews_reviewer_user_id;
DROP INDEX IF EXISTS public.idx_custom_formulation_regulatory_reviews_custom_formulation_id;
DROP INDEX IF EXISTS public.idx_custom_formulation_regulatory_reviews_reviewer_user_id;
DROP INDEX IF EXISTS public.idx_custom_formulation_stability_tests_conducted_by_user_id;
DROP INDEX IF EXISTS public.idx_custom_formulation_stability_tests_custom_formulation_id;
DROP INDEX IF EXISTS public.idx_custom_formulations_enrollment_id;
DROP INDEX IF EXISTS public.idx_custom_formulations_exclusive_to_practitioner_id;
DROP INDEX IF EXISTS public.idx_custom_formulations_parent_formulation_id;
DROP INDEX IF EXISTS public.idx_custom_formulations_practitioner;
DROP INDEX IF EXISTS public.idx_custom_formulations_product_catalog_id;
DROP INDEX IF EXISTS public.idx_cpb_proposal;
DROP INDEX IF EXISTS public.idx_customer_price_bindings_pricing_domain_id;
DROP INDEX IF EXISTS public.idx_customer_price_bindings_superseded_by_binding_id;
DROP INDEX IF EXISTS public.idx_engagement_scores_user;
DROP INDEX IF EXISTS public.idx_flag_audit_changed_by;
DROP INDEX IF EXISTS public.idx_flag_audit_feature;
DROP INDEX IF EXISTS public.idx_features_feature_owner;
DROP INDEX IF EXISTS public.idx_features_kill_switch_engaged_by;
DROP INDEX IF EXISTS public.idx_genex360_products_gifted_tier_id;
DROP INDEX IF EXISTS public.idx_genex360_purchases_family_member_id;
DROP INDEX IF EXISTS public.idx_genex360_purchases_order_id;
DROP INDEX IF EXISTS public.idx_genex360_purchases_product_id;
DROP INDEX IF EXISTS public.idx_genex360_purchases_user;
DROP INDEX IF EXISTS public.idx_governance_configuration_log_changed_by;
DROP INDEX IF EXISTS public.idx_helix_pool_primary;
DROP INDEX IF EXISTS public.idx_helix_tiers_required_membership_tier_id;
DROP INDEX IF EXISTS public.idx_ingredient_library_added_by;
DROP INDEX IF EXISTS public.idx_ingredient_library_last_reviewed_by;
DROP INDEX IF EXISTS public.idx_ingredient_interactions_a;
DROP INDEX IF EXISTS public.idx_ingredient_interactions_b;
DROP INDEX IF EXISTS public.idx_ingredient_library_interactions_added_by;
DROP INDEX IF EXISTS public.idx_jeffery_knowledge_entries_message_id;
DROP INDEX IF EXISTS public.idx_l4_enroll_practitioner;
DROP INDEX IF EXISTS public.idx_manual_customers_practitioner;
DROP INDEX IF EXISTS public.idx_manual_customers_verified_by_admin_user;
DROP INDEX IF EXISTS public.idx_map_compliance_scores_practitioner_latest;
DROP INDEX IF EXISTS public.idx_map_policies_product_tier;
DROP INDEX IF EXISTS public.idx_map_policies_updated_by;
DROP INDEX IF EXISTS public.idx_map_policy_change_log_changed_by;
DROP INDEX IF EXISTS public.idx_map_policy_change_log_policy;
DROP INDEX IF EXISTS public.idx_map_price_observations_product_time;
DROP INDEX IF EXISTS public.idx_map_remediation_evidence_practitioner_id;
DROP INDEX IF EXISTS public.idx_map_remediation_evidence_violation;
DROP INDEX IF EXISTS public.idx_map_violations_observation_id;
DROP INDEX IF EXISTS public.idx_map_violations_policy_id;
DROP INDEX IF EXISTS public.idx_map_violations_product_id;
DROP INDEX IF EXISTS public.idx_map_vip_exemption_sensitive_notes_created_by;
DROP INDEX IF EXISTS public.idx_map_vip_exemption_sensitive_notes_exemption;
DROP INDEX IF EXISTS public.idx_map_vip_exemptions_practitioner_status;
DROP INDEX IF EXISTS public.idx_map_vip_exemptions_requested_by;
DROP INDEX IF EXISTS public.idx_map_vip_exemptions_reviewed_by;
DROP INDEX IF EXISTS public.idx_map_vip_exemptions_revoked_by;
DROP INDEX IF EXISTS public.idx_map_waiver_evidence_uploaded_by;
DROP INDEX IF EXISTS public.idx_map_waiver_evidence_waiver;
DROP INDEX IF EXISTS public.idx_map_waiver_skus_product;
DROP INDEX IF EXISTS public.idx_map_waiver_skus_waiver;
DROP INDEX IF EXISTS public.idx_map_waivers_practitioner_status;
DROP INDEX IF EXISTS public.idx_map_waivers_requested_by;
DROP INDEX IF EXISTS public.idx_map_waivers_reviewed_by;
DROP INDEX IF EXISTS public.idx_map_waivers_revoked_by;
DROP INDEX IF EXISTS public.idx_memberships_tier_id;
DROP INDEX IF EXISTS public.idx_outcome_stack_components_sku;
DROP INDEX IF EXISTS public.idx_stack_components_stack;
DROP INDEX IF EXISTS public.idx_payout_batch_lines_payout_method_id;
DROP INDEX IF EXISTS public.idx_payout_batch_lines_reconciliation_run_id;
DROP INDEX IF EXISTS public.idx_pbl_batch;
DROP INDEX IF EXISTS public.idx_pbl_practitioner;
DROP INDEX IF EXISTS public.idx_payout_batches_approved_by;
DROP INDEX IF EXISTS public.idx_payout_batches_created_by;
DROP INDEX IF EXISTS public.idx_payout_disputes_reconciliation_line_id;
DROP INDEX IF EXISTS public.idx_payout_disputes_reviewer_id;
DROP INDEX IF EXISTS public.idx_pd_practitioner;
DROP INDEX IF EXISTS public.idx_payout_transactions_practitioner_id;
DROP INDEX IF EXISTS public.idx_pt_batch_line;
DROP INDEX IF EXISTS public.idx_photo_share_permissions_photo_session_user_id;
DROP INDEX IF EXISTS public.idx_ppm_practitioner;
DROP INDEX IF EXISTS public.idx_practitioner_statements_payout_transaction_id;
DROP INDEX IF EXISTS public.idx_ps_practitioner;
DROP INDEX IF EXISTS public.idx_practitioner_tax_documents_reviewer_id;
DROP INDEX IF EXISTS public.idx_ptd_practitioner;
DROP INDEX IF EXISTS public.idx_pvc_practitioner;
DROP INDEX IF EXISTS public.idx_practitioners_user;
DROP INDEX IF EXISTS public.idx_price_change_history_applied_by_user_id;
DROP INDEX IF EXISTS public.idx_price_history_domain;
DROP INDEX IF EXISTS public.idx_price_history_proposal;
DROP INDEX IF EXISTS public.idx_pricing_proposals_domain;
DROP INDEX IF EXISTS public.idx_pricing_proposals_initiator;
DROP INDEX IF EXISTS public.idx_pricing_proposals_rolled_back_by;
DROP INDEX IF EXISTS public.idx_proposal_approvals_approver;
DROP INDEX IF EXISTS public.idx_proposal_approvals_proposal;
DROP INDEX IF EXISTS public.idx_proposal_comments_author_user_id;
DROP INDEX IF EXISTS public.idx_proposal_comments_proposal;
DROP INDEX IF EXISTS public.idx_proposal_comments_reply_to_comment_id;
DROP INDEX IF EXISTS public.idx_share_activity_share;
DROP INDEX IF EXISTS public.idx_research_hub_alerts_user_item_id;
DROP INDEX IF EXISTS public.idx_rh_items_category;
DROP INDEX IF EXISTS public.idx_research_hub_user_items_item_id;
DROP INDEX IF EXISTS public.idx_rh_user_items_score;
DROP INDEX IF EXISTS public.idx_research_hub_user_sources_category_id;
DROP INDEX IF EXISTS public.idx_research_hub_user_tabs_category_id;
DROP INDEX IF EXISTS public.idx_scheduled_activations_feature;
DROP INDEX IF EXISTS public.idx_scheduled_flag_activations_canceled_by;
DROP INDEX IF EXISTS public.idx_scheduled_flag_activations_scheduled_by;
DROP INDEX IF EXISTS public.idx_sherlock_activity_log_task_id;
DROP INDEX IF EXISTS public.idx_sherlock_agent_state_current_task_id;
DROP INDEX IF EXISTS public.idx_sherlock_escalations_task_id;
DROP INDEX IF EXISTS public.idx_sherlock_insights_cache_recent;
DROP INDEX IF EXISTS public.idx_sherlock_task_queue_category_id;
DROP INDEX IF EXISTS public.idx_shop_order_items_order;
DROP INDEX IF EXISTS public.idx_order_status_history_order;
DROP INDEX IF EXISTS public.idx_ultrathink_advisor_ratings_conversation_id;
DROP INDEX IF EXISTS public.idx_utkge_dst;
DROP INDEX IF EXISTS public.idx_utkge_src;
DROP INDEX IF EXISTS public.idx_user_feature_opt_ins_feature_id;
