import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateSupplementDiscount } from '@/lib/pricing/discount-engine';
import { buildUserPricingContext } from '@/lib/pricing/user-pricing-context';

interface DiscountRequest {
  priceCents: number;
  isSubscriptionPurchase: boolean;
  isAnnualPrepay?: boolean;
}

export async function POST(request: NextRequest) {
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

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  try {
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

    const context = await buildUserPricingContext(supabase, user.id);
    const result = await calculateSupplementDiscount(supabase, body.priceCents, context, {
      isSubscriptionPurchase: body.isSubscriptionPurchase,
      isAnnualPrepay: body.isAnnualPrepay,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute discount' },
      { status: 500 },
    );
  }
}
