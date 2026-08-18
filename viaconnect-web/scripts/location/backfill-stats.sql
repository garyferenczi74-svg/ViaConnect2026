-- Prompt 223 backfill statistics.
-- Legacy source is ONLY auth.users.raw_user_meta_data->>'location'.
-- Bare Buffalo stays prompted; this never picks among multiple Buffalos.
-- Run as service_role or postgres.

SELECT * FROM public.backfill_profile_locations();
