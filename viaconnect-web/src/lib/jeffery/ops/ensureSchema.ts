/**
 * Prompt 219H: apply continuous-ops DDL once if tables are missing.
 * Runs on Vercel runtime where POSTGRES_* / DATABASE_URL secrets are populated
 * (local env pull often redacts them as empty).
 */

import fs from "node:fs";
import path from "node:path";
import { safeLog } from "@/lib/utils/safe-log";
import { createAdminClientOrNull } from "@/lib/supabase/admin";

let appliedThisProcess = false;

function buildConnectionString(): string | null {
  const direct =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (direct && direct.trim().length > 0) return direct.trim().replace(/^["']|["']$/g, "");

  const host = process.env.POSTGRES_HOST?.trim();
  const user = process.env.POSTGRES_USER?.trim() || "postgres";
  const password = process.env.POSTGRES_PASSWORD?.trim();
  const database = process.env.POSTGRES_DATABASE?.trim() || "postgres";
  if (host && password) {
    const enc = encodeURIComponent(password);
    return `postgresql://${user}:${enc}@${host}:5432/${database}`;
  }
  return null;
}

async function tablesMissing(): Promise<boolean> {
  try {
    const sb = createAdminClientOrNull();
    if (!sb) return true;
    const { error } = await sb.from("agent_cadence_jobs").select("job_key").limit(1);
    // PGRST205 = table not in schema cache
    if (error && (error.code === "PGRST205" || /Could not find the table/i.test(error.message))) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

function loadMigrationSql(): string {
  // Always use embedded DDL in serverless to avoid project-wide filesystem tracing.
  // Migration file remains source of truth in git; keep EMBEDDED_219H_SQL in sync.
  void fs;
  void path;
  return EMBEDDED_219H_SQL;
}

/** Embedded copy so Vercel serverless always has the DDL even if file path differs. */
const EMBEDDED_219H_SQL = `
CREATE TABLE IF NOT EXISTS public.agent_cadence_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL UNIQUE,
  agent_id text NOT NULL,
  label text NOT NULL,
  interval_minutes integer NOT NULL CHECK (interval_minutes > 0),
  priority integer NOT NULL DEFAULT 50,
  budget_class text NOT NULL DEFAULT 'B' CHECK (budget_class IN ('A', 'B', 'C', 'none')),
  mechanism text NOT NULL DEFAULT 'cron_tick' CHECK (mechanism IN ('cron_tick', 'event', 'cron_daily', 'hybrid')),
  enabled boolean NOT NULL DEFAULT true,
  timeout_minutes integer NOT NULL DEFAULT 30,
  coalesce_window_sec integer NOT NULL DEFAULT 300,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at timestamptz,
  last_status text,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_cadence_enabled_next ON public.agent_cadence_jobs (enabled, next_run_at) WHERE enabled = true;
ALTER TABLE public.agent_cadence_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_cadence_admin_read ON public.agent_cadence_jobs;
CREATE POLICY agent_cadence_admin_read ON public.agent_cadence_jobs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'));

CREATE TABLE IF NOT EXISTS public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  coalesce_key text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed', 'coalesced')),
  attempts integer NOT NULL DEFAULT 0,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_events_pending ON public.platform_events (status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_platform_events_coalesce ON public.platform_events (coalesce_key, created_at) WHERE status = 'pending';
ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_events_admin_read ON public.platform_events;
CREATE POLICY platform_events_admin_read ON public.platform_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'));
DROP POLICY IF EXISTS platform_events_user_insert ON public.platform_events;
CREATE POLICY platform_events_user_insert ON public.platform_events FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.agent_job_dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL,
  agent_id text NOT NULL,
  failure_class text NOT NULL DEFAULT 'retry_exhausted' CHECK (failure_class IN ('retry_exhausted', 'missed_run', 'stuck', 'budget', 'error')),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_dead_letters_open ON public.agent_job_dead_letters (resolved, created_at DESC) WHERE resolved = false;
ALTER TABLE public.agent_job_dead_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_dead_letters_admin_read ON public.agent_job_dead_letters;
CREATE POLICY agent_dead_letters_admin_read ON public.agent_job_dead_letters FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'));

CREATE TABLE IF NOT EXISTS public.freshness_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_key text NOT NULL UNIQUE,
  label text NOT NULL,
  max_age_hours numeric NOT NULL,
  domain text NOT NULL,
  last_measured_at timestamptz,
  last_age_hours numeric,
  last_status text CHECK (last_status IS NULL OR last_status IN ('ok', 'warning', 'breach', 'unknown')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.freshness_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS freshness_targets_admin_read ON public.freshness_targets;
CREATE POLICY freshness_targets_admin_read ON public.freshness_targets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'));

CREATE TABLE IF NOT EXISTS public.agent_job_backlog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL,
  agent_id text NOT NULL,
  budget_class text NOT NULL DEFAULT 'B',
  reason text NOT NULL DEFAULT 'budget_exhausted',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'resumed', 'dropped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_agent_backlog_queued ON public.agent_job_backlog (status, created_at) WHERE status = 'queued';
ALTER TABLE public.agent_job_backlog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_backlog_admin_read ON public.agent_job_backlog;
CREATE POLICY agent_backlog_admin_read ON public.agent_job_backlog FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'));

INSERT INTO public.agent_cadence_jobs (job_key, agent_id, label, interval_minutes, priority, budget_class, mechanism, timeout_minutes, config) VALUES
  ('hounddog.discovery', 'hounddog', 'Hound Dog broad discovery', 360, 40, 'A', 'cron_tick', 45, '{"pages": 8}'::jsonb),
  ('hounddog.pubmed', 'hounddog', 'PubMed date-bounded discovery', 720, 45, 'B', 'cron_tick', 30, '{"retmax": 8}'::jsonb),
  ('hounddog.social', 'hounddog', 'Social relevance sweep', 360, 50, 'B', 'cron_tick', 30, '{}'::jsonb),
  ('marshall.gate', 'marshall', 'Marshall gate pending staging', 15, 10, 'none', 'hybrid', 15, '{"sla_minutes": 30}'::jsonb),
  ('sherlock.curate', 'sherlock', 'Sherlock curation sweep', 720, 35, 'B', 'hybrid', 40, '{"includes_grok": true}'::jsonb),
  ('digest.rollup', 'jeffery', 'Domain digest hourly rollup', 60, 30, 'none', 'cron_tick', 20, '{"domains": ["gordon","arnold","elysium","thanos"]}'::jsonb),
  ('hannah.light_freshness', 'hannah', 'Hannah light freshness pass', 240, 25, 'C', 'cron_tick', 15, '{"mode": "light"}'::jsonb),
  ('hannah.full_compile', 'hannah', 'Hannah full daily compile (via sync chain)', 1440, 20, 'A', 'cron_daily', 120, '{"via": "synchronism-daily"}'::jsonb),
  ('elysium.allowlist', 'elysium', 'Elysium genetics allowlist crawl', 720, 45, 'B', 'cron_tick', 40, '{}'::jsonb),
  ('thanos.allowlist', 'thanos', 'Thanos peptide allowlist crawl', 720, 45, 'B', 'cron_tick', 40, '{}'::jsonb),
  ('security.daily', 'security_advisor', 'Security Advisor daily', 1440, 60, 'none', 'hybrid', 30, '{}'::jsonb),
  ('performance.daily', 'performance_advisor', 'Performance Advisor daily', 1440, 60, 'none', 'hybrid', 30, '{}'::jsonb),
  ('product.freshness', 'jeffery', 'Product layer evidence freshness', 720, 55, 'C', 'hybrid', 30, '{"touches": ["ingredient_snp_relevance","product_content"]}'::jsonb),
  ('watchdog.tick', 'jeffery', 'Jeffery watchdog', 15, 5, 'none', 'cron_tick', 10, '{}'::jsonb),
  ('jeffery.kb_review', 'jeffery', 'Jeffery KB bridge and fail-closed review (221A)', 15, 12, 'C', 'hybrid', 20, '{"bridge_limit": 12, "review_limit": 20}'::jsonb)
ON CONFLICT (job_key) DO UPDATE SET interval_minutes = EXCLUDED.interval_minutes, priority = EXCLUDED.priority, budget_class = EXCLUDED.budget_class, mechanism = EXCLUDED.mechanism, label = EXCLUDED.label, updated_at = now();

INSERT INTO public.freshness_targets (target_key, label, max_age_hours, domain) VALUES
  ('user_insights', 'User insight surfaces (accelerators, Personalized read, Hannah note)', 4, 'hannah'),
  ('domain_digests', 'Domain digests (Gordon/Arnold/Elysium/Thanos)', 1, 'digests'),
  ('gated_research', 'Newly gated research curated for agents', 24, 'research'),
  ('genetics_peptide_evidence', 'Genetics/peptide evidence refresh', 24, 'elysium_thanos'),
  ('product_layer', 'Product Genetic Compatibility / last-verified', 24, 'product')
ON CONFLICT (target_key) DO UPDATE SET max_age_hours = EXCLUDED.max_age_hours, label = EXCLUDED.label, updated_at = now();

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_capability_prefix ON public.pipeline_runs (run_id) WHERE run_id LIKE 'cap-%';

-- 219M: discovery_cursors (also in migration 20260816120000)
CREATE TABLE IF NOT EXISTS public.discovery_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL,
  topic_key text NOT NULL DEFAULT 'global',
  cursor_date text,
  cursor_timestamp timestamptz,
  cursor_version text,
  last_content_hash text,
  last_run_at timestamptz,
  last_run_status text,
  last_new_items integer NOT NULL DEFAULT 0,
  last_error text,
  new_items_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_key, topic_key)
);
CREATE INDEX IF NOT EXISTS idx_discovery_cursors_source ON public.discovery_cursors (source_key, last_run_at DESC);
ALTER TABLE public.discovery_cursors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS discovery_cursors_admin_read ON public.discovery_cursors;
CREATE POLICY discovery_cursors_admin_read ON public.discovery_cursors FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'));
ALTER TABLE public.agent_cadence_jobs ADD COLUMN IF NOT EXISTS scheduler_mechanism text;
ALTER TABLE public.agent_cadence_jobs ADD COLUMN IF NOT EXISTS cron_expression text;
ALTER TABLE public.agent_cadence_jobs ADD COLUMN IF NOT EXISTS invocation_target text;
INSERT INTO public.discovery_cursors (source_key, topic_key, cursor_date, last_run_status) VALUES
  ('pubmed', 'global', '2026-08-15', 'empty'),
  ('firecrawl_social', 'global', '2026-08-15', 'empty'),
  ('elysium_allowlist', 'global', '2026-08-15', 'empty'),
  ('thanos_allowlist', 'global', '2026-08-15', 'empty'),
  ('genomes_igsr', 'global', NULL, 'empty')
ON CONFLICT (source_key, topic_key) DO NOTHING;
`;

/**
 * 219M: store CRON secret for pg_cron HTTP invoke + schedule jobs.
 * Secret comes from process.env.CRON_SECRET at runtime (never committed).
 */
const EMBEDDED_219M_CRON_SQL = `
CREATE TABLE IF NOT EXISTS public.ops_internal_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE public.ops_internal_secrets FROM PUBLIC;
REVOKE ALL ON TABLE public.ops_internal_secrets FROM anon, authenticated;
ALTER TABLE public.ops_internal_secrets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.invoke_ops_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net, pg_temp
AS $$
DECLARE
  secret text;
  base_url text := 'https://www.viaconnectapp.com';
BEGIN
  SELECT s.value INTO secret
  FROM public.ops_internal_secrets s
  WHERE s.key = 'CRON_SECRET'
  LIMIT 1;

  IF secret IS NULL OR btrim(secret) = '' THEN
    BEGIN
      secret := nullif(current_setting('app.settings.cron_secret', true), '');
    EXCEPTION WHEN OTHERS THEN
      secret := null;
    END;
  END IF;

  IF secret IS NULL OR btrim(secret) = '' THEN
    RAISE WARNING 'invoke_ops_tick: CRON_SECRET not configured in ops_internal_secrets';
    RETURN;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := base_url || '/api/cron/ops-tick',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || secret
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 290000
    );
  EXCEPTION
    WHEN undefined_function THEN
      PERFORM extensions.http_post(
        url := base_url || '/api/cron/ops-tick',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || secret
        ),
        body := '{}'::jsonb
      );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_ops_tick() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_ops_tick() TO postgres;
GRANT EXECUTE ON FUNCTION public.invoke_ops_tick() TO service_role;
`;

export async function ensureContinuousOpsSchema(): Promise<{
  ok: boolean;
  applied: boolean;
  reason?: string;
}> {
  if (appliedThisProcess) return { ok: true, applied: false, reason: "already_applied_this_process" };

  const missing = await tablesMissing();
  const conn = buildConnectionString();
  if (!conn) {
    safeLog.warn("ops.ensureSchema", "no database connection string in env", {
      hasHost: Boolean(process.env.POSTGRES_HOST),
      hasPassword: Boolean(process.env.POSTGRES_PASSWORD),
      hasUrl: Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL),
      missing,
    });
    // Tables may already be present from a prior apply even without a re-connect.
    if (!missing) {
      appliedThisProcess = true;
      return { ok: true, applied: false, reason: "tables_present_no_conn" };
    }
    return { ok: false, applied: false, reason: "no_connection_string" };
  }

  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(conn, { max: 1, idle_timeout: 5, connect_timeout: 15 });
    try {
      // Always run full migration: CREATE IF NOT EXISTS + ON CONFLICT seed upsert.
      const ddl = loadMigrationSql();
      await sql.unsafe(ddl);

      // 219M cron + secret table
      await sql.unsafe(EMBEDDED_219M_CRON_SQL);
      const cronSecret = (process.env.CRON_SECRET ?? "").trim();
      if (cronSecret.length >= 8) {
        await sql`
          INSERT INTO public.ops_internal_secrets (key, value, updated_at)
          VALUES ('CRON_SECRET', ${cronSecret}, now())
          ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value, updated_at = now()
        `;
      } else {
        safeLog.warn("ops.ensureSchema", "CRON_SECRET env empty; pg_cron invoke will no-op until set");
      }

      // Schedule pg_cron jobs (idempotent unschedule)
      try {
        await sql.unsafe(`
          DO $$ BEGIN PERFORM cron.unschedule('viaconnect_ops_tick_15m'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
          SELECT cron.schedule('viaconnect_ops_tick_15m', '*/15 * * * *', $cron$ SELECT public.invoke_ops_tick(); $cron$);
          DO $$ BEGIN PERFORM cron.unschedule('viaconnect_ops_discovery_6h'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
          SELECT cron.schedule('viaconnect_ops_discovery_6h', '22 */6 * * *', $cron$ SELECT public.invoke_ops_tick(); $cron$);
        `);
        safeLog.info("ops.ensureSchema", "219M pg_cron jobs scheduled");
      } catch (cronErr) {
        safeLog.warn("ops.ensureSchema", "pg_cron schedule failed open", {
          error: cronErr instanceof Error ? cronErr.message : String(cronErr),
        });
      }

      const [{ n }] = await sql<{ n: number }[]>`
        select count(*)::int as n from public.agent_cadence_jobs
      `;
      let cursorN = 0;
      try {
        const rows = await sql<{ n: number }[]>`
          select count(*)::int as n from public.discovery_cursors
        `;
        cursorN = rows[0]?.n ?? 0;
      } catch {
        /* open */
      }
      appliedThisProcess = true;
      safeLog.info("ops.ensureSchema", "219H/219M schema applied", {
        bytes: ddl.length,
        cadenceRows: n,
        cursorRows: cursorN,
        cronSecretStored: cronSecret.length >= 8,
        wasMissing: missing,
      });
      return {
        ok: true,
        applied: true,
        reason: `cadence_rows=${n};cursors=${cursorN};cron_secret=${cronSecret.length >= 8}`,
      };
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (err) {
    safeLog.error("ops.ensureSchema", "apply failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    if (!missing) {
      appliedThisProcess = true;
      return {
        ok: true,
        applied: false,
        reason: `tables_present_apply_error:${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return {
      ok: false,
      applied: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
