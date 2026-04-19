import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadCatalog } from '@/lib/helix/redemption-engine';

export async function GET() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const items = await loadCatalog(supabase);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load catalog' },
      { status: 500 },
    );
  }
}
