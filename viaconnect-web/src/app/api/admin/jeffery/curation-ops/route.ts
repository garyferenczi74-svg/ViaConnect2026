/**
 * Prompt 227c: Jeffery ACC curation ops (admin only).
 * GET snapshot; POST approve/reject/kill_switch/approve_correction.
 * Class 3 approve never writes kb_peptides regulatory fields.
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  proposalFingerprint,
  recordCurationRejection,
} from '@/lib/sherlock/curation/rejectionLedger227ah';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: Response.json({ error: 'unauthenticated' }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return { error: Response.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  try {
    const gate = await requireAdmin();
    if ('error' in gate && gate.error) return gate.error;

    const admin = createAdminClient();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      killRes,
      cycleRes,
      censusRes,
      queueRes,
      autoRes,
      escalatedRes,
      rejectRes,
      proposals7d,
      rejects7d,
      pendingCorrections,
    ] = await Promise.all([
      admin
        .from('sherlock_curation_kill_switch')
        .select('is_halted, set_by, set_at, reason, updated_at')
        .eq('id', 1)
        .maybeSingle(),
      admin
        .from('curation_cycles')
        .select(
          'id, status, started_at, ended_at, gaps_closed, proposals_raised, negative_results_count, yield_by_source_tier, budget, kill_switch_hit, error_message',
        )
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('curation_gap_census_snapshots')
        .select('computed_at, counts')
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('curation_proposals')
        .select(
          'id, cycle_id, gap_type, target_table, target_row_id, target_field, change_class, direction, current_value, proposed_value, rationale, supporting_record_ids, source_tier, confidence, status, created_at',
        )
        .in('status', ['proposed', 'escalated'])
        .order('change_class', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(100),
      admin
        .from('curation_proposals')
        .select(
          'id, target_table, target_field, change_class, status, applied_at, applied_by',
        )
        .eq('status', 'auto_applied')
        .order('applied_at', { ascending: false })
        .limit(10),
      admin
        .from('curation_proposals')
        .select(
          'id, target_table, target_field, change_class, rationale, review_note, created_at',
        )
        .eq('status', 'escalated')
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('curation_rejections')
        .select('id, fingerprint, reason, created_at, proposal_id')
        .order('created_at', { ascending: false })
        .limit(20),
      admin
        .from('curation_proposals')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since7d),
      admin
        .from('curation_rejections')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since7d),
      admin
        .from('curation_corrections')
        .select('id, compound_slug, public_summary, marshall_status, occurred_at')
        .eq('marshall_status', 'pending')
        .order('occurred_at', { ascending: false })
        .limit(20),
    ]);

    const queue = queueRes.data ?? [];
    const queueDepthByClass: Record<string, number> = {};
    for (const row of queue) {
      const k = String(row.change_class);
      queueDepthByClass[k] = (queueDepthByClass[k] ?? 0) + 1;
    }

    const p7 = proposals7d.count ?? 0;
    const r7 = rejects7d.count ?? 0;
    const reProposalRate =
      p7 === 0 ? null : Number((r7 / p7).toFixed(3));

    return Response.json({
      ok: true,
      prompt: '227c',
      killSwitch: killRes.data ?? {
        is_halted: false,
        set_by: null,
        set_at: null,
        reason: '',
      },
      lastCycle: cycleRes.data ?? null,
      census: censusRes.data ?? null,
      queue,
      queueDepthByClass,
      queueDepth: queue.length,
      recentAutoApplied: autoRes.data ?? [],
      escalated: escalatedRes.data ?? [],
      rejections: rejectRes.data ?? [],
      reProposalRate,
      reProposalRateUnknown: p7 === 0,
      yieldBySourceTier:
        cycleRes.data?.yield_by_source_tier &&
        typeof cycleRes.data.yield_by_source_tier === 'object'
          ? cycleRes.data.yield_by_source_tier
          : {},
      budget: cycleRes.data?.budget ?? {
        note: 'G64 ceiling unset until measured steady state',
      },
      pendingCorrections: pendingCorrections.data ?? [],
      class3ApproveNote:
        'Class 3 approve records Jeffery clearance only. It does not write FDA, WADA, or 503A fields. Lex fill is separate.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('api.admin.jeffery.curation-ops', 'GET threw', {
      error: message,
    });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireAdmin();
    if ('error' in gate && gate.error) return gate.error;
    const user = gate.user!;
    const body = (await request.json()) as {
      action?: string;
      proposalId?: string;
      reason?: string;
      halted?: boolean;
      correctionId?: string;
    };

    const admin = createAdminClient();
    const action = String(body.action ?? '');

    if (action === 'kill_switch') {
      const halted = body.halted === true;
      const { error } = await admin
        .from('sherlock_curation_kill_switch')
        .upsert({
          id: 1,
          is_halted: halted,
          set_by: user.email ?? user.id,
          set_at: new Date().toISOString(),
          reason: String(body.reason ?? (halted ? 'halted_by_admin' : 'resumed_by_admin')).slice(
            0,
            500,
          ),
          updated_at: new Date().toISOString(),
        });
      if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 200 });
      }
      return Response.json({ ok: true, action: 'kill_switch', halted });
    }

    if (action === 'approve_correction') {
      const id = String(body.correctionId ?? '');
      if (!id) {
        return Response.json({ ok: false, error: 'correctionId_required' }, { status: 200 });
      }
      const { error } = await admin
        .from('curation_corrections')
        .update({ marshall_status: 'approved' })
        .eq('id', id)
        .eq('marshall_status', 'pending');
      if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 200 });
      }
      return Response.json({ ok: true, action: 'approve_correction', correctionId: id });
    }

    if (action === 'approve' || action === 'reject') {
      const proposalId = String(body.proposalId ?? '');
      if (!proposalId) {
        return Response.json({ ok: false, error: 'proposalId_required' }, { status: 200 });
      }

      const { data: proposal, error: loadErr } = await admin
        .from('curation_proposals')
        .select(
          'id, status, change_class, target_table, target_row_id, target_field, proposed_value, supporting_record_ids',
        )
        .eq('id', proposalId)
        .maybeSingle();

      if (loadErr || !proposal) {
        return Response.json(
          { ok: false, error: loadErr?.message ?? 'proposal_not_found' },
          { status: 200 },
        );
      }
      if (proposal.status !== 'proposed' && proposal.status !== 'escalated') {
        return Response.json(
          { ok: false, error: 'not_reviewable' },
          { status: 200 },
        );
      }

      const now = new Date().toISOString();

      if (action === 'reject') {
        const reason = String(body.reason ?? '').trim();
        if (!reason) {
          return Response.json(
            { ok: false, error: 'reason_required' },
            { status: 200 },
          );
        }
        const fingerprint = proposalFingerprint({
          targetTable: String(proposal.target_table),
          targetRowId: proposal.target_row_id
            ? String(proposal.target_row_id)
            : null,
          targetField: String(proposal.target_field),
          proposedValue: proposal.proposed_value,
        });
        const supporting = Array.isArray(proposal.supporting_record_ids)
          ? (proposal.supporting_record_ids as string[]).map(String)
          : [];
        const ledger = await recordCurationRejection(admin, {
          proposalId: proposal.id,
          fingerprint,
          reason,
          supportingRecordIds: supporting,
        });
        if (!ledger.ok) {
          return Response.json(
            {
              ok: false,
              error: ledger.error ?? 'rejection_ledger_failed',
            },
            { status: 200 },
          );
        }
        const { error } = await admin
          .from('curation_proposals')
          .update({
            status: 'rejected',
            reviewed_by: user.email ?? user.id,
            reviewed_at: now,
            review_note: reason.slice(0, 2000),
            updated_at: now,
          })
          .eq('id', proposalId);
        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 200 });
        }
        return Response.json({
          ok: true,
          action: 'reject',
          proposalId,
          fingerprint,
        });
      }

      // approve: never UPDATE kb_peptides here (including Class 3).
      const { error } = await admin
        .from('curation_proposals')
        .update({
          status: 'approved',
          reviewed_by: user.email ?? user.id,
          reviewed_at: now,
          review_note:
            Number(proposal.change_class) >= 3
              ? 'Jeffery clearance only. No regulatory field write. Lex fill separate.'
              : 'Approved by Jeffery ACC',
          updated_at: now,
        })
        .eq('id', proposalId);
      if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 200 });
      }
      return Response.json({
        ok: true,
        action: 'approve',
        proposalId,
        changeClass: proposal.change_class,
        wroteKbPeptides: false,
      });
    }

    return Response.json({ ok: false, error: 'unknown_action' }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('api.admin.jeffery.curation-ops', 'POST threw', {
      error: message,
    });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
