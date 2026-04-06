import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check cache first
    const { data: cached } = await supabase
      .from('user_interaction_cache')
      .select('*')
      .eq('user_id', user.id)
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      return NextResponse.json({
        interactions: cached.interactions,
        counts: { major: cached.major_count, moderate: cached.moderate_count, minor: cached.minor_count, synergistic: cached.synergistic_count },
        safety_cleared: cached.safety_cleared,
        evaluated_at: cached.evaluated_at,
        from_cache: true,
      });
    }

    return evaluateAndCache(user.id, supabase);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return evaluateAndCache(user.id, supabase);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function evaluateAndCache(userId: string, supabase: any) {
  const startTime = Date.now();

  // Gather user data (resilient — never throws)
  const [medsResult, supplementsResult, assessmentResult] = await Promise.allSettled([
    supabase.from('user_current_supplements').select('supplement_name, is_current').eq('user_id', userId).eq('is_current', true),
    supabase.from('user_supplements').select('name').eq('user_id', userId),
    supabase.from('assessment_results').select('category, score, details').eq('user_id', userId),
  ]);

  // Extract user's medications from CAQ/assessment data
  const medications: string[] = [];
  const supplements: string[] = [];
  const conditions: string[] = [];
  const genes: string[] = [];

  // Current supplements
  if (supplementsResult.status === 'fulfilled' && supplementsResult.value.data) {
    for (const s of supplementsResult.value.data) {
      if (s.name) supplements.push(s.name);
    }
  }
  if (medsResult.status === 'fulfilled' && medsResult.value.data) {
    for (const s of medsResult.value.data) {
      if (s.supplement_name) supplements.push(s.supplement_name);
    }
  }

  // Get all active rules
  const { data: rules } = await supabase
    .from('interaction_rules')
    .select('*')
    .eq('is_active', true);

  // Evaluate rules against user data
  const allAgents = [...medications, ...supplements].map(a => a.toLowerCase());
  const triggered = (rules ?? []).filter((r: any) => {
    const agentAMatch = allAgents.some(a => a.includes(r.agent_a.toLowerCase()) || r.agent_a.toLowerCase().includes(a));
    const agentBMatch = allAgents.some(a => a.includes(r.agent_b.toLowerCase()) || r.agent_b.toLowerCase().includes(a));
    const geneMatch = r.agent_a_type === 'gene' && genes.includes(r.agent_a);
    return (agentAMatch || geneMatch) && (agentBMatch || r.agent_b_type === 'condition' || r.agent_b_type === 'genetic_effect');
  }).map((r: any) => ({
    rule_id: r.rule_id,
    severity: r.severity,
    interaction_type: r.interaction_type,
    agent_a: r.agent_a,
    agent_b: r.agent_b,
    mechanism: r.mechanism,
    clinical_effect: r.clinical_effect,
    rationale: r.rationale_template,
    consumer_message: r.consumer_message,
    practitioner_message: r.practitioner_message,
    recommendation: r.recommendation,
    timing_note: r.timing_note,
    requires_hcp_review: r.requires_hcp_review,
    blocks_protocol: r.blocks_protocol,
    evidence_level: r.evidence_level,
  }));

  // Sort by severity
  const severityOrder: Record<string, number> = { major: 1, moderate: 2, minor: 3, synergistic: 4 };
  triggered.sort((a: any, b: any) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));

  const counts = {
    major: triggered.filter((r: any) => r.severity === 'major').length,
    moderate: triggered.filter((r: any) => r.severity === 'moderate').length,
    minor: triggered.filter((r: any) => r.severity === 'minor').length,
    synergistic: triggered.filter((r: any) => r.severity === 'synergistic').length,
  };

  const safety_cleared = counts.major === 0;
  const inputHash = createHash('md5').update(userId + JSON.stringify(allAgents)).digest('hex');

  // Cache result
  await supabase.from('user_interaction_cache').upsert({
    user_id: userId,
    input_hash: inputHash,
    major_count: counts.major,
    moderate_count: counts.moderate,
    minor_count: counts.minor,
    synergistic_count: counts.synergistic,
    interactions: triggered,
    safety_cleared,
    evaluated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,input_hash' });

  return NextResponse.json({
    interactions: triggered,
    counts,
    safety_cleared,
    evaluated_at: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    from_cache: false,
  });
}
