import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redeemCatalogItem } from '@/lib/helix/redemption-engine';

interface Body {
  catalogItemId: string;
  applicationContext?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.catalogItemId) {
    return NextResponse.json({ error: 'catalogItemId is required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await redeemCatalogItem(supabase, {
    userId: user.id,
    catalogItemId: body.catalogItemId,
    applicationContext: body.applicationContext,
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Redemption failed' }, { status: 400 });
  }
  return NextResponse.json(result);
}
