// Prompt #124 P4: Review-queue GET endpoint.
//
// Returns determinations with human_review_required = true, newest first,
// joined with a minimal subset of the source evaluation (source, created_at,
// listing URL if present in source_reference, image_storage_key).

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const COMPLIANCE_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

export async function GET(_req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!COMPLIANCE_ROLES.has(role)) {
    return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('counterfeit_determinations')
    .select(`
      id, verdict, confidence, matched_sku, mismatch_flags, created_at,
      evaluation_id,
      counterfeit_evaluations:evaluation_id ( source, source_reference, image_storage_key, evaluated_at )
    `)
    .eq('human_review_required', true)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    verdict: string;
    confidence: number;
    matched_sku: string | null;
    mismatch_flags: string[];
    created_at: string;
    counterfeit_evaluations: {
      source: string;
      source_reference: Record<string, unknown>;
      image_storage_key: string;
      evaluated_at: string;
    } | null;
  };
  const rows = ((data ?? []) as Row[]).map((r) => ({
    determinationId: r.id,
    verdict: r.verdict,
    confidence: Number(r.confidence),
    matchedSku: r.matched_sku,
    mismatchFlags: r.mismatch_flags ?? [],
    source: r.counterfeit_evaluations?.source ?? 'unknown',
    listingUrl:
      (r.counterfeit_evaluations?.source_reference as { listing_url?: string } | undefined)?.listing_url
      ?? null,
    imageStorageKey: r.counterfeit_evaluations?.image_storage_key ?? null,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ ok: true, rows });
}
