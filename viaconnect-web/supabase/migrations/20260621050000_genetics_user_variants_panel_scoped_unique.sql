-- Go-live follow-up (2026-06-20): make the user_variants unique key PANEL-SCOPED.
-- The same rsID can legitimately appear in more than one panel (for example COMT
-- rs4680 is in NutrigenDX, HormoneIQ, CannabisIQ, and GeneXM). The previous
-- (user_id, rsid) unique key caused a second panel's upload to overwrite the
-- first panel's row for a shared rsID, losing the earlier panel's variant.
-- Replace it with (user_id, rsid, panel_key).
--
-- Safe: the new key is strictly weaker than the old one, so every existing row
-- already satisfies it (verified before apply: panel_key is NOT NULL, and there
-- are 0 duplicate (user_id, rsid, panel_key) triples). The application upsert in
-- src/lib/genetics/dnaUploadStore.ts uses onConflict 'user_id,rsid,panel_key' to
-- match this constraint, so the code and the constraint must ship together.

alter table public.user_variants
  drop constraint if exists user_variants_user_rsid_unique;

alter table public.user_variants
  add constraint user_variants_user_rsid_panel_unique unique (user_id, rsid, panel_key);
