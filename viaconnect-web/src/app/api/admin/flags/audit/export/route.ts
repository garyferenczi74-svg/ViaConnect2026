// Prompt #93 Phase 6: audit trail CSV export.
//
// GET /api/admin/flags/audit/export?feature=X&since=YYYY-MM-DD&until=YYYY-MM-DD
// Admin-only. Streams the filtered audit trail as RFC 4180 CSV for download
// and compliance archiving.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { serializeAuditCsv, type AuditCsvRow } from '@/lib/flags/audit-csv';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  const { searchParams } = request.nextUrl;
  const featureFilter = searchParams.get('feature');
  const since = searchParams.get('since');
  const until = searchParams.get('until');
  const changeTypeFilter = searchParams.get('change_type');

  const supabase = createClient();
  let query = supabase
    .from('feature_flag_audit')
    .select('id, feature_id, change_type, change_reason, changed_by, changed_at, previous_state, new_state, user_agent, ip_address')
    .order('changed_at', { ascending: false })
    .limit(10000);

  if (featureFilter) query = query.eq('feature_id', featureFilter);
  if (changeTypeFilter) query = query.eq('change_type', changeTypeFilter);
  if (since) query = query.gte('changed_at', since);
  if (until) query = query.lte('changed_at', until);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = serializeAuditCsv((data ?? []) as AuditCsvRow[]);
  const filename = `flag-audit-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
