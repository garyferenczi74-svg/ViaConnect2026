// Prompt #105 Phase 2b.2 — render a board pack artifact (PDF / XLSX / PPTX).
//
// POST /api/admin/exec-reporting/packs/[packId]/render
// Body: { format: 'pdf' | 'xlsx' | 'pptx', distributionId?: string }
//
//  - format=pdf + distributionId  → per-recipient watermarked PDF
//  - format=pdf + no distributionId → admin preview PDF (no watermark)
//  - format=xlsx | pptx            → same output regardless of recipient
//    (per-cell watermarking defeats search; identity tracking lives in
//    distribution + download_event rows)
//
// Pipeline:
//   1. Admin guard.
//   2. Fetch pack + sections + KPI snapshots.
//   3. Resolve aggregation snapshot state: must be cfo_approved or locked.
//   4. If distributionId provided: resolve distribution + board_member for
//      watermark; verify pack_id matches; reject if access_revoked_at.
//   5. Render bytes via lib/executiveReporting/rendering/*.
//   6. Compute SHA-256, upload to storage, insert board_pack_artifacts row.
//   7. Append audit log.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireExecReportingAdmin } from '@/lib/executiveReporting/admin-guard';
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

// Aggregation snapshot states where consumption in a board pack is allowed.
const CONSUMABLE_SNAPSHOT_STATES = new Set(['cfo_approved', 'locked']);

interface RenderBody {
  format: 'pdf' | 'xlsx' | 'pptx';
  distributionId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { packId: string } },
): Promise<NextResponse> {
  const auth = await requireExecReportingAdmin();
  if (auth.kind === 'error') return auth.response;

  let body: RenderBody;
  try {
    body = (await request.json()) as RenderBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (!body.format || !['pdf', 'xlsx', 'pptx'].includes(body.format)) {
    return NextResponse.json({ error: 'format must be pdf|xlsx|pptx' }, { status: 400 });
  }
  if (body.distributionId && body.format !== 'pdf') {
    return NextResponse.json(
      { error: 'watermarked distribution rendering only supported for PDF' },
      { status: 400 },
    );
  }

  const sb = createAdminClient() as unknown as {
    from: (t: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: (s: string) => any;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storage: any;
  };

  // Fetch pack.
  const { data: pack, error: pErr } = await (sb.from('board_packs').select(
    'pack_id, short_code, pack_title, period_type, period_start, period_end, state, aggregation_snapshot_id, ceo_issued_at',
  ) as unknown as {
    eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }> };
  }).eq('pack_id', params.packId).maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!pack) return NextResponse.json({ error: 'pack not found' }, { status: 404 });

  // Verify snapshot state.
  const { data: snap } = await (sb.from('aggregation_snapshots').select('snapshot_id, state') as unknown as {
    eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { snapshot_id: string; state: string } | null }> };
  }).eq('snapshot_id', pack.aggregation_snapshot_id as string).maybeSingle();
  if (!snap || !CONSUMABLE_SNAPSHOT_STATES.has(snap.state)) {
    return NextResponse.json({
      error: 'aggregation snapshot not in consumable state (cfo_approved or locked)',
      state: snap?.state,
    }, { status: 409 });
  }

  // Fetch sections (ordered).
  const { data: sections } = await (sb.from('board_pack_sections').select(
    'section_order, title, commentary_md, commentary_source',
  ) as unknown as {
    eq: (k: string, v: string) => {
      order: (k: string, opts: { ascending: boolean }) => Promise<{ data: Array<Record<string, unknown>> | null }>;
    };
  }).eq('pack_id', params.packId).order('section_order', { ascending: true });

  // Fetch KPI snapshots + join to kpi_library for display names.
  const { data: kpis } = await (sb.from('board_pack_kpi_snapshots').select(`
    kpi_id, kpi_version, unit,
    computed_value_numeric, computed_value_integer,
    prior_period_value, comparison_delta_pct,
    kpi_library!inner(display_name)
  `) as unknown as {
    eq: (k: string, v: string) => Promise<{ data: Array<Record<string, unknown>> | null }>;
  }).eq('aggregation_snapshot_id', pack.aggregation_snapshot_id as string);

  const kpiRows = (kpis ?? []).map((k) => {
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

  const sectionRows = (sections ?? []).map((s) => ({
    sectionOrder: s.section_order as number,
    title: s.title as string,
    commentaryMd: (s.commentary_md as string | null) ?? null,
    commentarySource: s.commentary_source as 'system' | 'ai_drafted' | 'human_authored' | 'ai_drafted_human_edited',
  }));

  // Resolve recipient if distribution provided.
  let recipient: { name: string; email: string; token: string; distributedAtISO: string } | undefined;
  let distributionIdForArtifact: string | null = null;

  if (body.distributionId) {
    const { data: dist } = await (sb.from('board_pack_distributions').select(`
      distribution_id, pack_id, watermark_token, distributed_at, access_revoked_at,
      board_members!inner(display_name, email_distribution)
    `) as unknown as {
      eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> };
    }).eq('distribution_id', body.distributionId).maybeSingle();

    if (!dist) {
      return NextResponse.json({ error: 'distribution not found' }, { status: 404 });
    }
    if (dist.pack_id !== params.packId) {
      return NextResponse.json({ error: 'distribution does not belong to this pack' }, { status: 409 });
    }
    if (dist.access_revoked_at) {
      return NextResponse.json({ error: 'distribution access revoked' }, { status: 409 });
    }
    const bm = (dist as { board_members?: { display_name?: string; email_distribution?: string } }).board_members;
    recipient = {
      name: bm?.display_name ?? 'Board Member',
      email: bm?.email_distribution ?? '',
      token: dist.watermark_token as string,
      distributedAtISO: dist.distributed_at as string,
    };
    distributionIdForArtifact = dist.distribution_id as string;
  }

  // Render.
  let bytes: Uint8Array;
  try {
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
        fileKind: recipient ? 'distribution' : 'preview',
        recipient,
      });
    } else if (body.format === 'xlsx') {
      bytes = await renderBoardPackXlsx({
        packTitle: pack.pack_title as string,
        shortCode: pack.short_code as string,
        periodType: pack.period_type as string,
        periodStart: pack.period_start as string,
        periodEnd: pack.period_end as string,
        kpiRows,
        sections: sectionRows,
      });
    } else {
      bytes = await renderBoardPackPptx({
        packTitle: pack.pack_title as string,
        shortCode: pack.short_code as string,
        periodType: pack.period_type as string,
        periodStart: pack.period_start as string,
        periodEnd: pack.period_end as string,
        kpiRows,
        sections: sectionRows,
      });
    }
  } catch (err) {
    return NextResponse.json({
      error: 'render_failed',
      detail: err instanceof Error ? err.message : 'unknown',
    }, { status: 500 });
  }

  const sha = await sha256Hex(bytes);

  // Storage path: {pack_id}/{distribution_id}-{format}.{ext}
  //               or {pack_id}/preview.{format} for admin preview.
  const ext = body.format;
  const name = distributionIdForArtifact ? `${distributionIdForArtifact}-${ext}` : `preview-${Date.now()}`;
  const path = `${params.packId}/${name}.${ext}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = (sb as any).storage;
  const { error: upErr } = await storage.from(BUCKET).upload(path, bytes, {
    contentType: MIME[body.format], upsert: true,
  });
  if (upErr) {
    return NextResponse.json({ error: `upload failed: ${upErr.message}` }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = sb as any;
  const { data: artifact, error: aErr } = await admin
    .from('board_pack_artifacts')
    .insert({
      pack_id: params.packId,
      distribution_id: distributionIdForArtifact,
      artifact_format: body.format,
      storage_path: path,
      sha256_hash: sha,
      byte_size: bytes.byteLength,
    })
    .select('artifact_id')
    .single();
  if (aErr || !artifact) {
    // Best-effort cleanup of the uploaded blob if the metadata insert failed.
    await storage.from(BUCKET).remove([path]).catch(() => {});
    return NextResponse.json({ error: aErr?.message ?? 'artifact row insert failed' }, { status: 500 });
  }

  await admin.from('executive_reporting_audit_log').insert({
    action_category: 'pack',
    action_verb: `pack.artifact_rendered.${body.format}`,
    target_table: 'board_pack_artifacts',
    target_id: artifact.artifact_id,
    pack_id: params.packId,
    actor_user_id: auth.userId,
    actor_role: auth.role,
    context_json: {
      format: body.format,
      distribution_id: distributionIdForArtifact,
      byte_size: bytes.byteLength,
      sha256: sha,
    },
  });

  return NextResponse.json({
    artifact_id: artifact.artifact_id,
    storage_path: path,
    sha256: sha,
    byte_size: bytes.byteLength,
    distribution_id: distributionIdForArtifact,
    file_kind: recipient ? 'distribution' : 'preview',
  });
}
