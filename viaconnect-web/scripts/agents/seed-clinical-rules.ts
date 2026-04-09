// =============================================================================
// seed-clinical-rules (Prompt #60 — Layer 5)
// =============================================================================
// Migrates the existing 25 rows from public.protocol_rules into the new
// public.ultrathink_clinical_rules table with default evidence scoring.
// IDEMPOTENT — uses ON CONFLICT (rule_id) DO UPDATE so re-runs are safe.
//
// Usage:  npx tsx scripts/agents/seed-clinical-rules.ts
//
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
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

// Map evidence_level text → numeric evidence_score (initial seed only;
// the rule-evolver Edge Function will update these from outcomes later)
function levelToScore(level: string | null | undefined): number {
  switch ((level ?? '').toLowerCase()) {
    case 'strong':    return 0.85;
    case 'moderate':  return 0.65;
    case 'emerging':  return 0.45;
    default:          return 0.50;
  }
}

(async () => {
  console.log('Reading existing protocol_rules...');
  const { data: rules, error } = await db
    .from('protocol_rules')
    .select('*')
    .order('rule_id');
  if (error) {
    console.error('Failed to read protocol_rules:', error.message);
    process.exit(1);
  }
  console.log(`Found ${rules?.length ?? 0} source rules`);

  let inserted = 0, updated = 0;
  for (const r of rules ?? []) {
    const evidence_score = levelToScore(r.evidence_level);
    const row = {
      rule_id:              r.rule_id,
      rule_name:            r.rule_name,
      trigger_type:         r.trigger_type,
      trigger_field:        r.trigger_field,
      trigger_operator:     r.trigger_operator,
      trigger_value:        r.trigger_value,
      product_name:         r.product_name,
      product_category:     r.product_category,
      delivery_form:        r.delivery_form,
      dosage:               r.dosage,
      frequency:            r.frequency,
      timing:               r.timing,
      rationale_template:   r.rationale_template,
      health_signals:       r.health_signals_template,
      bioavailability_note: r.bioavailability_note,
      evidence_level:       r.evidence_level ?? 'moderate',
      evidence_score,
      outcome_score:        null,
      outcome_n:            0,
      source_rule_table:    'protocol_rules',
      is_active:            r.is_active ?? true,
    };

    // Check if exists
    const { data: existing } = await db
      .from('ultrathink_clinical_rules')
      .select('id')
      .eq('rule_id', r.rule_id)
      .maybeSingle();

    if (existing) {
      const { error: e } = await db.from('ultrathink_clinical_rules').update(row).eq('id', existing.id);
      if (!e) updated++;
      else console.error(`update ${r.rule_id} failed:`, e.message);
    } else {
      const { error: e } = await db.from('ultrathink_clinical_rules').insert(row);
      if (!e) inserted++;
      else console.error(`insert ${r.rule_id} failed:`, e.message);
    }
  }

  console.log(`\nSeed complete: ${inserted} inserted, ${updated} updated`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
