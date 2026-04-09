// =============================================================================
// register-data-feeds (Prompt #60 — Layer 2)
// =============================================================================
// Registers all 12 external data sources in public.ultrathink_data_feeds.
// IDEMPOTENT — uses upsert on (source).
//
// Cost tiers (initial; orchestrator enforces):
//   free       → no spend tracking
//   credits    → external API budget you've separately funded (Bright Data)
//   claude_api → Anthropic Sonnet bulk ingestion ($0.003/1k input tokens)
//   paid_api   → not yet used
//
// Schedules expressed as standard cron in UTC. Orchestrator dispatches when
// next_run_at <= now() AND today's spend < daily_budget.
//
// Usage:  npx tsx scripts/agents/register-data-feeds.ts
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  try {
    const txt = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface FeedDef {
  source: string;
  display_name: string;
  base_url: string | null;
  schedule_cron: string;
  cost_tier: 'free' | 'credits' | 'claude_api' | 'paid_api';
  cost_per_run_usd: number;
  daily_budget_usd: number;
  notes?: string;
}

const FEEDS: FeedDef[] = [
  // ── Phase 1 — implemented in this build ─────────────────────────────
  { source: 'pubmed',
    display_name: 'PubMed / NCBI E-utils',
    base_url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
    schedule_cron: '7 */6 * * *',
    cost_tier: 'free',
    cost_per_run_usd: 0,
    daily_budget_usd: 0,
    notes: 'Free public API; respects 3 req/sec rate limit. No API key required.' },

  { source: 'clinicaltrials_gov',
    display_name: 'ClinicalTrials.gov v2',
    base_url: 'https://clinicaltrials.gov/api/v2',
    schedule_cron: '11 2 * * *',
    cost_tier: 'free',
    cost_per_run_usd: 0,
    daily_budget_usd: 0,
    notes: 'Free public API. Pulls supplement/peptide-related trials daily.' },

  { source: 'openfda',
    display_name: 'openFDA Drug Adverse Events',
    base_url: 'https://api.fda.gov',
    schedule_cron: '13 4 * * *',
    cost_tier: 'free',
    cost_per_run_usd: 0,
    daily_budget_usd: 0,
    notes: 'Free public API. 240 req/min, 1000 req/day without key. Add API key in env for higher quota.' },

  // ── Phase 2 — registered but ingest function deferred ──────────────
  { source: 'dsld',
    display_name: 'DSLD (NIH Dietary Supplement Label DB)',
    base_url: 'https://api.ods.od.nih.gov/dsld/v9',
    schedule_cron: '17 6 * * 0',
    cost_tier: 'free',
    cost_per_run_usd: 0,
    daily_budget_usd: 0,
    notes: 'Already used by brand-enricher. Phase 2: dedicated knowledge ingest function.' },

  { source: 'openfoodfacts',
    display_name: 'OpenFoodFacts',
    base_url: 'https://world.openfoodfacts.org',
    schedule_cron: '19 6 * * 0',
    cost_tier: 'free',
    cost_per_run_usd: 0,
    daily_budget_usd: 0,
    notes: 'Already used by brand-enricher. Phase 2 ingest function pending.' },

  { source: 'bright_data',
    display_name: 'Bright Data / Amazon (via bright-api Edge Function)',
    base_url: null,
    schedule_cron: '23 5 * * *',
    cost_tier: 'credits',
    cost_per_run_usd: 0.05,
    daily_budget_usd: 5,
    notes: 'WARNING: bright-api Edge Function is currently a stub (its source is the literal string "send-otp"). Ingest function deferred until bright-api is implemented for real.' },

  { source: 'examine',
    display_name: 'Examine.com (research summaries via Claude scraping)',
    base_url: 'https://examine.com',
    schedule_cron: '29 7 * * 1',
    cost_tier: 'claude_api',
    cost_per_run_usd: 0.50,
    daily_budget_usd: 5,
    notes: 'Uses Claude Sonnet to fetch + summarize Examine pages. Requires ANTHROPIC_API_KEY.' },

  { source: 'consumerlab',
    display_name: 'ConsumerLab.com (product testing summaries via Claude)',
    base_url: 'https://consumerlab.com',
    schedule_cron: '31 7 * * 2',
    cost_tier: 'claude_api',
    cost_per_run_usd: 0.50,
    daily_budget_usd: 5,
    notes: 'Same Claude pattern as Examine. Phase 2.' },

  { source: 'nih_ods',
    display_name: 'NIH Office of Dietary Supplements RDA fact sheets',
    base_url: 'https://ods.od.nih.gov',
    schedule_cron: '37 8 1 * *',
    cost_tier: 'free',
    cost_per_run_usd: 0,
    daily_budget_usd: 0,
    notes: 'Monthly RDA/UL refresh into ultrathink_nutrient_rda. Phase 2.' },

  { source: 'cochrane',
    display_name: 'Cochrane Reviews',
    base_url: 'https://www.cochranelibrary.com',
    schedule_cron: '41 8 15 * *',
    cost_tier: 'free',
    cost_per_run_usd: 0,
    daily_budget_usd: 0,
    notes: 'Monthly review refresh via RSS. Phase 2.' },

  { source: 'drugbank',
    display_name: 'DrugBank (free tier — supplement-drug interactions)',
    base_url: 'https://go.drugbank.com',
    schedule_cron: '43 9 * * 3',
    cost_tier: 'free',
    cost_per_run_usd: 0,
    daily_budget_usd: 0,
    notes: 'Free tier requires academic registration. Phase 2.' },

  { source: 'viaconnect_internal',
    display_name: 'ViaConnect Internal (own platform signals)',
    base_url: null,
    schedule_cron: '*/30 * * * *',
    cost_tier: 'free',
    cost_per_run_usd: 0,
    daily_budget_usd: 0,
    notes: 'Mirrors outcome data from ultrathink_outcome_tracker into knowledge base. Real-time.' },
];

(async () => {
  let inserted = 0, updated = 0;
  for (const f of FEEDS) {
    const { data: existing } = await db
      .from('ultrathink_data_feeds')
      .select('id')
      .eq('source', f.source)
      .maybeSingle();

    const row = {
      ...f,
      is_active: true,
      next_run_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await db.from('ultrathink_data_feeds')
        .update({
          display_name:     row.display_name,
          base_url:         row.base_url,
          schedule_cron:    row.schedule_cron,
          cost_tier:        row.cost_tier,
          cost_per_run_usd: row.cost_per_run_usd,
          daily_budget_usd: row.daily_budget_usd,
          notes:            row.notes,
          is_active:        true,
          updated_at:       new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (!error) updated++;
      else console.error(`update ${f.source}:`, error.message);
    } else {
      const { error } = await db.from('ultrathink_data_feeds').insert(row);
      if (!error) inserted++;
      else console.error(`insert ${f.source}:`, error.message);
    }
  }
  console.log(`Feeds registered: ${inserted} inserted, ${updated} updated`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
