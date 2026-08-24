-- Prompt 227a Phase 1: schedule Research Hub Aging Cell ingest on 219m bearer path.
-- Proves one Tier 2 PubMed journal can update research_hub_items unattended.

DO $$
BEGIN
  PERFORM cron.unschedule('viaconnect_227a_research_hub_aging_cell');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 10-minute cadence during Phase 1 proof so a second unattended run can be
-- observed in-session. Steady-state cadence can be raised to 6h after G54.
SELECT cron.schedule(
  'viaconnect_227a_research_hub_aging_cell',
  '*/10 * * * *',
  $sql$
  SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-227a-phase1-research-hub');
  $sql$
);

COMMENT ON EXTENSION pg_cron IS 'Includes viaconnect_227a_research_hub_aging_cell (227a Phase 1 Research Hub proof)';
