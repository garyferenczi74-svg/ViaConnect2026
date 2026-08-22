/**
 * Prompt 227f: weekly drift audit vs last human-reviewed baselines.
 * Flags peptides whose honesty/grade drifted past threshold through auto-apply.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const GRADE_RANK: Record<string, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
};

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: baselines } = await admin
      .from('curation_human_reviewed_baselines')
      .select(
        'peptide_id, evidence_grade_overall, honesty_layer, reviewed_at',
      )
      .limit(200);

    let compared = 0;
    let drifted = 0;
    const samples: Array<{
      peptideId: string;
      reason: string;
    }> = [];

    for (const b of baselines ?? []) {
      compared += 1;
      const { data: pep } = await admin
        .from('kb_peptides')
        .select('id, slug, evidence_grade_overall, honesty_layer')
        .eq('id', b.peptide_id)
        .maybeSingle();
      if (!pep) continue;

      const baseGrade = String(b.evidence_grade_overall ?? 'E');
      const curGrade = String(pep.evidence_grade_overall ?? 'E');
      const baseRank = GRADE_RANK[baseGrade] ?? 1;
      const curRank = GRADE_RANK[curGrade] ?? 1;

      const baseHonesty =
        b.honesty_layer && typeof b.honesty_layer === 'object'
          ? (b.honesty_layer as Record<string, unknown>)
          : {};
      const curHonesty =
        pep.honesty_layer && typeof pep.honesty_layer === 'object'
          ? (pep.honesty_layer as Record<string, unknown>)
          : {};
      const basePubs = Number(baseHonesty.publications_human ?? 0);
      const curPubs = Number(curHonesty.publications_human ?? 0);

      const gradeDriftUp = curRank - baseRank >= 1;
      const pubDrift = Math.abs(curPubs - basePubs) >= 3;

      if (gradeDriftUp || pubDrift) {
        drifted += 1;
        const reason = gradeDriftUp
          ? `grade_drift ${baseGrade}->${curGrade}`
          : `honesty_pub_drift ${basePubs}->${curPubs}`;
        samples.push({ peptideId: String(pep.id), reason });

        await admin.from('curation_proposals').insert({
          gap_type: 'drift_audit',
          target_table: 'kb_peptides',
          target_row_id: pep.id,
          target_field: gradeDriftUp
            ? 'evidence_grade_overall'
            : 'honesty_layer',
          change_class: 2,
          direction: 'correction',
          current_value: {
            evidence_grade_overall: curGrade,
            honesty_layer: curHonesty,
          },
          proposed_value: {
            action: 'human_review_drift',
            baseline_grade: baseGrade,
            baseline_pubs: basePubs,
          },
          rationale: `Weekly drift audit: ${reason} for ${pep.slug}. Escalated to Class 2 Jeffery review.`,
          status: 'escalated',
          confidence: 0.7,
          source_tier: 1,
          review_note: reason,
        });
      }
    }

    return Response.json({
      ok: true,
      prompt: '227f',
      phase: 'drift_audit_weekly',
      compared,
      drifted,
      samples: samples.slice(0, 10),
      note:
        baselines && baselines.length > 0
          ? 'Compared against curation_human_reviewed_baselines'
          : 'No human-reviewed baselines yet; drift audit idle',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.run-227-drift-audit', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
