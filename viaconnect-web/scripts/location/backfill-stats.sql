-- Prompt 223 backfill statistics.
-- Recovers location_legacy plus structured signup metadata keys, then
-- parses leftover location_legacy against ref_cities.
-- Bare Buffalo stays prompted; this never picks among multiple Buffalos.
-- Run as service_role or postgres.

SELECT * FROM public.backfill_profile_locations();
