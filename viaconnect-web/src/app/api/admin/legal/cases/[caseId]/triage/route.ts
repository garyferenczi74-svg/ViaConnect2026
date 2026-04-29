// Prompt #104 Phase 5: Triage AI invocation.
//
// POST /api/admin/legal/cases/[caseId]/triage
//   -> loads case + counterparty + evidence summary, builds the
//      triage prompt, calls Claude opus with extended thinking, parses
//      and validates the response, writes the suggestion onto the
//      case. Routes the case to pending_medical_director_review when
//      the AI flags medical claims OR the regex detector fires on
//      case notes.
//
// The AI is advisory only. State stays in 'triage_ai' until Steve
// Rica visits the triage page and confirms the bucket via PATCH on
// the case.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { LEGAL_TRIAGE_SYSTEM_PROMPT, buildTriageUserMessage, type TriageInputBundle } from '@/lib/legal/ai/systemPrompt';
import { extractFirstJsonObject, parseTriageOutput } from '@/lib/legal/ai/triageOutputSchema';
import { scanForMedicalClaims } from '@/lib/legal/ai/medicalClaimDetector';
import { canTransition } from '@/lib/legal/caseStateMachine';
import type { LegalCaseState } from '@/lib/legal/types';
import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';

const claudeBreaker = getCircuitBreaker('claude-api');

export const runtime = 'nodejs';
export const maxDuration = 60;

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);

interface ProfileLite { role: string }

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !LEGAL_OPS_ROLES.has(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Legal-ops access required' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

interface CaseRow {
  case_id: string;
  case_label: string;
  state: string;
  notes: string | null;
  counterparty_id: string | null;
  legal_counterparties: { display_label: string; counterparty_type: string; primary_jurisdiction: string | null; total_cases_count: number; total_settlement_cents: number } | null;
}

interface EvidenceRow { artifact_type: string; description: string | null; captured_at: string }

export async function POST(
  _request: NextRequest,
  { params }: { params: { caseId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOps(supabase);
  if (!ctx.ok) return ctx.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: caseRow } = await sb
    .from('legal_investigation_cases')
    .select(`case_id, case_label, state, notes, counterparty_id,
             legal_counterparties ( display_label, counterparty_type, primary_jurisdiction, total_cases_count, total_settlement_cents )`)
    .eq('case_id', params.caseId)
    .maybeSingle() as { data: CaseRow | null };
  if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  if (caseRow.state !== 'intake') {
    return NextResponse.json({ error: `Triage AI can only run from intake; case is in state ${caseRow.state}` }, { status: 409 });
  }

  const { data: evRows } = await sb
    .from('legal_investigation_evidence')
    .select('artifact_type, description, captured_at')
    .eq('case_id', params.caseId)
    .order('captured_at', { ascending: false })
    .limit(20) as { data: EvidenceRow[] | null };

  const inputBundle: TriageInputBundle = {
    case_label: caseRow.case_label,
    source_violation: null,
    counterparty: caseRow.legal_counterparties
      ? {
          display_label: caseRow.legal_counterparties.display_label,
          counterparty_type: caseRow.legal_counterparties.counterparty_type,
          primary_jurisdiction: caseRow.legal_counterparties.primary_jurisdiction ?? null,
        }
      : null,
    product: null,
    evidence_summary: evRows ?? [],
    prior_cases_for_counterparty: caseRow.legal_counterparties?.total_cases_count ?? 0,
    prior_settlements_for_counterparty_cents: caseRow.legal_counterparties?.total_settlement_cents ?? 0,
  };

  // Move case to 'triage_ai' state up-front so the UI reflects work in progress.
  const transitionToTriage = canTransition({ from: caseRow.state as LegalCaseState, to: 'triage_ai' });
  if (transitionToTriage.ok) {
    await sb.from('legal_investigation_cases').update({ state: 'triage_ai', updated_at: new Date().toISOString() }).eq('case_id', params.caseId);
  }

  // Call Claude opus with extended thinking.
  const userMessage = buildTriageUserMessage(inputBundle);
  let claudeJson: unknown;
  try {
    const r = await claudeBreaker.execute(() =>
      withAbortTimeout(
        (signal) => fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-opus-4-7',
            max_tokens: 24000,
            thinking: { type: 'enabled', budget_tokens: 18000 },
            system: LEGAL_TRIAGE_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
          }),
          signal,
        }),
        50000,
        'api.admin.legal.triage.claude',
      )
    );
    claudeJson = await r.json();
    if (!r.ok) throw new Error((claudeJson as { error?: { message?: string } })?.error?.message ?? `Anthropic HTTP ${r.status}`);
  } catch (e) {
    if (isCircuitBreakerError(e)) safeLog.warn('api.admin.legal.triage', 'claude circuit open', { caseId: params.caseId, error: e });
    else if (isTimeoutError(e)) safeLog.warn('api.admin.legal.triage', 'claude timeout', { caseId: params.caseId, error: e });
    else safeLog.error('api.admin.legal.triage', 'claude call failed', { caseId: params.caseId, error: e });
    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id, actor_role: ctx.role,
      action_category: 'case', action_verb: 'triage_ai_error',
      target_table: 'legal_investigation_cases', target_id: params.caseId, case_id: params.caseId,
      context_json: { error: (e as Error).message },
    });
    return NextResponse.json({ error: `Triage AI call failed: ${(e as Error).message}` }, { status: 502 });
  }

  // Extract structured output. Claude responses with extended thinking
  // place the JSON in the last text block.
  const blocks = ((claudeJson as { content?: Array<{ type: string; text?: string }> })?.content ?? []);
  const textBlock = [...blocks].reverse().find((b) => b.type === 'text')?.text ?? '';
  const obj = extractFirstJsonObject(textBlock);
  const validation = parseTriageOutput(obj);

  if (!validation.ok) {
    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id, actor_role: ctx.role,
      action_category: 'case', action_verb: 'triage_ai_malformed',
      target_table: 'legal_investigation_cases', target_id: params.caseId, case_id: params.caseId,
      context_json: { errors: validation.errors, raw_text: textBlock.slice(0, 4000) },
    });
    // Drop the case into pending_human_triage; the human reviewer will
    // classify manually.
    await sb.from('legal_investigation_cases').update({
      state: 'pending_human_triage',
      updated_at: new Date().toISOString(),
    }).eq('case_id', params.caseId);
    return NextResponse.json({ error: 'Triage AI output malformed; case routed to pending_human_triage', errors: validation.errors }, { status: 422 });
  }

  const out = validation.output;

  // Defense in depth: regex pre-check on case notes too.
  const regexScan = scanForMedicalClaims(caseRow.notes);
  const medicalClaimFlagged = out.has_medical_claim || regexScan.flagged;

  // Decide next state. Spec §4.1:
  //   triage_ai → pending_medical_director_review (when medical claim detected)
  //   triage_ai → pending_human_triage (otherwise)
  const nextState: LegalCaseState = medicalClaimFlagged ? 'pending_medical_director_review' : 'pending_human_triage';

  await sb.from('legal_investigation_cases').update({
    state: nextState,
    bucket: out.bucket,
    bucket_confidence_score: out.confidence,
    priority: out.suggested_priority,
    has_medical_claim_flag: medicalClaimFlagged,
    metadata_json: {
      ...((caseRow as unknown as { metadata_json?: Record<string, unknown> }).metadata_json ?? {}),
      triage_ai: {
        bucket: out.bucket,
        confidence: out.confidence,
        rationale: out.rationale,
        evidence_citations: out.evidence_citations,
        suggested_template_family: out.suggested_template_family,
        suggested_priority: out.suggested_priority,
        blocking_concerns: out.blocking_concerns,
        medical_claim_quotes: out.medical_claim_quotes,
        regex_scan_matches: regexScan.matched_excerpts,
        ran_at: new Date().toISOString(),
      },
    },
    updated_at: new Date().toISOString(),
  }).eq('case_id', params.caseId);

  await sb.from('legal_case_timeline').insert({
    case_id: params.caseId,
    event_type: 'triage_ai_complete',
    event_description: `AI suggested bucket=${out.bucket} (confidence ${Math.round(out.confidence*100)}%); medical_claim=${medicalClaimFlagged}`,
    actor_user_id: ctx.user_id,
    metadata_json: { suggested_priority: out.suggested_priority, suggested_template_family: out.suggested_template_family },
  });

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id, actor_role: ctx.role,
    action_category: 'case', action_verb: 'triage_ai_complete',
    target_table: 'legal_investigation_cases', target_id: params.caseId, case_id: params.caseId,
    after_state_json: { state: nextState, bucket: out.bucket, confidence: out.confidence, medical_claim_flagged: medicalClaimFlagged },
  });

  return NextResponse.json({
    ok: true,
    next_state: nextState,
    triage: out,
    medical_claim_flagged: medicalClaimFlagged,
    regex_scan_matches: regexScan.matched_excerpts,
  });
}
