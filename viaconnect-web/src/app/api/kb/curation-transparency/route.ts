/**
 * Prompt 227b: authenticated curation transparency for Science page.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadCurationTransparency } from '@/lib/kb/curationTransparency227b';

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
    const data = await loadCurationTransparency();
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'transparency_failed',
      },
      { status: 200 },
    );
  }
}
