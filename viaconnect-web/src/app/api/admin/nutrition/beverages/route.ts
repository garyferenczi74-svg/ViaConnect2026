// Prompt 207a Task 7: admin-gated beverage catalog read API.
//
// GET /api/admin/nutrition/beverages
// Returns ALL beverage_catalog rows (active + inactive) ordered by sort_order
// then display_name. Uses the service-role client (bypasses RLS) because the
// consumer catalog route only exposes is_active=true rows; admins need to see
// every row to manage the catalog.
//
// Auth: requireAdmin() from admin-guard (401/403 for non-admins).
// DB: createAdminClient() for service-role access to all rows.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  try {
    const admin = createAdminClient();

    const result = await withTimeout(
      admin
        .from('beverage_catalog')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('display_name', { ascending: true }),
      4000,
      'api.admin.nutrition.beverages.list',
    );

    if (result.error) {
      safeLog.error('api.admin.nutrition.beverages', 'database query failed', {
        error: result.error,
      });
      return NextResponse.json({ error: 'Could not load beverage catalog' }, { status: 500 });
    }

    return NextResponse.json({ beverages: result.data ?? [] });
  } catch (err) {
    safeLog.error('api.admin.nutrition.beverages', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Could not load beverage catalog' }, { status: 500 });
  }
}
