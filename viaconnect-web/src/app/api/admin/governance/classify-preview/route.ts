// Prompt #95 Phase 3: live classification preview.
// POST /api/admin/governance/classify-preview
// Accepts the in-progress proposal inputs and returns the classification
// result + affected customer estimate. Does NOT persist anything. Called
// by the proposal builder form as the user edits.

import { type NextRequest, NextResponse } from 'next/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { classifyWithRules } from '@/lib/governance/classify-with-rules';
import { estimateAffectedCustomers } from '@/lib/governance/affected-customers';
import { computeUeProjection } from '@/lib/governance/ue-projection';
import type {
  ChangeType,
  PricingDomainCategory,
} from '@/types/governance';

export async function POST(request: NextRequest) {
  const auth = await requireGovernanceAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as
    | {
        domainCategory?: PricingDomainCategory;
        pricingDomainId?: string;
        targetObjectIds?: string[];
        currentValueCents?: number | null;
        proposedValueCents?: number | null;
        currentValuePercent?: number | null;
        proposedValuePercent?: number | null;
        changeType?: ChangeType;
      }
    | null;

  if (!body?.domainCategory || !body.changeType) {
    return NextResponse.json(
      { error: 'domainCategory and changeType required' },
      { status: 400 },
    );
  }

  const affected = body.pricingDomainId
    ? await estimateAffectedCustomers(body.pricingDomainId, body.targetObjectIds ?? [])
    : { count: 0, method: 'no_domain_specified', notes: [] };

  const classification = await classifyWithRules({
    domainCategory: body.domainCategory,
    currentValueCents: body.currentValueCents ?? null,
    proposedValueCents: body.proposedValueCents ?? null,
    currentValuePercent: body.currentValuePercent ?? null,
    proposedValuePercent: body.proposedValuePercent ?? null,
    changeType: body.changeType,
    estimatedAffectedCustomers: affected.count,
  });

  const ueProjection = await computeUeProjection({
    domainCategory: body.domainCategory,
    currentValueCents: body.currentValueCents ?? null,
    proposedValueCents: body.proposedValueCents ?? null,
    currentValuePercent: body.currentValuePercent ?? null,
    proposedValuePercent: body.proposedValuePercent ?? null,
    estimatedAffectedCustomers: affected.count,
  });

  return NextResponse.json({ classification, affected, ueProjection });
}
