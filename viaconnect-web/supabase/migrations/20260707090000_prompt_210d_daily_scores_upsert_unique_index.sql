-- Prompt 210d P0-4 fix: unique index for onConflict 'user_id,score_date' (42P10); NULL score_date rows from wearable-era are unaffected (NULLs are distinct in btree).
create unique index if not exists daily_scores_user_id_score_date_key on public.daily_scores (user_id, score_date);
