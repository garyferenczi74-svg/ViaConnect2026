'use client';

// Prompt #95 Phase 4: approver queue.
// Shows all proposals where the current user has a pending proposal_approvals
// row (decision IS NULL). Advisory-only rows surface in a separate section.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Beaker, CheckCircle2, Clock, XCircle } from 'lucide-react';

const supabase = createClient();

interface QueueRow {
  id: string;
  proposal_id: string;
  approver_role: string;
  is_required: boolean;
  is_advisory: boolean;
  created_at: string;
  proposal: {
    proposal_number: number;
    title: string;
    impact_tier: string;
    status: string;
    submitted_at: string | null;
    is_emergency: boolean;
  } | null;
}

function tierColor(tier: string): string {
  switch (tier) {
    case 'minor': return 'bg-emerald-500/15 text-emerald-300';
    case 'moderate': return 'bg-sky-500/15 text-sky-300';
    case 'major': return 'bg-amber-500/15 text-amber-300';
    case 'structural': return 'bg-red-500/15 text-red-300';
    default: return 'bg-white/[0.06] text-white/60';
  }
}

export default function MyApprovalsPage() {
  const [required, setRequired] = useState<QueueRow[]>([]);
  const [advisory, setAdvisory] = useState<QueueRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from('proposal_approvals')
      .select(
        'id, proposal_id, approver_role, is_required, is_advisory, created_at, proposal:pricing_proposals(proposal_number, title, impact_tier, status, submitted_at, is_emergency)',
      )
      .eq('approver_user_id', userId)
      .is('decision', null)
      .order('created_at', { ascending: true });
    const rows = (data ?? []) as unknown as QueueRow[];
    setRequired(rows.filter((r) => r.is_required && !r.is_advisory));
    setAdvisory(rows.filter((r) => r.is_advisory));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const decide = async (proposalId: string, decision: 'approved' | 'rejected' | 'abstain') => {
    const notes = decision === 'abstain'
      ? ''
      : window.prompt(`Notes for ${decision} (optional):`) ?? '';
    const response = await fetch(`/api/admin/governance/proposals/${proposalId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, notes }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Decision failed: ${err.error ?? response.status}`);
      return;
    }
    const result = await response.json();
    setMessage(
      `Recorded ${decision}. Outcome: ${result.outcome}. Proposal is now ${result.new_proposal_status}.`,
    );
    await refresh();
  };

  const advisoryComment = async (proposalId: string) => {
    const comment = window.prompt('Advisory comment (min 20 characters):') ?? '';
    if (comment.trim().length < 20) return;
    const response = await fetch(`/api/admin/governance/proposals/${proposalId}/advisory-comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Comment failed: ${err.error ?? response.status}`);
      return;
    }
    setMessage('Advisory comment recorded.');
    await refresh();
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/admin/governance/proposals"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Proposals
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} /> My approvals
          </h1>
          <p className="text-xs text-white/55 mt-1">
            {required.length} awaiting your decision . {advisory.length} awaiting advisory comment
          </p>
        </div>

        {message && (
          <div className="rounded-xl bg-[#2DA5A0]/10 border border-[#2DA5A0]/30 px-3 py-2 text-xs text-[#2DA5A0]">
            {message}
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold mb-2">Required decisions</h2>
          {required.length === 0 ? (
            <p className="text-xs text-white/55">No pending required decisions.</p>
          ) : (
            <ul className="space-y-2">
              {required.map((r) => (
                <li key={r.id} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        <Link href={`/admin/governance/proposals/${r.proposal_id}`} className="hover:text-[#2DA5A0]">
                          #{r.proposal?.proposal_number} . {r.proposal?.title}
                        </Link>
                      </p>
                      <p className="text-[11px] text-white/55">
                        role: {r.approver_role}
                        {r.proposal?.submitted_at
                          ? ` . submitted ${new Date(r.proposal.submitted_at).toLocaleString()}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {r.proposal && (
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${tierColor(r.proposal.impact_tier)}`}>
                          {r.proposal.impact_tier}
                        </span>
                      )}
                      {r.proposal?.is_emergency && (
                        <span className="rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-300">
                          EMERGENCY
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => decide(r.proposal_id, 'approved')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 px-3 py-1.5 text-xs font-medium"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(r.proposal_id, 'rejected')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 px-3 py-1.5 text-xs font-medium"
                    >
                      <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(r.proposal_id, 'abstain')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-white/75 hover:bg-white/[0.08] px-3 py-1.5 text-xs"
                    >
                      Abstain
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Beaker className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} /> Advisory queue
          </h2>
          {advisory.length === 0 ? (
            <p className="text-xs text-white/55">No pending advisory inputs.</p>
          ) : (
            <ul className="space-y-2">
              {advisory.map((r) => (
                <li key={r.id} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      <Link href={`/admin/governance/proposals/${r.proposal_id}`} className="hover:text-[#2DA5A0]">
                        #{r.proposal?.proposal_number} . {r.proposal?.title}
                      </Link>
                    </p>
                    <p className="text-[11px] text-white/55">advisory as {r.approver_role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => advisoryComment(r.proposal_id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DA5A0]/20 text-[#2DA5A0] hover:bg-[#2DA5A0]/30 px-3 py-1.5 text-xs font-medium"
                  >
                    Leave advisory comment
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
