// Prompt #103 Phase 3: Admin brand-compliance queue + detail API.
//
// GET /api/admin/brand-compliance?status=<...>
//   -> rows from brand_compliance_reviews, newest first, joined with
//      product name for the queue header.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.brand-compliance.queue.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const profileRes = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.brand-compliance.queue.load-profile',
    );
    const profile = profileRes.data as { role?: string } | null;
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'pending_human_review';

    const { data, error } = await withTimeout(
      (async () => sb
        .from('brand_compliance_reviews')
        .select('review_id, product_id, severity, status, created_at, reviewed_at, products ( name )')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(200))(),
      10000,
      'api.brand-compliance.queue.list',
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    interface QueueRowShape {
      review_id: string;
      product_id: string;
      severity: string;
      status: string;
      created_at: string;
      reviewed_at: string | null;
      products: { name: string | null } | null;
    }
    const rows = ((data ?? []) as QueueRowShape[]).map((r) => ({
      review_id: r.review_id,
      product_id: r.product_id,
      product_name: r.products?.name ?? null,
      severity: r.severity,
      status: r.status,
      created_at: r.created_at,
      reviewed_at: r.reviewed_at,
    }));

    return NextResponse.json({ status, rows });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.brand-compliance.queue', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.brand-compliance.queue', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
