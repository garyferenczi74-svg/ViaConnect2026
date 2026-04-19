// Prompt #95 Phase 2: DB-backed classifier wrapper.
// Loads active decision_rights_rules from Supabase and delegates to the
// pure classifyProposalPure. Used by the Phase 3 proposal builder to
// render a live classification preview.

import { createClient } from '@/lib/supabase/server';
import {
  asClassifierRule,
  classifyProposalPure,
  type ClassifyInput,
} from '@/lib/governance/classify-proposal';
import type {
  ClassificationResult,
  DecisionRightsRuleRow,
} from '@/types/governance';

export async function classifyWithRules(
  params: ClassifyInput,
): Promise<ClassificationResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('decision_rights_rules')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw new Error(`Failed to load decision_rights_rules: ${error.message}`);

  const rules = ((data ?? []) as DecisionRightsRuleRow[]).map(asClassifierRule);
  return classifyProposalPure(params, rules);
}
