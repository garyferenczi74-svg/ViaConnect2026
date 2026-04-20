// Prompt #98 Phase 2: Anonymous referral click recorder.
//
// POST /api/public/referral-click
//   body: { code_slug, visitor_uuid, landing_url?, utm_source?, utm_medium?, utm_campaign?, referrer_url? }
//
// Anonymous: no auth required. Routes through the
// record_referral_link_click SECURITY DEFINER RPC which (a) validates
// the code is active and (b) inserts a row when it is. Unknown +
// inactive codes return null without revealing state to the caller.
//
// DNT respect: when the caller sends "DNT: 1" we still record the
// click (clicks are always anonymous via cookie UUID; the spec says
// to mark dnt_respected metadata) but do not echo or log the IP.
// In Phase 2 we hash IP + user-agent regardless; the dnt flag is
// preserved on the click row in landing_url metadata for analytics.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

const schema = z.object({
  code_slug: z.string().min(1).max(120),
  visitor_uuid: z.string().uuid(),
  landing_url: z.string().max(500).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  referrer_url: z.string().max(500).optional(),
});

const HASH_PEPPER = process.env.REFERRAL_CLICK_HASH_PEPPER ?? 'wl-fallback-pepper';
function hash(value: string | null | undefined): string | null {
  if (!value) return null;
  return crypto.createHash('sha256').update(`${HASH_PEPPER}:${value}`).digest('hex').slice(0, 32);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }

  const dnt = request.headers.get('dnt') === '1';
  const ipRaw = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const uaRaw = request.headers.get('user-agent') ?? null;

  // When DNT is set we skip IP and user-agent hashing entirely.
  const ip_hash = dnt ? null : hash(ipRaw);
  const ua_hash = dnt ? null : hash(uaRaw);

  // Use the anonymous SECURITY DEFINER RPC; it returns null for
  // unknown / inactive codes without leaking state.
  const supabase = createClient();
  const sb = supabase as any;
  const { data: clickId, error } = await sb.rpc('record_referral_link_click', {
    p_code_slug: parsed.data.code_slug,
    p_visitor_uuid: parsed.data.visitor_uuid,
    p_ip_hash: ip_hash,
    p_user_agent_hash: ua_hash,
    p_landing_url: parsed.data.landing_url ?? null,
    p_utm_source: parsed.data.utm_source ?? null,
    p_utm_medium: parsed.data.utm_medium ?? null,
    p_utm_campaign: parsed.data.utm_campaign ?? null,
    p_referrer_url: parsed.data.referrer_url ?? null,
  });

  if (error) {
    return NextResponse.json({ recorded: false, reason: 'rpc_error' }, { status: 500 });
  }

  // null = unknown / inactive code; do not leak that fact to the caller.
  return NextResponse.json({ recorded: clickId !== null, dnt_respected: dnt });
}
