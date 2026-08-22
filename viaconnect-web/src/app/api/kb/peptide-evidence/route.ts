/**
 * Prompt 226h Wave B: shared peptide evidence briefing (Research Hub Evidence tab / Hannah).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  evidenceRecordIds,
  loadPeptideEvidenceBundle,
} from '@/lib/kb/unifiedEvidence226h';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';
  const slug = url.searchParams.get('slug') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? '20');

  try {
    const bundle = await loadPeptideEvidenceBundle({
      query: q || undefined,
      slug,
      limit,
    });
    return NextResponse.json({
      ok: true,
      bundle,
      recordIds: evidenceRecordIds(bundle),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'evidence_failed',
      },
      { status: 200 },
    );
  }
}
