import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTierForUser } from '@/lib/pricing/membership-manager';
import { tierIdToLevel } from '@/types/pricing';

export async function GET() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({
      tierId: 'free',
      tierLevel: 0,
      authenticated: false,
    });
  }

  try {
    const tierId = await getEffectiveTierForUser(supabase, user.id);
    return NextResponse.json({
      tierId,
      tierLevel: tierIdToLevel(tierId),
      authenticated: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve tier' },
      { status: 500 },
    );
  }
}
