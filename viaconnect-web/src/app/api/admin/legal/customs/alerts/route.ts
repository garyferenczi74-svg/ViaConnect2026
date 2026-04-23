// Prompt #114 P4a: IPRS alerts list.
//
// GET /api/admin/legal/customs/alerts?status=&recordationId=&scannedAfter=&includeSynthetic=
//   -> list of customs_iprs_scan_results enriched with the parent recordation's
//      mark_text or copyright_registration_number. Newest first. is_synthetic
//      rows excluded by default; set includeSynthetic=1 to surface them.
//
// Uses the service-role admin client for the recordation enrichment join
// because the client joins two tables and the admin path avoids RLS join
// complexity. Auth is gated at the user-session layer first.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);
const CFO_CEO_ROLES = new Set(['cfo', 'ceo']);

interface ProfileLite {
  role: string;
}

async function requireLegalOrExec(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
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
  return { ok: true as const, user_id: user.id, role: profile.role, is_legal_ops: isLegalOps };
}

interface AlertRow {
  scan_result_id: string;
  case_id: string | null;
  recordation_id: string | null;
  scan_date: string;
  scanned_at: string;
  listing_title: string | null;
  listing_title_normalized: string | null;
  listing_url: string | null;
  listing_source: string | null;
  observed_price_cents: number | null;
  mark_distance_score: number | null;
  content_hash: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  is_synthetic: boolean;
  created_at: string;
  updated_at: string;
}

interface RecordationLite {
  recordation_id: string;
  recordation_type: string;
  mark_text: string | null;
  copyright_registration_number: string | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOrExec(supabase);
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const recordationId = url.searchParams.get('recordationId');
  const scannedAfter = url.searchParams.get('scannedAfter');
  const includeSynthetic = url.searchParams.get('includeSynthetic') === '1';

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  let q = sb
    .from('customs_iprs_scan_results')
    .select(`
      scan_result_id,
      case_id,
      recordation_id,
      scan_date,
      scanned_at,
      listing_title,
      listing_title_normalized,
      listing_url,
      listing_source,
      observed_price_cents,
      mark_distance_score,
      content_hash,
      status,
      reviewed_by,
      reviewed_at,
      review_notes,
      is_synthetic,
      created_at,
      updated_at
    `)
    .order('scanned_at', { ascending: false })
    .limit(200);

  if (status) q = q.eq('status', status);
  if (recordationId) q = q.eq('recordation_id', recordationId);
  if (scannedAfter) q = q.gte('scanned_at', scannedAfter);
  if (!includeSynthetic) q = q.eq('is_synthetic', false);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as AlertRow[];
  const recordationIds = Array.from(
    new Set(rows.map((r) => r.recordation_id).filter((x): x is string => x !== null)),
  );

  const recordationMap: Record<string, RecordationLite> = {};
  if (recordationIds.length > 0) {
    const { data: recs } = await sb
      .from('customs_recordations')
      .select('recordation_id, recordation_type, mark_text, copyright_registration_number')
      .in('recordation_id', recordationIds);
    for (const r of (recs ?? []) as RecordationLite[]) {
      recordationMap[r.recordation_id] = r;
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    recordation: r.recordation_id ? recordationMap[r.recordation_id] ?? null : null,
  }));

  return NextResponse.json({ rows: enriched });
}
