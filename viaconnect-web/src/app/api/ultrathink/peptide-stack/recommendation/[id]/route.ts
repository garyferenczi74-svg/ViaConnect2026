import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(supabase.auth.getUser(), 5000, 'api.ultrathink.peptide-stack.recommendation.auth');
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.ultrathink.peptide-stack.recommendation', 'auth timeout', { error: err });
        return NextResponse.json({ error: 'Authentication check timed out.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { error } = await withTimeout(
      (async () => supabase
        .from('peptide_stack_recommendations')
        .update(body)
        .eq('id', params.id)
        .eq('user_id', user.id))(),
      8000,
      'api.ultrathink.peptide-stack.recommendation.update',
    );

    if (error) {
      safeLog.error('api.ultrathink.peptide-stack.recommendation', 'update failed', { id: params.id, error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (isTimeoutError(err)) safeLog.warn('api.ultrathink.peptide-stack.recommendation', 'timeout', { error: err });
    else safeLog.error('api.ultrathink.peptide-stack.recommendation', 'unexpected error', { error: err });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
