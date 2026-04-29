import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildPeptideStack } from '@/lib/ultrathink/peptideEngine';
import { isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

// GET — load existing peptide protocol
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabase
      .from('ultrathink_protocols')
      .select('*')
      .eq('user_id', user.id)
      .eq('protocol_type', 'peptide')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ protocol: data || null });
  } catch {
    return NextResponse.json({ protocol: null });
  }
}

// POST — generate new peptide stack (zero-cost deterministic engine)
export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;

    // ── Pull user context (resilient — never throws) ──
    const [patternResult, labResult, profileResult] = await Promise.allSettled([
      supabase.from('peptide_detected_patterns').select('pattern_id, confidence').eq('user_id', userId).order('confidence', { ascending: false }).limit(4),
      supabase.from('assessment_results').select('category, score').eq('user_id', userId),
      supabase.from('profiles').select('date_of_birth, sex').eq('id', userId).single(),
    ]);

    // Extract detected patterns
    const detectedPatterns: string[] = [];

    // Try stored patterns first
    if (patternResult.status === 'fulfilled' && patternResult.value.data?.length) {
      for (const p of patternResult.value.data) {
        if (p.pattern_id) detectedPatterns.push(p.pattern_id);
      }
    }

    // Fallback: derive patterns from assessment_results categories
    if (detectedPatterns.length === 0 && labResult.status === 'fulfilled' && labResult.value.data?.length) {
      // Cast through unknown: typegen tries to resolve `category` as a column on
      // assessment_results and fails, producing a SelectQueryError union that
      // can't be assigned to the local shape directly. The runtime data is fine.
      const scores = labResult.value.data as unknown as { category: string; score: number }[];
      const categoryMap: Record<string, string> = {
        'stress': 'hpa_axis', 'anxiety': 'hpa_axis',
        'cognitive': 'neuroinflammation', 'brain_fog': 'neuroinflammation',
        'gut': 'gut_brain_axis', 'digestive': 'gut_brain_axis',
        'metabolic': 'metabolic_dysregulation', 'weight': 'metabolic_dysregulation',
        'pain': 'tissue_repair', 'musculoskeletal': 'tissue_repair',
        'immune': 'immune_dysregulation',
        'hormonal': 'hormonal_imbalance', 'sexual': 'hormonal_imbalance',
        'sleep': 'circadian_sleep', 'circadian': 'circadian_sleep',
        'aging': 'longevity_aging', 'longevity': 'longevity_aging',
        'autonomic': 'autonomic_dysregulation', 'heart_rate': 'autonomic_dysregulation',
      };
      for (const s of scores) {
        if (s.score >= 3) {
          const pattern = categoryMap[s.category?.toLowerCase()];
          if (pattern && !detectedPatterns.includes(pattern)) detectedPatterns.push(pattern);
        }
      }
    }

    // Safe default
    if (detectedPatterns.length === 0) detectedPatterns.push('hpa_axis');

    // Build user context — typegen produces a SelectQueryError union for the
    // profiles select chain in this file (see issue note above). Cast to any.
    const profile: any = profileResult.status === 'fulfilled' ? profileResult.value.data : null;
    let age: number | undefined;
    if (profile?.date_of_birth) {
      age = Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 86400000));
    }

    // ── Generate stack — ZERO API COST ──
    const stack = buildPeptideStack(detectedPatterns, { age, sex: profile?.sex });

    // ── Archive old peptide protocols ──
    await supabase
      .from('ultrathink_protocols')
      .update({ status: 'archived' })
      .eq('user_id', userId)
      .eq('protocol_type', 'peptide')
      .eq('status', 'active');

    // ── Save new protocol ── (typegen has trouble inferring this insert
    // shape because some columns are jsonb; cast supabase to any.)
    const { data: saved, error } = await (supabase as any)
      .from('ultrathink_protocols')
      .insert({
        user_id: userId,
        protocol_type: 'peptide',
        status: 'active',
        detected_patterns: stack.detected_patterns,
        rationale: stack.rationale,
        supervision_required: stack.supervision_required,
        confidence_tier: 1,
        items: stack.items,
        engine: 'deterministic-v1',
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Return inline even if DB save fails
      return NextResponse.json({ protocol: stack, warning: 'Protocol generated but not persisted' });
    }

    return NextResponse.json({ protocol: saved });
  } catch (err: any) {
    if (isTimeoutError(err)) safeLog.warn('api.ultrathink.peptide-stack', 'timeout', { error: err });
    else safeLog.error('api.ultrathink.peptide-stack', 'generation failed', { error: err });
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
