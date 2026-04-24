// Prompt #125 P4: Override a BLOCK/SURFACE decision on a scheduler scan.
//
// POST /api/marshall/scheduler/scans/{id}/override
//   Auth: practitioner must be the owner of the scan.
//   Body: { findingIds: string[], justification: string }
//   Captures IP + UA server-side.
//   Delegates to signOverride from P2, which writes scheduler_overrides,
//   flips scheduler_scans.decision to override_accepted, and computes
//   pattern_flag_triggered.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { signOverride } from '@/lib/marshall/scheduler/overrideSigner';

export const runtime = 'nodejs';

interface OverrideBody {
  findingIds?: string[];
  justification?: string;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const scanId = (params.id ?? '').trim();
  if (!scanId) return NextResponse.json({ error: 'missing_scan_id' }, { status: 400 });

  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: scan } = await sb
    .from('scheduler_scans')
    .select('id, practitioner_id, decision')
    .eq('id', scanId)
    .maybeSingle();
  if (!scan) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (scan.practitioner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (scan.decision === 'clean' || scan.decision === 'override_accepted') {
    return NextResponse.json({ error: 'not_overridable', decision: scan.decision }, { status: 409 });
  }

  let body: OverrideBody;
  try { body = (await req.json()) as OverrideBody; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const ipAddress = (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? null
  );
  const userAgent = req.headers.get('user-agent') ?? null;

  const outcome = await signOverride({
    supabase,
    scanId,
    practitionerId: user.id,
    findingIds: Array.isArray(body.findingIds) ? body.findingIds : [],
    justification: body.justification ?? '',
    ipAddress,
    userAgent,
  });

  if (outcome.outcome === 'rejected') {
    return NextResponse.json({ error: outcome.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    overrideId: outcome.overrideId,
    patternFlagTriggered: outcome.patternFlagTriggered,
  });
}
