'use client';

// Prompt #95 Phase 6: rollback confirmation page.
// Admin reviews the impact summary + provides justification (>=50 chars)
// before triggering the rollback endpoint.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';

const supabase = createClient();

interface ProposalRow {
  id: string;
  proposal_number: number;
  title: string;
  pricing_domain_id: string;
  impact_tier: string;
  current_value_cents: number | null;
  proposed_value_cents: number | null;
  current_value_percent: number | null;
  proposed_value_percent: number | null;
  change_type: string;
  status: string;
  activated_at: string | null;
  grandfathering_policy: string;
  target_object_ids: string[];
}

export default function RollbackPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposalRow | null>(null);
  const [bindingCount, setBindingCount] = useState<number>(0);
  const [justification, setJustification] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('pricing_proposals')
      .select(
        'id, proposal_number, title, pricing_domain_id, impact_tier, current_value_cents, proposed_value_cents, current_value_percent, proposed_value_percent, change_type, status, activated_at, grandfathering_policy, target_object_ids',
      )
      .eq('id', params.id)
      .maybeSingle();
    setProposal(data as ProposalRow | null);

    if (data) {
      const { count } = await supabase
        .from('customer_price_bindings')
        .select('id', { count: 'exact', head: true })
        .eq('authorized_by_proposal_id', params.id)
        .eq('status', 'active');
      setBindingCount(count ?? 0);
    }
  }, [params.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const daysSince = proposal?.activated_at
    ? (Date.now() - new Date(proposal.activated_at).getTime()) / 86_400_000
    : null;

  const isInstantWindow = daysSince !== null && daysSince < 1;
  const isEligible = proposal?.status === 'activated' && daysSince !== null && daysSince <= 30;
  const needsNewProposal =
    !isInstantWindow && proposal?.impact_tier && proposal.impact_tier !== 'minor' && daysSince !== null && daysSince >= 1;

  const submit = async () => {
    if (justification.trim().length < 50) {
      setMessage('Justification must be at least 50 characters.');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const response = await fetch(`/api/admin/governance/proposals/${params.id}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification: justification.trim() }),
    });
    setSubmitting(false);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Rollback failed: ${err.error ?? response.status}`);
      return;
    }
    const result = await response.json();
    setMessage(
      `Rolled back. ${result.target_rows_updated ?? 0} target rows reverted, ${result.bindings_superseded ?? 0} grandfathered bindings superseded.`,
    );
    setTimeout(() => router.push(`/admin/governance/proposals/${params.id}`), 1500);
  };

  if (!proposal) {
    return (
      <div className="min-h-screen bg-[#0B1520] text-white p-6">
        <p className="text-sm text-white/60">Loading proposal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href={`/admin/governance/proposals/${params.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to proposal
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-300" strokeWidth={1.5} /> Rollback proposal #{proposal.proposal_number}
          </h1>
          <p className="text-xs text-white/55 mt-1 truncate">{proposal.title}</p>
        </div>

        {!isEligible && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-none mt-0.5" strokeWidth={1.5} />
            {proposal.status !== 'activated'
              ? `This proposal is ${proposal.status}; rollback is only available from activated status.`
              : `More than 30 days have passed since activation (${daysSince?.toFixed(1)} days). Rollback is no longer available. Create a new reversing proposal instead.`}
          </div>
        )}

        {isEligible && needsNewProposal && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-none mt-0.5" strokeWidth={1.5} />
            This {proposal.impact_tier} proposal is beyond the 24-hour instant-rollback window. A rollback for moderate+ tiers after 24 hours requires a new reversing proposal that follows the full approval workflow.
          </div>
        )}

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
          <h2 className="text-sm font-semibold">Impact summary</h2>
          <ul className="text-xs text-white/75 space-y-1">
            <li>
              Impact tier: <b>{proposal.impact_tier}</b>
            </li>
            <li>
              Activated: {proposal.activated_at ? new Date(proposal.activated_at).toLocaleString() : 'n/a'}{' '}
              ({daysSince !== null ? `${daysSince.toFixed(1)} days ago` : 'unknown'})
            </li>
            <li>
              Target ids: {proposal.target_object_ids.join(', ') || 'none'}
            </li>
            <li>
              Will revert:{' '}
              {proposal.change_type === 'price_amount'
                ? `$${((proposal.proposed_value_cents ?? 0) / 100).toFixed(2)} -> $${((proposal.current_value_cents ?? 0) / 100).toFixed(2)}`
                : `${proposal.proposed_value_percent}% -> ${proposal.current_value_percent}%`}
            </li>
            <li>
              Active grandfathered bindings to supersede: <b>{bindingCount}</b>
            </li>
            <li>
              Window: {isInstantWindow ? 'instant (<24h)' : 'standard (24h to 30 days)'}
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
          <h2 className="text-sm font-semibold">Justification (required, min 50 characters)</h2>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={4}
            placeholder="Explain why this proposal is being rolled back. This is permanent and will appear in price_change_history."
            className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          />
          <span className="text-[10px] text-white/45">{justification.length} characters</span>
        </section>

        {message && (
          <div className="rounded-xl bg-[#2DA5A0]/10 border border-[#2DA5A0]/30 px-3 py-2 text-xs text-[#2DA5A0]">
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!isEligible || needsNewProposal || submitting || justification.trim().length < 50}
          className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/30 hover:bg-red-500/40 text-red-100 px-4 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.5} /> Confirm rollback
        </button>
      </div>
    </div>
  );
}
