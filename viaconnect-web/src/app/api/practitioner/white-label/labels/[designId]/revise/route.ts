// Prompt #96 Phase 4: Create a new design version after revision request.
//
// POST /api/practitioner/white-label/labels/[designId]/revise
//
// Clones the current label_design row into a new row with
// version_number+1 and parent_design_id pointing to the original. Flips
// the original's is_current_version to false in the same transaction.
// New row starts in status='draft' so the practitioner can edit before
// resubmitting.
//
// Performed via a SECURITY DEFINER RPC to keep the demote+insert
// atomic against the partial unique index uq_label_design_one_current.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { designId: string } },
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.white-label.labels.revise.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.white-label.labels.revise', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const practitionerRes = await withTimeout(
      (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
      8000,
      'api.white-label.labels.revise.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const designRes = await withTimeout(
      (async () => sb
        .from('white_label_label_designs')
        .select('*')
        .eq('id', params.designId)
        .maybeSingle())(),
      8000,
      'api.white-label.labels.revise.design-load',
    );
    const design = designRes.data;
    if (!design) return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    if (design.practitioner_id !== practitioner.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!design.is_current_version) {
      return NextResponse.json({ error: 'Only the current version can be revised' }, { status: 400 });
    }
    if (!['revision_requested', 'archived'].includes(design.status)) {
      return NextResponse.json({
        error: `Cannot revise a design in status ${design.status}; revisions only follow a reviewer revision request or rejection.`,
      }, { status: 400 });
    }

    // Demote the current row + insert the new draft. We use two statements
    // wrapped in a single round-trip via the RPC. (Defined in migration _460.)
    const rpcRes = await withTimeout(
      (async () => sb.rpc('clone_label_design_revision', {
        p_source_design_id: params.designId,
      }))(),
      10000,
      'api.white-label.labels.revise.rpc',
    );
    const rpcData = rpcRes.data;
    const rpcError = rpcRes.error;
    if (rpcError) {
      safeLog.error('api.white-label.labels.revise', 'rpc failed', { requestId, error: rpcError });
      return NextResponse.json({ error: 'Revision clone failed', details: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ new_design_id: rpcData });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.labels.revise', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.labels.revise', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
