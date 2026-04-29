import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateSupplementDiscount } from '@/lib/pricing/discount-engine';
import { buildUserPricingContext } from '@/lib/pricing/user-pricing-context';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

interface DiscountRequest {
  priceCents: number;
  isSubscriptionPurchase: boolean;
  isAnnualPrepay?: boolean;
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  let body: DiscountRequest;
  try {
    body = (await request.json()) as DiscountRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.priceCents !== 'number' || body.priceCents < 0) {
    return NextResponse.json({ error: 'priceCents must be a non-negative integer' }, { status: 400 });
  }
  if (typeof body.isSubscriptionPurchase !== 'boolean') {
    return NextResponse.json({ error: 'isSubscriptionPurchase must be boolean' }, { status: 400 });
  }

  try {
    const supabase = createClient();
    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.pricing.discount.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.pricing.discount', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }

    // Unauthenticated users get MSRP (no discounts apply).
    if (!user) {
      return NextResponse.json({
        originalPriceCents: body.priceCents,
        appliedDiscountPercent: 0,
        appliedRuleId: null,
        annualPrepayBonusApplied: false,
        finalPriceCents: body.priceCents,
        savingsCents: 0,
        breakdown: { baseDiscount: 0, annualBonus: 0, totalDiscount: 0 },
      });
    }

    const context = await withTimeout(
      buildUserPricingContext(supabase, user.id),
      8000,
      'api.pricing.discount.context',
    );
    const result = await withTimeout(
      calculateSupplementDiscount(supabase, body.priceCents, context, {
        isSubscriptionPurchase: body.isSubscriptionPurchase,
        isAnnualPrepay: body.isAnnualPrepay,
      }),
      10000,
      'api.pricing.discount.calculate',
    );
    return NextResponse.json(result);
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error('api.pricing.discount', 'calculation timeout', { requestId, error });
      return NextResponse.json({ error: 'Discount calculation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.pricing.discount', 'calculation failed', { requestId, error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute discount' },
      { status: 500 },
    );
  }
}
