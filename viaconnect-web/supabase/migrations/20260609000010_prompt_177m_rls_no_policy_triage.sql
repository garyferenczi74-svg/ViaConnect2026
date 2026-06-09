-- Prompt 177m (2026-06-09): triage 18 public tables left with RLS
-- enabled but zero policies. In Postgres an RLS enabled table with no
-- policy denies the authenticated role all access, which is why every
-- per user feature table in this group has silently been refusing
-- inserts and returning empty reads.
--
-- Five tables are genuine per user surfaces and get user scoped
-- policies here. The remaining 13 are server only (cache, audit,
-- backup) and stay locked because their only legitimate access path
-- is service_role from a route or a worker; client policies would
-- widen the surface unnecessarily.
--
-- Ownership column: user_hash text NOT NULL on every per user table.
-- The hash is the salted SHA256 produced by public.caq_compute_user_hash(uuid),
-- a SECURITY DEFINER helper that reads the corpus salt from the
-- vault. Policies recompute it from auth.uid() so a row is visible
-- only to the user whose uuid hashes to its user_hash.
--
-- voice_edit_operations_log has no direct user_hash column; ownership
-- chains through its session_id FK to voice_edit_sessions.user_hash.
-- Policies traverse that link via EXISTS so the existing FK is the
-- single source of truth.
--
-- Append only migration. Existing migrations are not edited. No
-- table is disabled and no public surface is added.

-- =========================================================================
-- hydration_log_sessions: 170o + 172e telemetry written by the
-- /api/nutrition/hydration/quick-log route. user_hash is the SQL
-- helper output, not the route's local djb2 (which is also being
-- replaced in this prompt so admin inserts produce the salted hash
-- the policies expect).
-- =========================================================================

create policy "hls_select_own" on public.hydration_log_sessions
  for select to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "hls_insert_own" on public.hydration_log_sessions
  for insert to authenticated
  with check (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "hls_update_own" on public.hydration_log_sessions
  for update to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()))
  with check (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "hls_delete_own" on public.hydration_log_sessions
  for delete to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()));

-- Column default so a direct user scoped insert that omits user_hash
-- still satisfies the WITH CHECK. The service_role path also keeps
-- working because it can write the column explicitly via the SQL
-- helper output.
alter table public.hydration_log_sessions
  alter column user_hash set default public.caq_compute_user_hash(auth.uid());

-- =========================================================================
-- quick_log_sessions: 168d quick log telemetry. Same pattern.
-- =========================================================================

create policy "qls_select_own" on public.quick_log_sessions
  for select to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "qls_insert_own" on public.quick_log_sessions
  for insert to authenticated
  with check (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "qls_update_own" on public.quick_log_sessions
  for update to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()))
  with check (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "qls_delete_own" on public.quick_log_sessions
  for delete to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()));

-- =========================================================================
-- voice_edit_sessions: 170j voice edit session header. user_hash policies.
-- =========================================================================

create policy "ves_select_own" on public.voice_edit_sessions
  for select to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "ves_insert_own" on public.voice_edit_sessions
  for insert to authenticated
  with check (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "ves_update_own" on public.voice_edit_sessions
  for update to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()))
  with check (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "ves_delete_own" on public.voice_edit_sessions
  for delete to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()));

-- =========================================================================
-- voice_edit_operations_log: ownership chains through session_id FK
-- to voice_edit_sessions. The EXISTS subquery is the canonical path.
-- =========================================================================

create policy "veol_select_via_session" on public.voice_edit_operations_log
  for select to authenticated
  using (exists (
    select 1
    from public.voice_edit_sessions s
    where s.id = voice_edit_operations_log.session_id
      and s.user_hash = public.caq_compute_user_hash(auth.uid())
  ));

create policy "veol_insert_via_session" on public.voice_edit_operations_log
  for insert to authenticated
  with check (exists (
    select 1
    from public.voice_edit_sessions s
    where s.id = voice_edit_operations_log.session_id
      and s.user_hash = public.caq_compute_user_hash(auth.uid())
  ));

create policy "veol_update_via_session" on public.voice_edit_operations_log
  for update to authenticated
  using (exists (
    select 1
    from public.voice_edit_sessions s
    where s.id = voice_edit_operations_log.session_id
      and s.user_hash = public.caq_compute_user_hash(auth.uid())
  ))
  with check (exists (
    select 1
    from public.voice_edit_sessions s
    where s.id = voice_edit_operations_log.session_id
      and s.user_hash = public.caq_compute_user_hash(auth.uid())
  ));

create policy "veol_delete_via_session" on public.voice_edit_operations_log
  for delete to authenticated
  using (exists (
    select 1
    from public.voice_edit_sessions s
    where s.id = voice_edit_operations_log.session_id
      and s.user_hash = public.caq_compute_user_hash(auth.uid())
  ));

-- =========================================================================
-- voice_native_sessions: 170n voice native entry header. user_hash policies.
-- =========================================================================

create policy "vns_select_own" on public.voice_native_sessions
  for select to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "vns_insert_own" on public.voice_native_sessions
  for insert to authenticated
  with check (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "vns_update_own" on public.voice_native_sessions
  for update to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()))
  with check (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "vns_delete_own" on public.voice_native_sessions
  for delete to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()));

-- =========================================================================
-- user_meal_corpus: 170 corpus rows the user opted into. user_hash policies.
-- =========================================================================

create policy "umc_select_own" on public.user_meal_corpus
  for select to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "umc_insert_own" on public.user_meal_corpus
  for insert to authenticated
  with check (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "umc_update_own" on public.user_meal_corpus
  for update to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()))
  with check (user_hash = public.caq_compute_user_hash(auth.uid()));

create policy "umc_delete_own" on public.user_meal_corpus
  for delete to authenticated
  using (user_hash = public.caq_compute_user_hash(auth.uid()));

-- =========================================================================
-- Tables intentionally LEFT locked (RLS on, zero policies). These are
-- server only surfaces accessed by service_role from routes or workers,
-- never by the user scoped client. A no policy state correctly denies
-- the authenticated role and the anon role; the existing access paths
-- are unaffected because service_role bypasses RLS.
--
--   ai_route_audit
--   backfill_audit
--   barcode_capture_corpus
--   food_recognition_cache
--   usda_food_cache
--   system_health_checks
--   prompt_177d_full_manual_repair_log
--   meal_items_hydration_backup_172e
--   products_dropped_backup_142e
--   products_dropped_backup_152w
--   products_image_urls_backup_142d
--   products_methylation_backup_142c
--
-- If a future surface ever needs to read one of these from the user
-- scoped client, the right move is a separate migration adding the
-- specific policy required, not a blanket policy here.
-- =========================================================================
