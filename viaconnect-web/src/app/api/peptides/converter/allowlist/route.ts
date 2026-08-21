/**
 * Prompt 226: Module A allowlist. Fail-closed unavailable, never unfiltered corpus.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadConverterAllowlist } from '@/lib/peptides/converterAllowlist';
import { getActiveConverterDisclaimer } from '@/lib/peptides/converterGate';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const disclaimer = await getActiveConverterDisclaimer();
  if (!disclaimer) {
    return NextResponse.json({
      ok: false,
      unavailable: true,
      reason: 'lex_or_marshall_pending',
      compounds: [],
    });
  }

  const result = await loadConverterAllowlist();
  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      unavailable: true,
      reason: result.reason,
      compounds: [],
    });
  }

  return NextResponse.json({
    ok: true,
    unavailable: false,
    compounds: result.compounds.map((c) => ({
      id: c.id,
      slug: c.slug,
      displayName: c.displayName,
      fdaStatus: c.fdaStatus,
      healthCanadaStatus: c.healthCanadaStatus,
      iuEnabled: c.iuMgFactorVerified && c.iuMgFactor != null && c.iuMgFactor > 0,
    })),
  });
}
