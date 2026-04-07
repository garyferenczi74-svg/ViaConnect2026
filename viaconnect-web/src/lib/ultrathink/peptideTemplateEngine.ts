/**
 * Peptide Template Engine — Zero-Cost Protocol Generation
 * Replaces runtime Claude API calls with deterministic template lookup.
 * $0 per stack · <300ms response · 100% reliability
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { UltrathinkContext } from './buildContext';
import { DetectedPattern } from './patternDetection';

interface PeptideRecommendation {
  rank: number;
  priority: 'high' | 'medium' | 'low';
  peptide_name: string;
  delivery_form: string;
  dosage: string;
  frequency: string;
  cycle_on_weeks: number | null;
  cycle_off_weeks: number | null;
  timing: string[];
  rationale: string;
  target_patterns: string[];
  mechanism: string | null;
  evidence_level: string;
  interaction_check: string;
  contraindications: string[];
  synergy_with: string[];
  requires_supervision: boolean;
}

interface GeneratedPeptideStack {
  stack_narrative: string;
  protocol_rationale: string;
  recommendations: PeptideRecommendation[];
}

const MAX_PEPTIDES = 4;
const BLOCKED_PEPTIDES = ['semaglutide'];

// ── Stacking Rules (hard-coded, not overrideable) ───────────────────────────

function enforceStackingRules(recs: PeptideRecommendation[]): PeptideRecommendation[] {
  let result = [...recs];

  // Block Semaglutide
  result = result.filter(r => !BLOCKED_PEPTIDES.includes(r.peptide_name.toLowerCase()));

  // Retatrutide: solo protocol — if present, remove everything else
  const hasRetatrutide = result.some(r => r.peptide_name.includes('Retatrutide'));
  if (hasRetatrutide) {
    result = result.filter(r => r.peptide_name.includes('Retatrutide'));
    result[0].interaction_check = 'solo_protocol';
    result[0].requires_supervision = true;
    return result.slice(0, 1);
  }

  // Ipamorelin + CJC-1295: always paired
  const hasIpamorelin = result.some(r => r.peptide_name === 'Ipamorelin');
  const hasCJC = result.some(r => r.peptide_name.includes('CJC-1295'));
  if (hasIpamorelin && !hasCJC) {
    result.push({
      rank: result.length + 1, priority: 'high', peptide_name: 'CJC-1295 (No DAC)',
      delivery_form: 'Injectable', dosage: '100mcg', frequency: 'three times daily',
      cycle_on_weeks: 12, cycle_off_weeks: 4, timing: ['morning', 'afternoon', 'before_bed'],
      rationale: 'CJC-1295 is always stacked with Ipamorelin for synergistic GH pulse amplification via dual receptor pathway activation.',
      target_patterns: ['hormonal_imbalance'], mechanism: 'GHRH analog — synergistic with Ipamorelin',
      evidence_level: 'established', interaction_check: 'safe', contraindications: [],
      synergy_with: ['Ipamorelin'], requires_supervision: true,
    });
  } else if (hasCJC && !hasIpamorelin) {
    result.push({
      rank: result.length + 1, priority: 'high', peptide_name: 'Ipamorelin',
      delivery_form: 'Injectable', dosage: '200mcg', frequency: 'three times daily',
      cycle_on_weeks: 12, cycle_off_weeks: 4, timing: ['morning', 'afternoon', 'before_bed'],
      rationale: 'Ipamorelin is always stacked with CJC-1295 for synergistic GH release — selective GHRP without cortisol spike.',
      target_patterns: ['hormonal_imbalance'], mechanism: 'Selective GHRP — clean GH pulse',
      evidence_level: 'established', interaction_check: 'safe', contraindications: [],
      synergy_with: ['CJC-1295 (No DAC)'], requires_supervision: true,
    });
  }

  // Enforce Tier 2/3 supervision
  result = result.map(r => {
    if (r.peptide_name.includes('Thymosin Alpha') || r.peptide_name.includes('Ipamorelin') ||
        r.peptide_name.includes('CJC-1295') || r.peptide_name.includes('Tesamorelin') ||
        r.peptide_name.includes('PT-141') || r.peptide_name.includes('Cerebrolysin') ||
        r.peptide_name.includes('Dihexa') || r.peptide_name.includes('Retatrutide') ||
        r.peptide_name.includes('FR-Alpha') || r.peptide_name.includes('CDK5') ||
        r.peptide_name.includes('GHK-Cu Injectable') || r.peptide_name.includes('Tesofensine') ||
        r.peptide_name.includes('KPV')) {
      return { ...r, requires_supervision: true };
    }
    return r;
  });

  // Truncate to max 4 peptides
  result = result.slice(0, MAX_PEPTIDES);

  // Re-rank
  return result.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ── Pattern Key Builder ─────────────────────────────────────────────────────

function buildPatternKey(patterns: DetectedPattern[]): string {
  return patterns.map(p => p.id).sort().join('+');
}

function buildSubsetKeys(patterns: DetectedPattern[]): string[] {
  const sorted = patterns.sort((a, b) => b.confidence - a.confidence);
  const keys: string[] = [];
  // 2-pattern subsets (by highest confidence pairs)
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      keys.push([sorted[i].id, sorted[j].id].sort().join('+'));
    }
  }
  return keys;
}

// ── Template Lookup with 4-Level Fallback ───────────────────────────────────

async function lookupTemplate(
  supabase: SupabaseClient,
  patterns: DetectedPattern[]
): Promise<{ pattern_key: string; narrative_template: string; rationale_template: string; recommendations: any[] } | null> {
  const exactKey = buildPatternKey(patterns);

  // Level 1: Exact match
  const { data: exact } = await supabase
    .from('peptide_stack_templates')
    .select('pattern_key, narrative_template, rationale_template, recommendations')
    .eq('pattern_key', exactKey)
    .limit(1)
    .single();
  if (exact) return exact;

  // Level 2: Best 2-pattern subset
  if (patterns.length > 2) {
    const subsetKeys = buildSubsetKeys(patterns);
    for (const key of subsetKeys) {
      const { data: subset } = await supabase
        .from('peptide_stack_templates')
        .select('pattern_key, narrative_template, rationale_template, recommendations')
        .eq('pattern_key', key)
        .limit(1)
        .single();
      if (subset) return subset;
    }
  }

  // Level 3: Single dominant pattern
  const dominant = patterns.sort((a, b) => b.confidence - a.confidence)[0];
  if (dominant) {
    const { data: single } = await supabase
      .from('peptide_stack_templates')
      .select('pattern_key, narrative_template, rationale_template, recommendations')
      .eq('pattern_key', dominant.id)
      .limit(1)
      .single();
    if (single) return single;
  }

  // Level 4: General catch-all
  const { data: general } = await supabase
    .from('peptide_stack_templates')
    .select('pattern_key, narrative_template, rationale_template, recommendations')
    .eq('pattern_key', 'general_optimization')
    .limit(1)
    .single();
  return general;
}

// ── Field Substitution ──────────────────────────────────────────────────────

function substituteFields(text: string, ctx: UltrathinkContext, patterns: DetectedPattern[]): string {
  const avgConfidence = patterns.length > 0
    ? Math.round(patterns.reduce((sum, p) => sum + p.confidence * 100, 0) / patterns.length)
    : 0;

  return text
    .replace(/\{\{confidence\}\}/g, String(avgConfidence))
    .replace(/\{\{user_age\}\}/g, String(ctx.demographics.age ?? '?'))
    .replace(/\{\{user_sex\}\}/g, ctx.demographics.sex ?? '?')
    .replace(/\{\{stress_level\}\}/g, String(ctx.lifestyle.stressLevel ?? '?'))
    .replace(/\{\{sleep_hours\}\}/g, String(ctx.lifestyle.sleepHours ?? '?'))
    .replace(/\{\{bio_score\}\}/g, String(ctx.bioScore ?? '?'))
    .replace(/\{\{confidence_tier\}\}/g,
      ctx.confidenceTier === 1 ? 'Tier 1 — CAQ Analysis'
      : ctx.confidenceTier === 2 ? 'Tier 2 — CAQ + Labs'
      : 'Tier 3 — Full Genomic')
    .replace(/\{\{primary_goal\}\}/g, patterns.map(p => p.label).join(' & '))
    .replace(/\{\{protocol_date\}\}/g, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
}

// ── Check for Retatrutide Solo Protocol ─────────────────────────────────────

function shouldUseRetatrutideSolo(ctx: UltrathinkContext): boolean {
  // labValues is an optional bag not declared on UltrathinkContext yet — keep
  // the read tolerant via any cast until the context type is extended.
  const hba1c = (ctx as any).labValues?.hba1c;
  return typeof hba1c === 'number' && hba1c > 6.5;
}

// ── Main Entry Point ────────────────────────────────────────────────────────

export async function generatePeptideStackFromTemplate(
  ctx: UltrathinkContext,
  patterns: DetectedPattern[],
  supabase: SupabaseClient
): Promise<GeneratedPeptideStack | null> {
  if (patterns.length === 0) return null;

  // Check for Retatrutide solo protocol
  let templateKey = shouldUseRetatrutideSolo(ctx) ? 'metabolic_dysregulation_retatrutide' : null;

  let template;
  if (templateKey) {
    const { data } = await supabase
      .from('peptide_stack_templates')
      .select('pattern_key, narrative_template, rationale_template, recommendations')
      .eq('pattern_key', templateKey)
      .limit(1)
      .single();
    template = data;
  }

  // Normal 4-level fallback lookup
  if (!template) {
    template = await lookupTemplate(supabase, patterns);
  }

  if (!template) return null;

  // Parse recommendations from template
  const rawRecs: any[] = Array.isArray(template.recommendations)
    ? template.recommendations
    : JSON.parse(template.recommendations ?? '[]');

  // Substitute fields in rationale text for each recommendation
  const recommendations: PeptideRecommendation[] = rawRecs.map(r => ({
    ...r,
    rationale: substituteFields(r.rationale || r.rationale_template || '', ctx, patterns),
  }));

  // Enforce stacking rules (hard limits)
  const finalRecs = enforceStackingRules(recommendations);

  // Substitute fields in narrative and rationale
  const stack_narrative = substituteFields(template.narrative_template, ctx, patterns);
  const protocol_rationale = substituteFields(template.rationale_template, ctx, patterns);

  return { stack_narrative, protocol_rationale, recommendations: finalRecs };
}
