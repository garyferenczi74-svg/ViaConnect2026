import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateFamilyPricing } from '@/lib/pricing/family-pricing';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const adults = parseInt(params.get('adults') ?? '2', 10);
  const children = parseInt(params.get('children') ?? '2', 10);
  const cycle = (params.get('cycle') ?? 'monthly') as 'monthly' | 'annual';

  if (cycle !== 'monthly' && cycle !== 'annual') {
    return NextResponse.json({ error: 'cycle must be monthly or annual' }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const breakdown = await calculateFamilyPricing(supabase, {
      totalAdults: adults,
      totalChildren: children,
      billingCycle: cycle,
    });
    return NextResponse.json(breakdown, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    );
  }
}
