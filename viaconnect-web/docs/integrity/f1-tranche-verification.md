# Prompt 210f Task F1 Tranche Verification

Migration name: 20260707150000_prompt_210f_practitioner_core_additive
Applied version (supabase_migrations.schema_migrations): 20260708004716
Apply outcome: success. Additive idempotent DDL applied to the ViaConnect2026 production project (nnhkcufyqjojdbvdrpky).

Note on idempotency: schema_migrations holds two rows under this migration name, versions 20260708003638 and 20260708004716, indicating a prior apply attempt in addition to this one. The tranche is fully idempotent. Every table is guarded by CREATE TABLE IF NOT EXISTS, every policy by a pg_policies DO guard, the herbal seed by an empty table guard, and the tiers seed by ON CONFLICT. A repeat apply is therefore a no op. This is confirmed below by the seed count staying at 8 and every policy count landing at its expected value.

## Verification results (SELECT only)

a. New tables present: 13 of 13 expected. PASS. practitioner_patients, collaborative_care, supplement_protocols, supplement_protocol_items, clinical_notes, panel_orders, portal_messages, herbal_genomic_interactions, patient_intake_forms, consultations, practitioner_tiers, practitioner_subscriptions, constitutional_assessments. practitioners already existed.

b. practitioners additive columns present: 8 of 8 expected. PASS. account_status, practice_name, credential_type, dispensary_slug, patient_facing_display_name, onboarded_at, default_active_tab, default_patient_view_mode.

c. account_status distribution: the practitioners table currently holds zero rows, so the grouped result is empty. No values to report. Not a failure.

d. RLS enabled plus at least one policy on every new table: PASS. No zero policy row. rowsecurity is true on all 13. Policy counts: clinical_notes 5, collaborative_care 1, constitutional_assessments 5, consultations 3, herbal_genomic_interactions 1, panel_orders 4, patient_intake_forms 4, portal_messages 3, practitioner_patients 3, practitioner_subscriptions 2, practitioner_tiers 2, supplement_protocol_items 3, supplement_protocols 5.

e. engagement_score_snapshots carries both the live merged policy and the new 210f consent arm: 2 of 2 expected. PASS. engagement_score_snapshots_select_merged and engagement_scores_practitioner_read_via_pp_210f.

f. Helix consumer only policies intact: 0 practitioner referencing policies on helix tables. PASS. The additive tranche introduced no practitioner read arm onto any helix surface.

g. account_status not null coverage: non null count equals total count. Both are 0 because the table is empty, so the equality holds. PASS.

h. herbal_genomic_interactions seed rows: 8 of 8 expected. PASS. The empty table guard prevented duplication despite the repeat apply.

## Gary owed follow ups

1. Manual practitioner path localhost walk. Gary to click through the practitioner portal flows on localhost (login, patient panel, invite patient, protocol tools, naturopath tab) to confirm the live shape reconciliation and the invitation RPCs (lookup_practitioner_invitation, accept_practitioner_invitation) behave correctly against a real session.

2. Drift log quietness watch. Gary to confirm the drift log stays quiet after this apply, verifying no unexpected schema divergence surfaces from the additive tranche.

## Rollback reference

This tranche is creates only against live objects. The live practitioners table gained columns; every other object is brand new. No live data was dropped or altered destructively. The single DROP NOT NULL relax targets practitioner_patients.patient_id, a column on a table created by this same tranche, so it carries zero live exposure.

To roll back: drop the 13 new tables listed in check a, then remove the practitioners columns added by sections 7, 8, and 9 of the migration file (the ADD COLUMN pack, default_patient_view_mode and default_active_tab, and dispensary_slug). See the migration file for the exact object list:

supabase/migrations/20260707150000_prompt_210f_practitioner_core_additive.sql
