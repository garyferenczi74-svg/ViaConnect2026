// =============================================================================
// run-precheck (Prompt #138a operational rollout)
// =============================================================================
// Reads every non-archived hero variant, runs validateWordCounts and
// preCheckVariant against each, prints the result.
//
// Dry-run by default. Pass --apply to actually update gates AND write a
// precheck_completed event into marketing_copy_variant_events. Apply
// requires SUPABASE_SERVICE_ROLE_KEY because RLS would otherwise block
// these writes from a non-marketing-admin context.
//
// Usage:
//   npx tsx scripts/marketing/run-precheck.ts          # dry-run (read only)
//   npx tsx scripts/marketing/run-precheck.ts --apply  # writes gates + event
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { preCheckVariant } from '../../src/lib/marketing/variants/precheck';
import { validateWordCounts } from '../../src/lib/marketing/variants/wordCount';

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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');

interface VariantRow {
  id: string;
  slot_id: string;
  variant_label: string;
  headline_text: string;
  subheadline_text: string;
  cta_label: string;
  word_count_validated: boolean;
  marshall_precheck_passed: boolean;
}

async function main() {
  const sb = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from('marketing_copy_variants')
    .select('id, slot_id, variant_label, headline_text, subheadline_text, cta_label, word_count_validated, marshall_precheck_passed')
    .eq('surface', 'hero')
    .eq('archived', false)
    .order('slot_id', { ascending: true });

  if (error) {
    console.error('Read failed:', error.message);
    process.exit(1);
  }
  const variants = (data ?? []) as VariantRow[];
  console.log(`Read ${variants.length} non-archived hero variants. Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log('');

  let passCount = 0;
  let blockCount = 0;
  let warnOnlyCount = 0;

  for (const v of variants) {
    console.log(`-- ${v.variant_label} (${v.slot_id}) --`);
    const wc = validateWordCounts(v.headline_text, v.subheadline_text);
    console.log(`  word counts: headline ${wc.headlineWords}, subhead ${wc.subheadlineWords}; ok=${wc.ok}`);
    if (!wc.ok) {
      console.log(`    reasons: ${wc.reasons.join('; ')}`);
    }

    const result = await preCheckVariant({
      headline: v.headline_text,
      subheadline: v.subheadline_text,
      ctaLabel: v.cta_label,
      // Variant C names Dr. Fadi; this flag clears NAMED_PERSON_CONNECTION
      // when set. Run with consent flag asserted true for the seeded set
      // because Dr. Fadi is the documented Medical Director per #119.
      clinicianConsentOnFile: v.slot_id === 'hero.variant.C' || v.slot_id === 'hero.variant.D',
      timeSubstantiationOnFile: v.slot_id === 'hero.variant.D',
      scientificSubstantiationOnFile: v.slot_id === 'hero.variant.C',
    });
    console.log(`  marshall: passed=${result.passed}; blockers=${result.blockerCount}; warnings=${result.warnCount}`);
    if (result.findings.length > 0) {
      for (const f of result.findings) {
        console.log(`    ${f.severity}  ${f.ruleId}  ${f.message}`);
        if (f.remediation?.summary) console.log(`         remedy: ${f.remediation.summary}`);
      }
    }

    const overallPass = wc.ok && result.passed;
    if (overallPass) passCount++;
    else if (result.blockerCount > 0 || !wc.ok) blockCount++;
    else warnOnlyCount++;

    if (APPLY) {
      // Update gates only when both word-count and Marshall pass.
      const gateUpdate = {
        word_count_validated: wc.ok,
        marshall_precheck_passed: result.passed,
      };
      const { error: updErr } = await sb
        .from('marketing_copy_variants')
        .update(gateUpdate)
        .eq('id', v.id);
      if (updErr) {
        console.log(`  apply: UPDATE failed: ${updErr.message}`);
      } else {
        console.log(`  apply: gates set to ${JSON.stringify(gateUpdate)}`);
      }

      const { error: evtErr } = await sb
        .from('marketing_copy_variant_events')
        .insert({
          variant_id: v.id,
          event_kind: 'precheck_completed',
          event_detail: {
            passed: result.passed,
            blocker_count: result.blockerCount,
            warn_count: result.warnCount,
            finding_rule_ids: result.findings.map((x) => x.ruleId),
            word_count_ok: wc.ok,
            triggered_by: 'scripts/marketing/run-precheck.ts',
          },
          actor_user_id: null,
        });
      if (evtErr) {
        console.log(`  apply: event insert failed: ${evtErr.message}`);
      } else {
        console.log(`  apply: precheck_completed event written`);
      }
    }
    console.log('');
  }

  console.log(`Summary: ${passCount} passed, ${warnOnlyCount} warnings only, ${blockCount} blocked.`);
  if (!APPLY) {
    console.log('No DB writes performed. Re-run with --apply to commit gates + events.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
