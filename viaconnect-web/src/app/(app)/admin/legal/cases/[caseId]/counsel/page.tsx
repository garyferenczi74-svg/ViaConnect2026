'use client';

// Prompt #104 Phase 6: Per-case counsel engagement composer +
// briefing packet preview.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, AlertCircle, Briefcase, FileText, ShieldAlert, RefreshCw,
} from 'lucide-react';

interface CounselRow {
  counsel_id: string;
  firm_name: string;
  attorney_name: string;
  specialty: string[];
  jurisdictions: string[];
  billing_rate_cents: number | null;
}

interface EngagementRow {
  engagement_id: string;
  counsel_id: string;
  status: string;
  scope_description: string;
  estimated_budget_cents: number;
  approved_budget_cents: number | null;
  proposed_at: string;
  cfo_approved_at: string | null;
  ceo_approved_at: string | null;
  activated_at: string | null;
  legal_outside_counsel: { firm_name: string; attorney_name: string } | null;
}

const STATUS_TONE: Record<string, string> = {
  proposed:                 'border-white/10 text-gray-300',
  pending_cfo_approval:     'border-amber-500/40 text-amber-300',
  pending_ceo_approval:     'border-amber-500/60 text-amber-200',
  approved:                 'border-emerald-500/40 text-emerald-300',
  active:                   'border-emerald-500/60 text-emerald-200',
  completed:                'border-white/10 text-gray-400',
  rejected:                 'border-rose-500/40 text-rose-300',
  withdrawn:                'border-white/10 text-gray-500',
};

export default function CaseCounselPage() {
  const params = useParams<{ caseId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counsel, setCounsel] = useState<CounselRow[]>([]);
  const [engagements, setEngagements] = useState<EngagementRow[]>([]);
  const [packet, setPacket] = useState<string | null>(null);

  const [counselId, setCounselId] = useState('');
  const [scope, setScope] = useState('');
  const [budgetCents, setBudgetCents] = useState<number>(0);
  const [proposing, setProposing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, eRes] = await Promise.all([
        fetch('/api/admin/legal/counsel?active_only=true'),
        fetch(`/api/admin/legal/cases/${params.caseId}/engagements`),
      ]);
      const cJson = await cRes.json();
      const eJson = await eRes.json();
      if (!cRes.ok) throw new Error(cJson.error ?? `HTTP ${cRes.status}`);
      if (!eRes.ok) throw new Error(eJson.error ?? `HTTP ${eRes.status}`);
      setCounsel(cJson.rows ?? []);
      setEngagements(eJson.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.caseId]);

  useEffect(() => { reload(); }, [reload]);

  async function loadBriefingPacket() {
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/cases/${params.caseId}/briefing-packet`);
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${r.status}`);
      }
      const md = await r.text();
      setPacket(md);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function propose() {
    setProposing(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/cases/${params.caseId}/engagements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counsel_id: counselId,
          scope_description: scope,
          estimated_budget_cents: budgetCents,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setScope('');
      setBudgetCents(0);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProposing(false);
    }
  }

  const requiresCfo = budgetCents >= 500_000;
  const requiresCeo = budgetCents >= 2_500_000;

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href={`/admin/legal/cases/${params.caseId}`} className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Case
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 inline-flex items-center gap-2">
          <Briefcase className="w-6 h-6" strokeWidth={1.5} /> Outside counsel
        </h1>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {!loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <h2 className="text-sm font-semibold">Propose engagement</h2>

            <label className="text-xs text-gray-400 block">Counsel</label>
            <select
              value={counselId}
              onChange={(e) => setCounselId(e.target.value)}
              className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
            >
              <option value="">Choose counsel...</option>
              {counsel.map((c) => (
                <option key={c.counsel_id} value={c.counsel_id}>
                  {c.firm_name} - {c.attorney_name}
                </option>
              ))}
            </select>

            <label className="text-xs text-gray-400 block">Scope (30 chars minimum)</label>
            <textarea
              rows={3}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="Describe the engagement scope. Example: review C&D approach, draft Lanham filing, represent in DE federal court."
              className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
            />

            <label className="text-xs text-gray-400 block">Estimated budget (cents)</label>
            <input
              type="number"
              min={0}
              value={budgetCents}
              onChange={(e) => setBudgetCents(Number(e.target.value))}
              className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
            />
            <div className="text-[10px] text-gray-500">
              ${(budgetCents / 100).toLocaleString()}.
              {requiresCeo
                ? ' Requires Steve Rica + CFO + CEO approval.'
                : requiresCfo
                  ? ' Requires Steve Rica + CFO approval.'
                  : ' Compliance approval only.'}
            </div>

            <button
              disabled={proposing || !counselId || scope.length < 30 || budgetCents < 0}
              onClick={propose}
              className="w-full text-xs px-3 py-2 rounded border border-copper text-copper hover:bg-copper/10 disabled:opacity-50 inline-flex items-center justify-center gap-1"
            >
              {proposing ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : null}
              Propose engagement
            </button>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold inline-flex items-center gap-2">
                <FileText className="w-4 h-4" strokeWidth={1.5} /> Briefing packet
              </h2>
              <button
                onClick={loadBriefingPacket}
                className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10"
              >
                <RefreshCw className="w-3 h-3" strokeWidth={1.5} /> Generate
              </button>
            </div>
            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-300 inline-flex items-center gap-1 mb-3">
              <ShieldAlert className="w-3 h-3" strokeWidth={1.5} />
              CONFIDENTIAL - ATTORNEY-CLIENT PRIVILEGED
            </div>
            {packet ? (
              <pre className="text-xs text-gray-200 whitespace-pre-wrap border border-white/5 rounded p-3 bg-black/20 max-h-[60vh] overflow-y-auto">
                {packet}
              </pre>
            ) : (
              <div className="text-xs text-gray-500 italic">Click Generate to assemble the briefing packet.</div>
            )}
          </section>

          <section className="lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold mb-3">Engagements ({engagements.length})</h2>
            {engagements.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No engagements proposed yet.</div>
            ) : (
              <div className="grid gap-2">
                {engagements.map((e) => (
                  <div key={e.engagement_id} className="rounded border border-white/10 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {e.legal_outside_counsel?.firm_name ?? e.counsel_id.slice(0, 8)}
                          <span className="ml-2 text-gray-500">{e.legal_outside_counsel?.attorney_name}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          ${(e.estimated_budget_cents / 100).toLocaleString()} estimated, proposed {new Date(e.proposed_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_TONE[e.status] ?? 'border-white/10 text-gray-300'}`}>
                        {e.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">{e.scope_description}</div>
                    {(e.cfo_approved_at || e.ceo_approved_at) && (
                      <div className="text-[10px] text-emerald-300 mt-1">
                        {e.cfo_approved_at && <span>CFO {new Date(e.cfo_approved_at).toLocaleDateString()} </span>}
                        {e.ceo_approved_at && <span>CEO {new Date(e.ceo_approved_at).toLocaleDateString()}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
