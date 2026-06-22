/**
 * src/lib/kb/ruleKillswitch.ts
 *
 * Per-rule DB-backed kill switch for the SNP protocol rule engine.
 * Prompt 208a Module I Task I3 (2026-06-22).
 *
 * Provides:
 *   getKilledRuleIds  -- reads rule_killswitch where disabled = true; fail-open
 *                        (a DB error returns an EMPTY set so rules still flow).
 *   getActivePublishedRules -- wraps getPublishedRules, filtering out killed ids.
 *
 * FAIL-OPEN CONTRACT (critical):
 *   A killswitch-read failure must NOT hide all rules. On any error, getKilledRuleIds
 *   returns an empty Set, so getActivePublishedRules returns the full published set.
 *   This is the opposite of fail-closed -- we choose availability over suppression.
 *
 * Do NOT edit getPublishedRules. This file is additive.
 *
 * No em/en-dashes. No emojis. No new dependencies. No package.json changes.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { getPublishedRules } from '@/lib/kb/snpProtocolRules';
import type { SnpProtocolRule } from '@/lib/kb/snpProtocolRules';

// ---------------------------------------------------------------------------
// getKilledRuleIds
//
// Reads rule_killswitch where disabled = true. Returns a Set of rule_id strings.
//
// Fail-open: on any error (DB error, network failure, null data), safeLog the
// issue and return an EMPTY Set. An empty Set means no rules are killed, so all
// published rules continue to flow through synthesis. A killswitch-read failure
// must NOT suppress all rules.
// ---------------------------------------------------------------------------
export async function getKilledRuleIds(): Promise<Set<string>> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('rule_killswitch')
      .select('rule_id')
      .eq('disabled', true);

    if (error) {
      safeLog.warn('rule-killswitch', 'getKilledRuleIds: DB error; returning empty set (fail-open)', {
        error,
      });
      return new Set<string>();
    }

    if (!data) {
      safeLog.warn('rule-killswitch', 'getKilledRuleIds: null data; returning empty set (fail-open)');
      return new Set<string>();
    }

    const ids = (data as Array<{ rule_id: string }>)
      .map((row) => row.rule_id)
      .filter(Boolean);

    return new Set<string>(ids);
  } catch (err) {
    safeLog.error('rule-killswitch', 'getKilledRuleIds: threw; returning empty set (fail-open)', {
      err,
    });
    return new Set<string>();
  }
}

// ---------------------------------------------------------------------------
// getActivePublishedRules
//
// Wraps getPublishedRules (unchanged), filtering out any rule whose id appears
// in the killed set. Both calls run concurrently via Promise.all.
//
// Because getKilledRuleIds is fail-open (returns empty Set on error), a
// killswitch-read failure causes all published rules to pass through unchanged.
// ---------------------------------------------------------------------------
export async function getActivePublishedRules(): Promise<SnpProtocolRule[]> {
  const [rules, killed] = await Promise.all([
    getPublishedRules(),
    getKilledRuleIds(),
  ]);

  return rules.filter((r) => !killed.has(r.id));
}
