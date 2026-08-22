/**
 * Prompt 227d: live rejection-ledger block + G64 budget ceiling from measured cycles.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { runCurationCycle227a } from '@/lib/sherlock/curation/runCurationCycle227a';
import {
  isRejectedWithoutNewEvidence,
  proposalFingerprint,
  recordCurationRejection,
} from '@/lib/sherlock/curation/rejectionLedger227ah';
import {
  deriveCeilingFromCycles,
  loadBudgetCeiling,
  setBudgetCeiling,
} from '@/lib/sherlock/curation/budgetCeiling227d';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const admin = createAdminClient();

    // 1. Pick a proposed Class 3 (or any proposed) to reject.
    let { data: target } = await admin
      .from('curation_proposals')
      .select(
        'id, target_table, target_row_id, target_field, proposed_value, supporting_record_ids, change_class, status',
      )
      .eq('status', 'proposed')
      .eq('change_class', 3)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!target) {
      // Ensure there is something to reject: run a short cycle first.
      await runCurationCycle227a({
        maxClass3Proposals: 3,
        maxClass0Freshness: 0,
        maxNegativeSamples: 0,
      });
      const again = await admin
        .from('curation_proposals')
        .select(
          'id, target_table, target_row_id, target_field, proposed_value, supporting_record_ids, change_class, status',
        )
        .eq('status', 'proposed')
        .eq('change_class', 3)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      target = again.data;
    }

    if (!target?.id) {
      return Response.json(
        { ok: false, error: 'no_class3_proposal_to_reject' },
        { status: 200 },
      );
    }

    const supporting = Array.isArray(target.supporting_record_ids)
      ? (target.supporting_record_ids as string[]).map(String)
      : [];
    const fingerprint = proposalFingerprint({
      targetTable: String(target.target_table),
      targetRowId: target.target_row_id
        ? String(target.target_row_id)
        : null,
      targetField: String(target.target_field),
      proposedValue: target.proposed_value,
    });

    const ledger = await recordCurationRejection(admin, {
      proposalId: String(target.id),
      fingerprint,
      reason: '227d_prove_rejection_ledger_block',
      supportingRecordIds: supporting,
    });
    if (!ledger.ok) {
      return Response.json(
        { ok: false, error: ledger.error ?? 'ledger_insert_failed' },
        { status: 200 },
      );
    }

    const now = new Date().toISOString();
    await admin
      .from('curation_proposals')
      .update({
        status: 'rejected',
        reviewed_by: 'prove_227d',
        reviewed_at: now,
        review_note: '227d_prove_rejection_ledger_block',
        updated_at: now,
      })
      .eq('id', target.id);

    // 2. Direct ledger check must block identical re-propose.
    const blockedCheck = await isRejectedWithoutNewEvidence(
      admin,
      fingerprint,
      supporting,
    );

    // 3. Run a cycle that will re-hit the same ordered Class 3 set.
    const cycle = await runCurationCycle227a({
      maxClass3Proposals: 8,
      maxClass0Freshness: 0,
      maxNegativeSamples: 2,
    });

    // 4. Confirm no new proposed row for that exact target+field with same fingerprint value.
    const { data: resurrected } = await admin
      .from('curation_proposals')
      .select('id, status, created_at')
      .eq('status', 'proposed')
      .eq('target_table', target.target_table)
      .eq('target_field', target.target_field)
      .eq('target_row_id', target.target_row_id)
      .gt('created_at', now);

    // 5. Measure cycles and set G64 ceiling.
    const { data: cycles } = await admin
      .from('curation_cycles')
      .select('id, budget, proposals_raised, negative_results_count, status')
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(20);

    const derived = deriveCeilingFromCycles(
      (cycles ?? []).map((c) => ({
        budget:
          c.budget && typeof c.budget === 'object'
            ? (c.budget as {
                maxClass3?: number;
                maxClass0?: number;
                proposalsSkippedRejected?: number;
              })
            : null,
        proposals_raised:
          c.proposals_raised && typeof c.proposals_raised === 'object'
            ? (c.proposals_raised as Record<string, number>)
            : null,
        negative_results_count: Number(c.negative_results_count ?? 0),
      })),
    );

    const setResult = await setBudgetCeiling({
      maxClass3: derived.maxClass3,
      maxClass0: derived.maxClass0,
      maxNegatives: derived.maxNegatives,
      measuredCycleCount: derived.measured,
      setBy: 'prove_227d',
      notes: derived.note,
    });

    const ceiling = await loadBudgetCeiling();

    const skipped =
      cycle.proposalsSkippedRejected > 0 ||
      blockedCheck.blocked === true;
    const noResurrect = (resurrected ?? []).length === 0;

    const ok =
      ledger.ok &&
      blockedCheck.blocked === true &&
      skipped &&
      noResurrect &&
      cycle.ok &&
      setResult.ok;

    return Response.json({
      ok,
      prompt: '227d',
      phase: 'rejection_ledger_and_g64',
      rejectedProposalId: target.id,
      fingerprint: fingerprint.slice(0, 16),
      ledgerBlockedDirect: blockedCheck.blocked,
      cycleId: cycle.cycleId,
      proposalsSkippedRejected: cycle.proposalsSkippedRejected,
      resurrectedProposedCount: (resurrected ?? []).length,
      budgetApplied: cycle.budgetApplied ?? null,
      g64: {
        setOk: setResult.ok,
        derived,
        ceiling,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.prove-227d', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
