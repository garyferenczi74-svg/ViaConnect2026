// Prompt #103 Phase 3: Admin brand-compliance queue + detail API.
//
// GET /api/admin/brand-compliance?status=<...>
//   -> rows from brand_compliance_reviews, newest first, joined with
//      product name for the queue header.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'pending_human_review';

  const { data, error } = await sb
    .from('brand_compliance_reviews')
    .select('review_id, product_id, severity, status, created_at, reviewed_at, products ( name )')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(200);
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
}
