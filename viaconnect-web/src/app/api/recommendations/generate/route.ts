import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { runPostCAQPipeline, type CAQResponses } from '@/lib/recommendation-engine';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: phases } = await supabase
      .from('assessment_results').select('*').eq('user_id', user.id).order('phase', { ascending: true });
    if (!phases?.length) return NextResponse.json({ error: 'No assessment data found.' }, { status: 404 });

    const caqResponses: CAQResponses = {};
    for (const phase of phases) Object.assign(caqResponses, phase.responses || phase.data || phase.answers || {});

    const body = await request.json().catch(() => ({}));
    const result = await runPostCAQPipeline(supabase, user.id, caqResponses, body.assessment_id);

    return NextResponse.json({
      success: true, vitality_score: result.vitalityScore,
      recommendations_count: result.recommendations.length,
      recommendations: result.recommendations.map(r => ({
        product_name: r.product_name, reason: r.reason, confidence_score: r.confidence_score,
        dosage: r.dosage, time_of_day: r.time_of_day, monthly_price: r.monthly_price, priority_rank: r.priority_rank,
      })),
    });
  } catch (error: any) {
    console.error('Recommendation generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
