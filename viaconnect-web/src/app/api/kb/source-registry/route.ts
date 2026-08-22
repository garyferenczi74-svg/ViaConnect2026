/**
 * Prompt 226h Wave B: authenticated source registry for Science transparency.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadSourceRegistry } from '@/lib/kb/unifiedEvidence226h';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await loadSourceRegistry();
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'registry_failed',
      },
      { status: 200 },
    );
  }
}
