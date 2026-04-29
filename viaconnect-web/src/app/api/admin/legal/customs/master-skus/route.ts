// Prompt #114 P3: Master SKU picker for the recordation products section.
//
// GET /api/admin/legal/customs/master-skus
//   -> all SKUs in master_skus, keyed for the recordation product picker.
//
// master_skus has no legal-ops RLS policy (#111 read-only contract), so
// we authenticate the caller via the user-session client and then use
// the service-role admin client to fetch master_skus data. Narrow payload
// (sku + name + category + msrp only) to avoid leaking unnecessary pricing
// intelligence through this customs surface.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);
const CFO_CEO_ROLES = new Set(['cfo', 'ceo']);

interface ProfileLite {
  role: string;
}

async function requireLegalOrExec(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.customs.master-skus.auth');
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }
  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (k: string, v: string) => {
          maybeSingle: () => Promise<{ data: ProfileLite | null }>;
        };
      };
    };
  };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Legal or executive access required' }, { status: 403 }),
    };
  }
  const isLegalOps = LEGAL_OPS_ROLES.has(profile.role);
  const isExec = CFO_CEO_ROLES.has(profile.role);
  if (!isLegalOps && !isExec) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Legal or executive access required' }, { status: 403 }),
    };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOrExec(supabase);
    if (!ctx.ok) return ctx.response;

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = admin as any;
    const { data, error } = await sb
      .from('master_skus')
      .select('sku, name, category, msrp')
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rows: data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.customs.master-skus', 'GET timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.customs.master-skus', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
