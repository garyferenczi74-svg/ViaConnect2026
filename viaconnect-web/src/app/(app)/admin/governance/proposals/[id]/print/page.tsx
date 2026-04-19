'use client';

// Prompt #95 Phase 7: print-ready proposal view.
// Renders a proposal as a long-form page optimized for `window.print()`,
// which the browser saves as PDF. Lets admins attach a PDF to board
// emails without a third-party PDF library (package.json is locked).

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Printer } from 'lucide-react';

const supabase = createClient();

interface ProposalPrint {
  id: string;
  proposal_number: number;
  title: string;
  summary: string;
  pricing_domain_id: string;
  target_object_ids: string[];
  current_value_cents: number | null;
  proposed_value_cents: number | null;
  current_value_percent: number | null;
  proposed_value_percent: number | null;
  change_type: string;
  percent_change: number | null;
  impact_tier: string;
  estimated_affected_customers: number | null;
  rationale: string;
  competitive_analysis: string | null;
  stakeholder_communication_plan: string | null;
  risks_and_mitigations: string | null;
  proposed_effective_date: string;
  grandfathering_policy: string;
  status: string;
  is_emergency: boolean;
  emergency_justification: string | null;
  initiated_at: string;
  submitted_at: string | null;
  activated_at: string | null;
}

export default function ProposalPrintPage() {
  const params = useParams<{ id: string }>();
  const [p, setP] = useState<ProposalPrint | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('pricing_proposals')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();
    setP(data as ProposalPrint | null);
  }, [params.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!p) return <div className="p-8 text-sm text-gray-600">Loading...</div>;

  const formatValue = (cents: number | null, pct: number | null): string => {
    if (cents !== null) return `$${(cents / 100).toFixed(2)}`;
    if (pct !== null) return `${pct}%`;
    return 'n/a';
  };

  return (
    <div className="bg-white text-black min-h-screen p-8 print:p-0">
      <div className="max-w-[7in] mx-auto space-y-6 print:max-w-none">
        <div className="flex items-center justify-between print:hidden">
          <h2 className="text-sm text-gray-600">
            Print-ready view. Use File &gt; Print &gt; Save as PDF to attach to board notification.
          </h2>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2DA5A0] text-white px-4 py-2 text-sm font-semibold"
          >
            <Printer className="h-4 w-4" strokeWidth={1.5} /> Print / Save PDF
          </button>
        </div>

        <header className="border-b border-black pb-3">
          <p className="text-xs uppercase tracking-wider">ViaCura Pricing Governance</p>
          <p className="text-xs text-gray-600">Proposal #{p.proposal_number} . {new Date(p.initiated_at).toLocaleDateString()}</p>
          <h1 className="text-2xl font-bold mt-1">{p.title}</h1>
          <p className="text-sm text-gray-700 mt-1">{p.summary}</p>
        </header>

        {p.is_emergency && (
          <div className="border-2 border-red-700 bg-red-50 p-3">
            <p className="font-bold text-red-800">EMERGENCY OVERRIDE</p>
            <p className="text-sm text-red-800">{p.emergency_justification}</p>
          </div>
        )}

        <section>
          <h2 className="text-lg font-bold border-b border-gray-400">The change</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm mt-2">
            <dt className="font-semibold">Domain</dt>
            <dd><code>{p.pricing_domain_id}</code></dd>
            <dt className="font-semibold">Target objects</dt>
            <dd>{p.target_object_ids.join(', ') || 'none'}</dd>
            <dt className="font-semibold">Change type</dt>
            <dd>{p.change_type}</dd>
            <dt className="font-semibold">Current value</dt>
            <dd>{formatValue(p.current_value_cents, p.current_value_percent)}</dd>
            <dt className="font-semibold">Proposed value</dt>
            <dd>{formatValue(p.proposed_value_cents, p.proposed_value_percent)}</dd>
            <dt className="font-semibold">Percent change</dt>
            <dd>{p.percent_change?.toFixed(2) ?? 'n/a'}%</dd>
            <dt className="font-semibold">Impact tier</dt>
            <dd className="uppercase">{p.impact_tier}</dd>
            <dt className="font-semibold">Affected customers (est.)</dt>
            <dd>{p.estimated_affected_customers ?? 'unknown'}</dd>
            <dt className="font-semibold">Effective date</dt>
            <dd>{p.proposed_effective_date}</dd>
            <dt className="font-semibold">Grandfathering</dt>
            <dd>{p.grandfathering_policy}</dd>
            <dt className="font-semibold">Status</dt>
            <dd>{p.status}</dd>
          </dl>
        </section>

        <section>
          <h2 className="text-lg font-bold border-b border-gray-400">Rationale</h2>
          <p className="text-sm whitespace-pre-wrap mt-2">{p.rationale}</p>
        </section>

        {p.competitive_analysis && (
          <section>
            <h2 className="text-lg font-bold border-b border-gray-400">Competitive analysis</h2>
            <p className="text-sm whitespace-pre-wrap mt-2">{p.competitive_analysis}</p>
          </section>
        )}

        {p.stakeholder_communication_plan && (
          <section>
            <h2 className="text-lg font-bold border-b border-gray-400">Stakeholder communication plan</h2>
            <p className="text-sm whitespace-pre-wrap mt-2">{p.stakeholder_communication_plan}</p>
          </section>
        )}

        {p.risks_and_mitigations && (
          <section>
            <h2 className="text-lg font-bold border-b border-gray-400">Risks and mitigations</h2>
            <p className="text-sm whitespace-pre-wrap mt-2">{p.risks_and_mitigations}</p>
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold border-b border-gray-400">Lifecycle</h2>
          <ul className="text-sm mt-2 space-y-1">
            <li>Initiated: {new Date(p.initiated_at).toLocaleString()}</li>
            {p.submitted_at && <li>Submitted: {new Date(p.submitted_at).toLocaleString()}</li>}
            {p.activated_at && <li>Activated: {new Date(p.activated_at).toLocaleString()}</li>}
          </ul>
        </section>

        <footer className="border-t border-black pt-3 text-xs text-gray-600">
          <p>ViaCura Wellness . Pricing Governance . Generated {new Date().toLocaleString()}</p>
        </footer>
      </div>
    </div>
  );
}
