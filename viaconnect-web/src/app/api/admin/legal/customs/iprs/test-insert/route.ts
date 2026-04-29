// Prompt #114 P4a: Dev-only IPRS test-insert endpoint.
//
// POST /api/admin/legal/customs/iprs/test-insert
//   { recordation_id?, listing_title?, listing_url?, listing_source?, mark_distance_score? }
//   -> seeds a synthetic row into customs_iprs_scan_results so the alerts UI
//      can be exercised before the real scraper comes online in P4b.
//
// SECURITY: gated by THREE checks per the P4 security advisor review:
//   1. Role must be legal_ops / compliance_officer / admin.
//   2. ENABLE_IPRS_TEST_INSERT=true env flag (defaults false in prod).
//   3. Inserted rows carry is_synthetic=TRUE so production dashboard counts
//      filter them out.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { createHash } from 'node:crypto';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);

interface ProfileLite {
  role: string;
}

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.customs.iprs.test-insert.auth');
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
  if (!profile || !LEGAL_OPS_ROLES.has(profile.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Legal-ops access required' }, { status: 403 }),
    };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 .%$-]/g, '')
    .trim();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (process.env.ENABLE_IPRS_TEST_INSERT !== 'true') {
      return NextResponse.json(
        { error: 'test-insert endpoint is disabled; set ENABLE_IPRS_TEST_INSERT=true to enable' },
        { status: 403 },
      );
    }

    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    const body = (await request.json().catch(() => null)) ?? {};
    const listingTitle: string =
      typeof body.listing_title === 'string' && body.listing_title.trim().length > 0
        ? body.listing_title.trim()
        : `Synthetic test listing ${new Date().toISOString()}`;
    const normalized = normalizeTitle(listingTitle);
    const contentHash = createHash('sha256')
      .update(normalized + '|' + (body.listing_url ?? '') + '|' + (body.observed_price_cents ?? ''))
      .digest('hex');

    const insertRow: Record<string, unknown> = {
      recordation_id: typeof body.recordation_id === 'string' ? body.recordation_id : null,
      scan_date: new Date().toISOString().slice(0, 10),
      scanned_at: new Date().toISOString(),
      listing_title: listingTitle,
      listing_title_normalized: normalized,
      listing_url: typeof body.listing_url === 'string' ? body.listing_url : 'https://example.test/iprs-synthetic',
      listing_source: typeof body.listing_source === 'string' ? body.listing_source : 'test-insert',
      observed_price_cents:
        Number.isInteger(body.observed_price_cents) && body.observed_price_cents >= 0
          ? body.observed_price_cents
          : null,
      mark_distance_score:
        typeof body.mark_distance_score === 'number' &&
        body.mark_distance_score >= 0 &&
        body.mark_distance_score <= 1
          ? body.mark_distance_score
          : 0.12,
      content_hash: contentHash,
      status: 'requires_review',
      is_synthetic: true,
    };

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = admin as any;

    const { data: created, error } = await sb
      .from('customs_iprs_scan_results')
      .insert(insertRow)
      .select('*')
      .maybeSingle();
    if (error || !created) {
      return NextResponse.json(
        { error: error?.message ?? 'Insert failed' },
        { status: 500 },
      );
    }

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id,
      actor_role: ctx.role,
      action_category: 'customs_iprs',
      action_verb: 'synthetic_alert_seeded',
      target_table: 'customs_iprs_scan_results',
      target_id: created.scan_result_id,
      after_state_json: {
        listing_title: created.listing_title,
        is_synthetic: true,
      },
    });

    return NextResponse.json({ alert: created }, { status: 201 });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.customs.iprs.test-insert', 'POST timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.customs.iprs.test-insert', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
