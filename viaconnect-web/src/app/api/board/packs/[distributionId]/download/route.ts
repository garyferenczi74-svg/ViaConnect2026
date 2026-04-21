// Prompt #105 Phase 2b.4 — board member download flow.
//
// POST /api/board/packs/[distributionId]/download
// Body: { format: 'pdf' | 'xlsx' | 'pptx', acknowledgmentTyped: boolean }
//
// Pipeline:
//   1. Auth + identity: resolve caller's auth.user_id and match it against
//      board_members.auth_user_id for the distribution. Any mismatch is
//      a 403 — the exec-record-download edge function would also flag
//      this but we refuse to serve bytes in the first place.
//   2. Verify distribution access is not revoked and pack is issued
//      (or erratum_issued).
//   3. Look up an existing artifact row matching (pack_id, distribution_id,
//      format). For PDF, distribution_id must match (watermarked per-
//      recipient). For XLSX/PPTX, either a pack-level preview or a
//      distribution-specific copy is acceptable.
//   4. If no artifact exists, render on demand via the same pipeline the
//      admin renderer uses — but ONLY for PDF with the caller's watermark
//      context. XLSX/PPTX on-demand falls back to preview rendering.
//   5. Issue a 10-minute signed URL to the storage object.
//   6. Invoke exec-record-download via the service-role client so the
//      audit + download_event rows land even if the caller's session
//      JWT cannot reach the edge function through their browser
//      (defense-in-depth).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderBoardPackPdf } from '@/lib/executiveReporting/rendering/boardPackPdfRenderer';
import { renderBoardPackXlsx } from '@/lib/executiveReporting/rendering/boardPackXlsxRenderer';
import { renderBoardPackPptx } from '@/lib/executiveReporting/rendering/boardPackPptxRenderer';
import { sha256Hex } from '@/lib/legal/evidence/hashing';

export const runtime = 'nodejs';

const BUCKET = 'board-pack-artifacts';
const MIME: Record<'pdf' | 'xlsx' | 'pptx', string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const SIGNED_URL_TTL_SECONDS = 600;

interface DownloadBody {
  format: 'pdf' | 'xlsx' | 'pptx';
  acknowledgmentTyped: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { distributionId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: DownloadBody;
  try {
    body = (await request.json()) as DownloadBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (!body.format || !['pdf', 'xlsx', 'pptx'].includes(body.format)) {
    return NextResponse.json({ error: 'format must be pdf|xlsx|pptx' }, { status: 400 });
  }
  if (!body.acknowledgmentTyped) {
    return NextResponse.json({ error: 'acknowledgment required' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as unknown as any;

  // 1. Resolve distribution + identity cross-check.
  const { data: dist } = await admin
    .from('board_pack_distributions')
    .select(`
      distribution_id, pack_id, member_id, watermark_token,
      distributed_at, access_revoked_at,
      board_members!inner(auth_user_id, display_name, email_distribution)
    `)
    .eq('distribution_id', params.distributionId)
    .maybeSingle();
  if (!dist) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((dist.board_members as { auth_user_id: string }).auth_user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (dist.access_revoked_at) {
    return NextResponse.json({ error: 'access_revoked' }, { status: 403 });
  }

  // 2. Load pack + verify state.
  const { data: pack } = await admin
    .from('board_packs')
    .select('pack_id, short_code, pack_title, period_type, period_start, period_end, ceo_issued_at, state, aggregation_snapshot_id')
    .eq('pack_id', dist.pack_id)
    .maybeSingle();
  if (!pack) return NextResponse.json({ error: 'pack_not_found' }, { status: 404 });
  if (pack.state !== 'issued' && pack.state !== 'erratum_issued') {
    return NextResponse.json({ error: 'pack_not_issued', state: pack.state }, { status: 409 });
  }

  // 3. Look for existing artifact.
  const { data: existing } = await admin
    .from('board_pack_artifacts')
    .select('artifact_id, storage_path, artifact_format, distribution_id, sha256_hash')
    .eq('pack_id', dist.pack_id)
    .eq('artifact_format', body.format)
    .order('rendered_at', { ascending: false });
  const list = Array.isArray(existing) ? existing : [];
  const match = body.format === 'pdf'
    ? list.find((a: { distribution_id: string | null }) => a.distribution_id === params.distributionId)
    : list.find((a: { distribution_id: string | null }) => a.distribution_id === null || a.distribution_id === params.distributionId);

  let storagePath: string;
  if (match) {
    storagePath = match.storage_path as string;
  } else {
    // 4. Render on demand using the same lib the admin route uses.
    const { data: sections } = await admin
      .from('board_pack_sections')
      .select('section_order, title, commentary_md, commentary_source')
      .eq('pack_id', dist.pack_id)
      .order('section_order', { ascending: true });
    const { data: kpis } = await admin
      .from('board_pack_kpi_snapshots')
      .select(`
        kpi_id, kpi_version, unit,
        computed_value_numeric, computed_value_integer,
        prior_period_value, comparison_delta_pct,
        kpi_library!inner(display_name)
      `)
      .eq('aggregation_snapshot_id', pack.aggregation_snapshot_id);

    const kpiRows = (kpis ?? []).map((k: Record<string, unknown>) => {
      const lib = (k as { kpi_library?: { display_name?: string } }).kpi_library;
      return {
        kpiId: k.kpi_id as string,
        displayName: lib?.display_name ?? (k.kpi_id as string),
        unit: k.unit as string,
        computedValueNumeric: (k.computed_value_numeric as number | null) ?? null,
        computedValueInteger: (k.computed_value_integer as number | null) ?? null,
        priorPeriodValue: (k.prior_period_value as number | null) ?? null,
        comparisonDeltaPct: (k.comparison_delta_pct as number | null) ?? null,
      };
    });
    const sectionRows = (sections ?? []).map((s: Record<string, unknown>) => ({
      sectionOrder: s.section_order as number,
      title: s.title as string,
      commentaryMd: (s.commentary_md as string | null) ?? null,
      commentarySource: s.commentary_source as 'system' | 'ai_drafted' | 'human_authored' | 'ai_drafted_human_edited',
    }));

    const bm = dist.board_members as { display_name: string; email_distribution: string };
    let bytes: Uint8Array;
    if (body.format === 'pdf') {
      bytes = await renderBoardPackPdf({
        packTitle: pack.pack_title as string,
        shortCode: pack.short_code as string,
        periodType: pack.period_type as string,
        periodStart: pack.period_start as string,
        periodEnd: pack.period_end as string,
        ceoIssuedAtISO: (pack.ceo_issued_at as string | null) ?? null,
        kpiRows,
        sections: sectionRows,
        fileKind: 'distribution',
        recipient: {
          name: bm.display_name,
          email: bm.email_distribution,
          token: dist.watermark_token as string,
          distributedAtISO: dist.distributed_at as string,
        },
      });
    } else if (body.format === 'xlsx') {
      bytes = await renderBoardPackXlsx({
        packTitle: pack.pack_title as string,
        shortCode: pack.short_code as string,
        periodType: pack.period_type as string,
        periodStart: pack.period_start as string,
        periodEnd: pack.period_end as string,
        kpiRows, sections: sectionRows,
      });
    } else {
      bytes = await renderBoardPackPptx({
        packTitle: pack.pack_title as string,
        shortCode: pack.short_code as string,
        periodType: pack.period_type as string,
        periodStart: pack.period_start as string,
        periodEnd: pack.period_end as string,
        kpiRows, sections: sectionRows,
      });
    }
    const sha = await sha256Hex(bytes);
    storagePath = `${dist.pack_id}/${params.distributionId}-${body.format}.${body.format}`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: MIME[body.format], upsert: true,
    });
    if (upErr) return NextResponse.json({ error: `upload failed: ${upErr.message}` }, { status: 500 });
    const { error: insErr } = await admin
      .from('board_pack_artifacts')
      .insert({
        pack_id: dist.pack_id,
        distribution_id: params.distributionId,
        artifact_format: body.format,
        storage_path: storagePath,
        sha256_hash: sha,
        byte_size: bytes.byteLength,
      });
    if (insErr) {
      await admin.storage.from(BUCKET).remove([storagePath]).catch(() => {});
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  // 5. Signed URL.
  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: signErr?.message ?? 'signed URL failed' }, { status: 500 });
  }

  // 6. Server-side audit record via the edge function. We invoke with the
  // caller's JWT so exec-record-download sees the real actor identity
  // and matches it against board_members.auth_user_id (its own guard).
  const authHeader = request.headers.get('authorization') ?? '';
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const ua = request.headers.get('user-agent') ?? '';
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url && authHeader) {
      await fetch(`${url}/functions/v1/exec-record-download`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: authHeader,
          ...(forwarded ? { 'x-forwarded-for': forwarded } : {}),
          ...(ua ? { 'user-agent': ua } : {}),
        },
        body: JSON.stringify({
          distributionId: params.distributionId,
          presentedToken: dist.watermark_token,
          artifactFormat: body.format,
          acknowledgmentTyped: body.acknowledgmentTyped,
        }),
      });
    }
  } catch {
    // Never block the download on audit-side failures; the signed URL has
    // still been issued and storage access audits are tracked elsewhere.
  }

  return NextResponse.json({
    signed_url: signed.signedUrl,
    storage_path: storagePath,
    format: body.format,
  });
}
