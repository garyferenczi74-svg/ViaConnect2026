// Prompt 204c lab engine (2026-06-18): the Hannah decipherment endpoint. On
// demand, it loads the member's confirmed deterministic results and asks Hannah
// to translate them into plain language with educational suggestions, passing
// the output through the compliance gate before returning it. Owner-scoped,
// rate limited, time bounded.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { loadLabResults } from '@/lib/labs/loadLabResults';
import { decipherLabResults } from '@/lib/labs/hannahDecipher';
import { getDisplayName } from '@/lib/getDisplayName';

export const dynamic = 'force-dynamic';

export const maxDuration = 60;

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }

  const hannah = getDisplayName('hannah');

  if (!inMemoryRateLimit(`labs-decipher:${user.id}`, 6, 60_000)) {
    return NextResponse.json(
      { error: 'Please wait a moment before requesting another interpretation.' },
      { status: 429 },
    );
  }

  try {
    const results = await loadLabResults(supabase, user.id);
    if (results.length === 0) {
      return NextResponse.json({ text: null, blocked: false, hasConsult: false, hannah });
    }
    const out = await decipherLabResults(results, user.id);
    return NextResponse.json({ ...out, hannah });
  } catch (err) {
    safeLog.error('api.labs.decipher', 'failed', {
      user_id: user.id, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ text: null, blocked: false, hasConsult: false, hannah });
  }
}
