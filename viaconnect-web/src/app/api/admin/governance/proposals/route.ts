// Prompt #95 Phase 3: create a draft pricing proposal.
// POST /api/admin/governance/proposals
// Body: a minimal creation payload; rest is filled in via PATCH as the
// user edits the form.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(request: NextRequest) {
  const auth = await requireGovernanceAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as
    | {
        title?: string;
        summary?: string;
        pricing_domain_id?: string;
        change_type?: 'price_amount' | 'discount_percent';
      }
    | null;

  if (!body?.title || !body.summary || !body.pricing_domain_id || !body.change_type) {
    return NextResponse.json(
      { error: 'title, summary, pricing_domain_id, change_type are required' },
      { status: 400 },
    );
  }

  const supabase = createClient();

  try {
    const insertRes = await withTimeout(
      (async () => supabase
        .from('pricing_proposals')
        .insert({
          title: body.title,
          summary: body.summary,
          pricing_domain_id: body.pricing_domain_id,
          change_type: body.change_type,
          target_object_ids: [],
          proposed_value_cents: body.change_type === 'price_amount' ? 0 : null,
          proposed_value_percent: body.change_type === 'discount_percent' ? 0 : null,
          impact_tier: 'minor',
          auto_classified_tier: 'minor',
          rationale: '',
          proposed_effective_date: new Date(Date.now() + 30 * 86_400_000)
            .toISOString()
            .slice(0, 10),
          grandfathering_policy: 'no_grandfathering',
          status: 'draft',
          initiated_by: auth.userId,
        } as never)
        .select('id, proposal_number')
        .single())(),
      8000,
      'api.admin.governance.proposals.create',
    );

    if (insertRes.error || !insertRes.data) {
      safeLog.error('api.admin.governance.proposals', 'create failed', { error: insertRes.error });
      return NextResponse.json({ error: insertRes.error?.message ?? 'Insert failed' }, { status: 500 });
    }
    return NextResponse.json(insertRes.data);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.admin.governance.proposals', 'create timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.governance.proposals', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
