// Prompt #127 P7: Trigger a cross-framework consistency scan.
//
// Runs the 5 registry-level rules, upserts findings into
// framework_registry_flags, auto-resolves stale open flags. Returns the
// tally so the UI can render a success toast.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runConsistencyScan } from '@/lib/compliance/consistency/checker';

export const runtime = 'nodejs';

const SCAN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

export async function POST(_req: NextRequest) {
  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { data: profile } = await session.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!SCAN_ROLES.has(role)) return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });

  const admin = createAdminClient();
  try {
    const outcome = await runConsistencyScan(admin);
    return NextResponse.json({
      ok: true,
      registryVersion: outcome.registryVersion,
      inserted: outcome.inserted,
      reopened: outcome.reopened,
      refreshed: outcome.refreshed,
      autoResolved: outcome.autoResolved,
      totalFlags: outcome.flags.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'scan_failed';
    // eslint-disable-next-line no-console
    console.error('[consistency scan] failed', { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
