import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildUltrathinkContext, UltrathinkContext, SymptomEntry } from '@/lib/ultrathink/buildContext';
import { detectPatterns } from '@/lib/ultrathink/patternDetection';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type ProtocolRuleRow = Database['public']['Tables']['protocol_rules']['Row'];

interface TriggeredRule extends ProtocolRuleRow {
  rationale: string;
  health_signals: string[];
  contraindications?: string[];
  synergy_with?: string[];
}

/** Extended context with optional future data sources (lab values, genetics). */
interface ExtendedContext extends UltrathinkContext {
  labValues?: Record<string, string | number>;
  genetics?: Record<string, string>;
}

export const dynamic = 'force-dynamic';

// Normalize a product name for cross-table matching: strip the ™ symbol
// (protocol_rules has it; product_catalog does not) and lowercase/trim.
function productMatchKey(name: string | null | undefined): string {
  return (name ?? '').replace(/[™®]/g, '').trim().toLowerCase();
}

type RecRow = Record<string, unknown> & {
  product?: string | null;
  farmceutica_product?: string | null;
  image_url?: string | null;
};

async function attachImageUrls(
  supabase: SupabaseClient<Database>,
  recommendations: RecRow[],
): Promise<void> {
  if (recommendations.length === 0) return;
  const { data: catalog } = await supabase
    .from('product_catalog')
    .select('name, image_url');
  const imageByKey = new Map<string, string | null>();
  for (const row of (catalog ?? []) as Array<{ name: string | null; image_url: string | null }>) {
    const k = productMatchKey(row.name);
    if (!k) continue;
    // If the same normalized key appears multiple times (duplicates in the
    // catalog), prefer the first row that has a non-null image_url.
    if (!imageByKey.has(k) || (imageByKey.get(k) == null && row.image_url != null)) {
      imageByKey.set(k, row.image_url);
    }
  }
  for (const rec of recommendations) {
    const name = rec.product ?? rec.farmceutica_product ?? null;
    const key = productMatchKey(name);
    rec.image_url = key ? imageByKey.get(key) ?? null : null;
  }
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized', protocol: null }, { status: 401 });

    // Try RPC first
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_active_protocol', { p_user_id: user.id });
    if (!rpcErr && rpcData?.length > 0) {
      const protocol = rpcData[0] as { recommendations?: RecRow[] } & Record<string, unknown>;
      await attachImageUrls(supabase, protocol.recommendations ?? []);
      return NextResponse.json({ protocol });
    }

    // Fallback: direct query
    const { data: proto } = await supabase.from('ultrathink_protocols').select('*')
      .eq('user_id', user.id).eq('status', 'active').order('generated_at', { ascending: false }).limit(1).single();
    if (!proto) return NextResponse.json({ protocol: null });

    const { data: recs } = await supabase.from('ultrathink_recommendations').select('*')
      .eq('protocol_id', proto.id).eq('is_dismissed', false).order('rank');

    const recsArr = (recs ?? []) as RecRow[];
    await attachImageUrls(supabase, recsArr);

    return NextResponse.json({ protocol: { ...proto, protocol_id: proto.id, recommendations: recsArr } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message, protocol: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const trigger = body.trigger ?? 'manual';

  try {
    // Build context
    const context = await buildUltrathinkContext(user.id, supabase);
    if (context.dataSourcesUsed.length === 0) {
      return NextResponse.json({ error: 'No assessment data. Complete the CAQ first.' }, { status: 422 });
    }

    // Detect patterns
    const patterns = detectPatterns(context);

    // Apply rules engine — zero API cost
    const recs = await applyRulesEngine(context, supabase);

    if (recs.length === 0) {
      return NextResponse.json({ error: 'No matching recommendations found for your profile.' }, { status: 422 });
    }

    // Build rationale
    const patternNames = patterns.map(p => p.label).join(', ');
    const rationale = patterns.length > 0
      ? `Based on your health assessment, Ultrathink detected ${patterns.length} pattern${patterns.length > 1 ? 's' : ''}: ${patternNames}. Your personalized ViaConnect protocol addresses these with 10-27x bioavailable formulations targeting your specific needs.`
      : `Based on your ${context.goals.length} health goals and lifestyle profile, your personalized ViaConnect protocol delivers 10-27x bioavailable formulations targeting your specific needs.`;

    // Archive old protocol
    await supabase.from('ultrathink_protocols').update({ status: 'archived' }).eq('user_id', user.id).eq('status', 'active');

    // Save protocol
    const highCount = recs.filter(r => r.priority === 'high').length;
    const medCount = recs.filter(r => r.priority === 'medium').length;
    const lowCount = recs.filter(r => r.priority === 'low').length;

    const { data: protocol, error: saveErr } = await supabase.from('ultrathink_protocols').insert({
      user_id: user.id, status: 'active',
      confidence_tier: context.confidenceTier, confidence_pct: context.confidencePct,
      data_sources_used: context.dataSourcesUsed,
      total_recommendations: recs.length,
      high_priority_count: highCount, medium_priority_count: medCount, low_priority_count: lowCount,
      protocol_rationale: rationale,
      bio_score_impact: { overall_delta: Math.min(recs.length * 2, 15), primary_improvements: recs.slice(0, 3).map(r => r.product_category), timeline_weeks: 8 },
      generation_time_ms: Date.now() - startTime,
      claude_model: 'rules-engine-v1',
      trigger_type: trigger, context_snapshot: { patterns: patterns.map(p => p.id), goals: context.goals, sources: context.dataSourcesUsed },
    }).select().single();

    if (saveErr || !protocol) return NextResponse.json({ error: saveErr?.message ?? 'Save failed' }, { status: 500 });

    // Save recommendations
    const recsToInsert = recs.map((r, i) => ({
      protocol_id: protocol.id, user_id: user.id,
      rank: i + 1, priority: r.priority,
      farmceutica_product: r.product_name, product_category: r.product_category,
      delivery_form: r.delivery_form, dosage: r.dosage, frequency: r.frequency,
      timing: r.timing, duration_weeks: 12, rationale: r.rationale,
      health_signals: r.health_signals, bioavailability_note: r.bioavailability_note,
      contraindications: r.contraindications ?? [], interaction_check: 'safe',
      synergy_with: r.synergy_with ?? [], replaces_current: null,
      evidence_level: r.evidence_level, is_accepted: false, is_dismissed: false,
    }));

    await supabase.from('ultrathink_recommendations').insert(recsToInsert);

    return NextResponse.json({
      protocol_id: protocol.id, confidence_tier: context.confidenceTier,
      confidence_pct: context.confidencePct, total_recommendations: recs.length,
      duration_ms: Date.now() - startTime, status: 'generated', engine: 'rules-v1',
    }, { status: 201 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ultrathink POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── RULES ENGINE — Zero API cost, <100ms ────────────────────────────────────

async function applyRulesEngine(ctx: UltrathinkContext, supabase: SupabaseClient<Database>): Promise<TriggeredRule[]> {
  const { data: rules } = await supabase.from('protocol_rules').select('*').eq('is_active', true);
  if (!rules) return [];

  const triggered: TriggeredRule[] = [];
  const addedProducts = new Set<string>();

  for (const rule of rules) {
    let isTriggered = false;

    switch (rule.trigger_type) {
      case 'symptom': {
        const field = rule.trigger_field;
        // Handle dotted fields like "lifestyle.sleep_quality", "lifestyle.stress_level"
        if (field.startsWith('lifestyle.')) {
          const key = field.replace('lifestyle.', '');
          const val = ctx.lifestyle[key] || '';
          if (rule.trigger_operator === 'in') isTriggered = rule.trigger_value.split(',').some((v: string) => val.toLowerCase() === v.trim().toLowerCase());
          if (rule.trigger_operator === 'gt') isTriggered = parseFloat(val || '0') > parseFloat(rule.trigger_value);
        } else if (field === 'physicalSymptoms' || field === 'neuroSymptoms' || field === 'emotionalSymptoms') {
          // "contains" or "contains_any" — check symptom names in top symptoms
          const targets = rule.trigger_value.split(',').map((v: string) => v.trim().toLowerCase());
          const symptomMap = field === 'physicalSymptoms' ? ctx.physicalSymptoms : field === 'neuroSymptoms' ? ctx.neuroSymptoms : ctx.emotionalSymptoms;
          const catFilter = field === 'physicalSymptoms' ? 'physical' : field === 'neuroSymptoms' ? 'neuro' : 'emotional';
          if (rule.trigger_operator === 'contains' || rule.trigger_operator === 'contains_any') {
            // Check if any symptom name matches AND has score >= 5
            isTriggered = Object.entries(symptomMap).some(([k, v]) =>
              (v as SymptomEntry).score >= 5 && targets.some((t: string) => k.toLowerCase().includes(t))
            ) || ctx.topSymptoms.some(s =>
              s.category === catFilter && targets.some((t: string) => s.name.toLowerCase().includes(t))
            );
          }
        } else if (field === 'stressLevel') {
          const val = ctx.lifestyle.stressLevel || '';
          if (rule.trigger_operator === 'in') isTriggered = rule.trigger_value.split(',').some((v: string) => val === v.trim());
        } else if (field === 'sleepHours') {
          const val = parseFloat(ctx.lifestyle.sleepHours || '8');
          if (rule.trigger_operator === 'lt') isTriggered = val < parseFloat(rule.trigger_value);
        } else if (field.startsWith('phys_')) {
          const key = field.replace('phys_', '');
          const score = ctx.physicalSymptoms[key]?.score ?? ctx.physicalSymptoms[key + '_severity']?.score ?? 0;
          if (rule.trigger_operator === 'gte') isTriggered = score >= parseFloat(rule.trigger_value);
        } else if (field.startsWith('neuro_')) {
          const key = field.replace('neuro_', '');
          const score = ctx.neuroSymptoms[key]?.score ?? ctx.neuroSymptoms[key + '_severity']?.score ?? 0;
          if (rule.trigger_operator === 'gte') isTriggered = score >= parseFloat(rule.trigger_value);
        } else if (field.startsWith('emo_')) {
          const key = field.replace('emo_', '');
          const score = ctx.emotionalSymptoms[key]?.score ?? ctx.emotionalSymptoms[key + '_severity']?.score ?? 0;
          if (rule.trigger_operator === 'gte') isTriggered = score >= parseFloat(rule.trigger_value);
        }
        break;
      }
      case 'goal': {
        if (rule.trigger_operator === 'contains') {
          isTriggered = ctx.goals.some(g => g.toLowerCase().includes(rule.trigger_value.toLowerCase()));
        }
        break;
      }
      case 'lifestyle': {
        const field = rule.trigger_field;
        const val = ctx.lifestyle[field] || '';
        if (rule.trigger_operator === 'eq') isTriggered = val === rule.trigger_value;
        if (rule.trigger_operator === 'in') isTriggered = rule.trigger_value.split(',').some((v: string) => val.toLowerCase().includes(v.trim().toLowerCase()));
        break;
      }
      case 'medication': {
        if (rule.trigger_operator === 'contains') {
          const targets = rule.trigger_value.split(',').map((v: string) => v.trim().toLowerCase());
          isTriggered = ctx.medications.some(m => targets.some((t: string) => m.toLowerCase().includes(t)));
        }
        break;
      }
      case 'demographic': {
        const field = rule.trigger_field;
        if (field === 'demographics.age' && ctx.demographics.age != null) {
          const age = ctx.demographics.age;
          if (rule.trigger_operator === 'gt') isTriggered = age > parseFloat(rule.trigger_value);
          if (rule.trigger_operator === 'lt') isTriggered = age < parseFloat(rule.trigger_value);
        }
        break;
      }
      case 'lab_value': {
        // Lab values from context (future: pulled from uploaded lab results)
        const ctxExt = ctx as ExtendedContext;
        const val = ctxExt.labValues?.[rule.trigger_field];
        if (val != null) {
          const numVal = parseFloat(String(val));
          if (rule.trigger_operator === 'lt') isTriggered = numVal < parseFloat(rule.trigger_value);
          if (rule.trigger_operator === 'gt') isTriggered = numVal > parseFloat(rule.trigger_value);
        }
        break;
      }
      case 'genetic': {
        // Genetic data from context (future: pulled from GeneX360 upload)
        const ctxExt = ctx as ExtendedContext;
        const val = ctxExt.genetics?.[rule.trigger_field] || '';
        if (rule.trigger_operator === 'in') isTriggered = rule.trigger_value.split(',').some((v: string) => val.toLowerCase() === v.trim().toLowerCase());
        if (rule.trigger_operator === 'contains') isTriggered = val.toLowerCase().includes(rule.trigger_value.toLowerCase());
        break;
      }
    }

    if (isTriggered && !addedProducts.has(rule.product_name)) {
      addedProducts.add(rule.product_name);
      triggered.push({
        ...rule,
        rationale: substituteFields(rule.rationale_template, ctx),
        health_signals: (rule.health_signals_template || []).map((s: string) => substituteFields(s, ctx)),
      });
    }
  }

  // Sort: high first, then medium, then low. Max 10.
  const order = { high: 0, medium: 1, low: 2 };
  triggered.sort((a, b) => (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2));
  return triggered.slice(0, 10);
}

function substituteFields(template: string, ctx: UltrathinkContext): string {
  const ctxExt = ctx as ExtendedContext;
  return template
    .replace(/\{\{stressLevel\}\}/g, ctx.lifestyle.stressLevel || 'elevated')
    .replace(/\{\{stress_level\}\}/g, ctx.lifestyle.stress_level || ctx.lifestyle.stressLevel || '?')
    .replace(/\{\{sleep_quality\}\}/g, ctx.lifestyle.sleep_quality || ctx.lifestyle.sleepQuality || '?')
    .replace(/\{\{sleepHours\}\}/g, ctx.lifestyle.sleepHours || '?')
    .replace(/\{\{age\}\}/g, ctx.demographics.age?.toString() || 'your')
    .replace(/\{\{sex\}\}/g, ctx.demographics.sex || 'your')
    // Lab value substitutions
    .replace(/\{\{vitamin_d\}\}/g, ctxExt.labValues?.vitamin_d?.toString() || '?')
    .replace(/\{\{vitamin_b12\}\}/g, ctxExt.labValues?.vitamin_b12?.toString() || '?')
    .replace(/\{\{homocysteine\}\}/g, ctxExt.labValues?.homocysteine?.toString() || '?')
    .replace(/\{\{crp\}\}/g, ctxExt.labValues?.crp?.toString() || '?')
    .replace(/\{\{ferritin\}\}/g, ctxExt.labValues?.ferritin?.toString() || '?')
    .replace(/\{\{hba1c\}\}/g, ctxExt.labValues?.hba1c?.toString() || '?')
    .replace(/\{\{triglycerides\}\}/g, ctxExt.labValues?.triglycerides?.toString() || '?')
    .replace(/\{\{testosterone_total\}\}/g, ctxExt.labValues?.testosterone_total?.toString() || '?')
    // Genetic substitutions
    .replace(/\{\{mthfr_status\}\}/g, ctxExt.genetics?.mthfr_status || '?')
    .replace(/\{\{apoe_status\}\}/g, ctxExt.genetics?.apoe_status || '?')
    .replace(/\{\{comt_status\}\}/g, ctxExt.genetics?.comt_status || '?');
}
