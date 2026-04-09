// =============================================================================
// seed-agent-registry (Prompt #60 v2 — Layer 1)
// =============================================================================
// Registers all 17 known platform agents in public.ultrathink_agent_registry.
// IDEMPOTENT — uses ON CONFLICT (agent_name) DO UPDATE so re-runs are safe.
//
// Each agent has:
//   - tier (1=safety/2=data/3=enrichment/4=optimization)
//   - runtime_kind (edge_function | pg_cron | request_time | table | external)
//   - expected_period_minutes (how often it should heartbeat; null = on-demand)
//   - health_check_query — SQL fragment that returns >=1 row when healthy
//
// The orchestrator's ultrathink_agent_health_sweep RPC runs every 10 min and
// updates health_status across the fleet based on these queries + the
// last_heartbeat_at column.
//
// Usage:  npx tsx scripts/agents/seed-agent-registry.ts
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

interface AgentDef {
  agent_name: string;
  display_name: string;
  origin_prompt: string;
  agent_type: 'data'|'safety'|'scoring'|'analytics'|'infra'|'engagement'|'protocol'|'research'|'ai'|'learning'|'perf'|'control';
  tier: 1 | 2 | 3 | 4;
  description: string;
  reports: string;
  runtime_kind: 'edge_function'|'pg_cron'|'request_time'|'table'|'external';
  runtime_handle: string;
  expected_period_minutes: number | null;
  health_check_query: string;
  is_critical: boolean;
}

const AGENTS: AgentDef[] = [
  // ── Tier 1: SAFETY (critical, never paused) ─────────────────────────
  { agent_name: 'interaction_engine', display_name: 'Interaction Engine', origin_prompt: '#16/#37', agent_type: 'safety', tier: 1, description: 'Drug-supplement interaction checking', reports: 'contraindications', runtime_kind: 'table', runtime_handle: 'public.interaction_rules', expected_period_minutes: null, health_check_query: "SELECT 1 FROM public.interaction_rules WHERE is_active = true LIMIT 1", is_critical: true },
  { agent_name: 'medical_interactions', display_name: 'Medical Interactions', origin_prompt: '#49', agent_type: 'safety', tier: 1, description: 'Real-time medication interaction checks', reports: 'interaction_data', runtime_kind: 'table', runtime_handle: 'public.medication_interactions', expected_period_minutes: null, health_check_query: "SELECT 1 FROM public.medication_interactions LIMIT 1", is_critical: true },
  { agent_name: 'ultrathink_fda_ingest', display_name: 'FDA Adverse Events Ingest', origin_prompt: '#60', agent_type: 'safety', tier: 1, description: 'Pulls FDA adverse event reports', reports: 'safety_knowledge', runtime_kind: 'edge_function', runtime_handle: 'ultrathink-fda-ingest', expected_period_minutes: 1440, health_check_query: "SELECT 1 FROM public.ultrathink_sync_log WHERE source='openfda' AND created_at > now() - interval '2 days' LIMIT 1", is_critical: true },
  { agent_name: 'ultrathink_orchestrator', display_name: 'Ultrathink Orchestrator', origin_prompt: '#60', agent_type: 'control', tier: 1, description: 'Master controller coordinating all platform agents', reports: 'platform_health', runtime_kind: 'edge_function', runtime_handle: 'ultrathink-orchestrator', expected_period_minutes: 10, health_check_query: "SELECT 1 FROM public.ultrathink_sync_log WHERE source='orchestrator' AND created_at > now() - interval '20 minutes' LIMIT 1", is_critical: true },

  // ── Tier 2: DATA / RESEARCH (always-on) ─────────────────────────────
  { agent_name: 'search_agent', display_name: 'Search Agent', origin_prompt: '#36', agent_type: 'data', tier: 2, description: 'Product search via supplement_search_index + pg_trgm', reports: 'product_discovery', runtime_kind: 'table', runtime_handle: 'public.supplement_search_index', expected_period_minutes: null, health_check_query: "SELECT 1 FROM public.supplement_search_index WHERE is_active = true LIMIT 1", is_critical: false },
  { agent_name: 'brand_enricher', display_name: 'Brand Enricher', origin_prompt: '#59', agent_type: 'data', tier: 2, description: '4-source brand product enrichment', reports: 'products_pricing', runtime_kind: 'edge_function', runtime_handle: 'brand-enricher', expected_period_minutes: 10, health_check_query: "SELECT 1 FROM public.brand_agent_log WHERE created_at > now() - interval '2 hours' LIMIT 1", is_critical: false },
  { agent_name: 'unified_data_ecosystem', display_name: 'Unified Data Ecosystem', origin_prompt: '#17b', agent_type: 'infra', tier: 2, description: 'Cross-engine data event bus', reports: 'data_events', runtime_kind: 'table', runtime_handle: 'public.data_events', expected_period_minutes: null, health_check_query: "SELECT 1 FROM public.data_events WHERE created_at > now() - interval '7 days' LIMIT 1", is_critical: false },
  { agent_name: 'ultrathink_pubmed_ingest', display_name: 'PubMed Ingest', origin_prompt: '#60', agent_type: 'research', tier: 2, description: 'PubMed E-utils supplement abstracts', reports: 'evidence_entries', runtime_kind: 'edge_function', runtime_handle: 'ultrathink-pubmed-ingest', expected_period_minutes: 360, health_check_query: "SELECT 1 FROM public.ultrathink_sync_log WHERE source='pubmed' AND created_at > now() - interval '12 hours' LIMIT 1", is_critical: false },
  { agent_name: 'ultrathink_clinicaltrials_ingest', display_name: 'ClinicalTrials.gov Ingest', origin_prompt: '#60', agent_type: 'research', tier: 2, description: 'Active supplement/peptide trials', reports: 'trial_data', runtime_kind: 'edge_function', runtime_handle: 'ultrathink-clinicaltrials-ingest', expected_period_minutes: 1440, health_check_query: "SELECT 1 FROM public.ultrathink_sync_log WHERE source='clinicaltrials_gov' AND created_at > now() - interval '2 days' LIMIT 1", is_critical: false },

  // ── Tier 3: ENRICHMENT / SCORING / AI ───────────────────────────────
  { agent_name: 'bio_optimization', display_name: 'Bio Optimization', origin_prompt: '#17', agent_type: 'scoring', tier: 3, description: 'Daily Bio Optimization score calculation', reports: 'score_trends', runtime_kind: 'table', runtime_handle: 'public.bio_optimization_history', expected_period_minutes: 1440, health_check_query: "SELECT 1 FROM public.bio_optimization_history WHERE date > now() - interval '7 days' LIMIT 1", is_critical: false },
  { agent_name: 'ai_wellness_analytics', display_name: 'AI Wellness Analytics', origin_prompt: '#17a', agent_type: 'analytics', tier: 3, description: 'Category recalculation & health trends', reports: 'health_trends', runtime_kind: 'table', runtime_handle: 'public.wellness_analytics', expected_period_minutes: 1440, health_check_query: "SELECT 1 FROM public.wellness_analytics LIMIT 1", is_critical: false },
  { agent_name: 'helix_rewards', display_name: 'Helix Rewards', origin_prompt: '#20', agent_type: 'engagement', tier: 3, description: 'Gamification + adherence rewards', reports: 'adherence_rates', runtime_kind: 'table', runtime_handle: 'public.helix_balances', expected_period_minutes: null, health_check_query: "SELECT 1 FROM public.helix_tiers LIMIT 1", is_critical: false },
  { agent_name: 'ultrathink_knowledge_processor', display_name: 'Knowledge Processor', origin_prompt: '#60', agent_type: 'ai', tier: 3, description: 'Extracts structured facts from research_feed', reports: 'knowledge_entries', runtime_kind: 'edge_function', runtime_handle: 'ultrathink-knowledge-processor', expected_period_minutes: 10, health_check_query: "SELECT 1 FROM public.ultrathink_sync_log WHERE source='knowledge_processor' AND created_at > now() - interval '1 hour' LIMIT 1", is_critical: false },
  { agent_name: 'ultrathink_outcome_collector', display_name: 'Outcome Collector', origin_prompt: '#60', agent_type: 'learning', tier: 3, description: 'Collects 30/60-day Bio Score deltas (anonymized)', reports: 'outcome_data', runtime_kind: 'edge_function', runtime_handle: 'ultrathink-outcome-collector', expected_period_minutes: 360, health_check_query: "SELECT 1 FROM public.ultrathink_sync_log WHERE source='outcome_collector' AND created_at > now() - interval '12 hours' LIMIT 1", is_critical: false },

  // ── Tier 4: OPTIMIZATION (perf, evolution) ──────────────────────────
  { agent_name: 'zero_cost_protocol', display_name: 'Zero-Cost Protocol Generator', origin_prompt: '#40b', agent_type: 'protocol', tier: 4, description: 'Deterministic rule-based fallback protocol generator', reports: 'fallback_patterns', runtime_kind: 'request_time', runtime_handle: '/api/ultrathink/recommend (rule path)', expected_period_minutes: null, health_check_query: "SELECT 1 FROM public.protocol_rules WHERE is_active = true LIMIT 1", is_critical: false },
  { agent_name: 'ultrathink_cache_builder', display_name: 'Pattern Cache Builder', origin_prompt: '#60', agent_type: 'perf', tier: 4, description: 'Pre-computes protocols for common patterns', reports: 'cache_hit_rates', runtime_kind: 'edge_function', runtime_handle: 'ultrathink-cache-builder', expected_period_minutes: 1440, health_check_query: "SELECT 1 FROM public.ultrathink_sync_log WHERE source='cache_builder' AND created_at > now() - interval '2 days' LIMIT 1", is_critical: false },
  { agent_name: 'ultrathink_rule_evolver', display_name: 'Clinical Rule Evolver', origin_prompt: '#60', agent_type: 'ai', tier: 4, description: 'Updates clinical rule scores from outcomes; deprecates losers', reports: 'rule_lifecycle', runtime_kind: 'edge_function', runtime_handle: 'ultrathink-rule-evolver', expected_period_minutes: 10080, health_check_query: "SELECT 1 FROM public.ultrathink_sync_log WHERE source='rule_evolver' AND created_at > now() - interval '14 days' LIMIT 1", is_critical: false },
];

(async () => {
  let inserted = 0, updated = 0;
  for (const a of AGENTS) {
    const { data: existing } = await db.from('ultrathink_agent_registry').select('id').eq('agent_name', a.agent_name).maybeSingle();
    if (existing) {
      const { error } = await db.from('ultrathink_agent_registry').update({ ...a, is_active: true, updated_at: new Date().toISOString() }).eq('id', existing.id);
      if (!error) updated++;
      else console.error(`update ${a.agent_name}:`, error.message);
    } else {
      const { error } = await db.from('ultrathink_agent_registry').insert({ ...a, is_active: true });
      if (!error) inserted++;
      else console.error(`insert ${a.agent_name}:`, error.message);
    }
  }
  console.log(`Agents registered: ${inserted} inserted, ${updated} updated`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
