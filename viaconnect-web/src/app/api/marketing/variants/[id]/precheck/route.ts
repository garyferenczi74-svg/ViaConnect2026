// Prompt #138a Phase 3 — run Marshall pre-check on a variant.
//
// POST /api/marketing/variants/[id]/precheck
// Body: { clinicianConsentOnFile?, timeSubstantiationOnFile?, scientificSubstantiationOnFile? }
//
// Runs preCheckVariant() against the variant's three text fields, then writes
// the result back to marketing_copy_variants and logs precheck_completed.
// Also runs word-count validation as a precondition.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { preCheckVariant } from '@/lib/marketing/variants/precheck';
import { validateWordCounts } from '@/lib/marketing/variants/wordCount';
import { logVariantEvent } from '@/lib/marketing/variants/logging';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as {
    clinicianConsentOnFile?: boolean;
    timeSubstantiationOnFile?: boolean;
    scientificSubstantiationOnFile?: boolean;
  } | null;

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: variant, error: readErr } = await (supabase as any)
    .from('marketing_copy_variants')
    .select('id, headline_text, subheadline_text, cta_label, archived')
    .eq('id', params.id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!variant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (variant.archived) {
    return NextResponse.json({ error: 'Cannot pre-check archived variant.' }, { status: 409 });
  }

  // Word-count validation precondition.
  const wc = validateWordCounts(variant.headline_text, variant.subheadline_text);
  if (!wc.ok) {
    return NextResponse.json(
      { error: 'Word-count validation failed.', wordCount: wc },
      { status: 422 },
    );
  }

  const result = await preCheckVariant({
    headline: variant.headline_text,
    subheadline: variant.subheadline_text,
    ctaLabel: variant.cta_label,
    clinicianConsentOnFile: body?.clinicianConsentOnFile,
    timeSubstantiationOnFile: body?.timeSubstantiationOnFile,
    scientificSubstantiationOnFile: body?.scientificSubstantiationOnFile,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (supabase as any)
    .from('marketing_copy_variants')
    .update({
      word_count_validated: true,
      marshall_precheck_passed: result.passed,
    })
    .eq('id', params.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logVariantEvent(supabase, {
    variantId: params.id,
    eventKind: 'precheck_completed',
    eventDetail: {
      passed: result.passed,
      blocker_count: result.blockerCount,
      warn_count: result.warnCount,
      finding_rule_ids: result.findings.map((f) => f.ruleId),
    },
    actorUserId: auth.user.id,
  });

  return NextResponse.json({
    ok: true,
    wordCount: wc,
    passed: result.passed,
    blockerCount: result.blockerCount,
    warnCount: result.warnCount,
    findings: result.findings,
  });
}
