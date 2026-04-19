'use client';

// Prompt #95 Phase 3: proposal editor + detail view.
// Drafts are editable by their initiator and show a live classification
// preview panel. All other statuses render read-only with the full
// lifecycle summary.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle,
  ArrowLeft,
  Beaker,
  CalendarClock,
  CheckCircle2,
  FilePen,
  Lock,
  Send,
  Shield,
  Trash2,
  TrendingUp,
} from 'lucide-react';

const supabase = createClient();

interface DomainRow {
  id: string;
  display_name: string;
  category: string;
  default_grandfathering_policy: string | null;
  requires_grandfathering: boolean;
}

interface ProposalRow {
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
  auto_classified_tier: string;
  estimated_affected_customers: number | null;
  rationale: string;
  competitive_analysis: string | null;
  stakeholder_communication_plan: string | null;
  risks_and_mitigations: string | null;
  proposed_effective_date: string;
  grandfathering_policy: string;
  grandfathering_override_justification: string | null;
  is_emergency: boolean;
  emergency_justification: string | null;
  status: string;
  initiated_by: string;
  initiated_at: string;
  submitted_at: string | null;
  activated_at: string | null;
  expires_at: string;
}

interface ClassificationPreview {
  classification: {
    tier: string;
    percentChange: number;
    reasons: string[];
    requiredApprovers: string[];
    advisoryApprovers: string[];
    requiresBoardNotification: boolean;
    requiresBoardApproval: boolean;
    slaHours: number | null;
  };
  affected: { count: number; method: string; notes: string[] };
  ueProjection: {
    available: boolean;
    reason?: string;
    confidence: string;
    notes: string[];
  };
}

function tierBadge(tier: string): string {
  switch (tier) {
    case 'minor': return 'bg-emerald-500/15 text-emerald-300';
    case 'moderate': return 'bg-sky-500/15 text-sky-300';
    case 'major': return 'bg-amber-500/15 text-amber-300';
    case 'structural': return 'bg-red-500/15 text-red-300';
    default: return 'bg-white/[0.06] text-white/60';
  }
}

function formatCents(cents: number | null): string {
  if (cents === null) return 'n/a';
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProposalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposalRow | null>(null);
  const [domain, setDomain] = useState<DomainRow | null>(null);
  const [preview, setPreview] = useState<ClassificationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: row } = await supabase
      .from('pricing_proposals')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();
    const p = row as ProposalRow | null;
    setProposal(p);
    if (p) {
      const { data: d } = await supabase
        .from('pricing_domains')
        .select('id, display_name, category, default_grandfathering_policy, requires_grandfathering')
        .eq('id', p.pricing_domain_id)
        .maybeSingle();
      setDomain(d as DomainRow | null);
    }
  }, [params.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const editable = proposal?.status === 'draft';

  const runPreview = useCallback(async () => {
    if (!proposal || !domain) return;
    setPreviewLoading(true);
    try {
      const response = await fetch('/api/admin/governance/classify-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainCategory: domain.category,
          pricingDomainId: proposal.pricing_domain_id,
          targetObjectIds: proposal.target_object_ids,
          currentValueCents: proposal.current_value_cents,
          proposedValueCents: proposal.proposed_value_cents,
          currentValuePercent: proposal.current_value_percent,
          proposedValuePercent: proposal.proposed_value_percent,
          changeType: proposal.change_type,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as ClassificationPreview;
      setPreview(data);

      // Sync the auto_classified_tier + estimated_affected_customers back to the draft
      if (editable) {
        await patch({
          auto_classified_tier: data.classification.tier,
          impact_tier: data.classification.tier,
          estimated_affected_customers: data.affected.count,
        });
      }
    } catch (e) {
      setMessage(`Preview failed: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setPreviewLoading(false);
    }
  }, [proposal, domain, editable]);

  const patch = async (fields: Record<string, unknown>) => {
    const response = await fetch(`/api/admin/governance/proposals/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Save failed: ${err.error ?? response.status}`);
      return false;
    }
    await refresh();
    return true;
  };

  const submit = async () => {
    setMessage(null);
    const response = await fetch(`/api/admin/governance/proposals/${params.id}/submit`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (err.errors) {
        setMessage(`Cannot submit:\n${err.errors.join('\n')}`);
      } else {
        setMessage(`Submit failed: ${err.error ?? response.status}`);
      }
      return;
    }
    setMessage('Submitted for approval.');
    await refresh();
  };

  const withdraw = async () => {
    if (!window.confirm('Withdraw this proposal? This is final.')) return;
    const response = await fetch(`/api/admin/governance/proposals/${params.id}/withdraw`, {
      method: 'POST',
    });
    if (!response.ok) {
      setMessage('Withdraw failed');
      return;
    }
    await refresh();
  };

  const effectiveGrandfathering = useMemo(
    () => proposal?.grandfathering_policy ?? domain?.default_grandfathering_policy ?? 'no_grandfathering',
    [proposal, domain],
  );

  if (!proposal) {
    return (
      <div className="min-h-screen bg-[#0B1520] text-white p-6">
        <p className="text-sm text-white/60">Loading...</p>
      </div>
    );
  }

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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mt-2">
            <div>
              <p className="text-xs text-white/50">Proposal #{proposal.proposal_number}</p>
              <h1 className="text-xl sm:text-2xl font-semibold mt-1">{proposal.title}</h1>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${tierBadge(proposal.impact_tier)}`}>
                {proposal.impact_tier}
              </span>
              <span className="rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-white/[0.08] text-white/70">
                {proposal.status}
              </span>
              {proposal.is_emergency && (
                <span className="rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-300">
                  EMERGENCY
                </span>
              )}
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-xl bg-[#2DA5A0]/10 border border-[#2DA5A0]/30 px-3 py-2 text-xs text-[#2DA5A0] whitespace-pre-wrap">
            {message}
          </div>
        )}

        <Section icon={FilePen} title="Basics">
          <Field label="Summary">
            <textarea
              value={proposal.summary}
              readOnly={!editable}
              onChange={(e) => setProposal({ ...proposal, summary: e.target.value })}
              onBlur={(e) => editable && patch({ summary: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            />
          </Field>
          <Field label="Pricing domain">
            <p className="text-xs text-white/80">
              {domain?.display_name ?? proposal.pricing_domain_id}{' '}
              <code className="text-white/45 text-[10px]">[{domain?.category}]</code>
            </p>
          </Field>
          <Field label="Target object ids (comma separated)">
            <input
              type="text"
              value={proposal.target_object_ids.join(', ')}
              readOnly={!editable}
              onChange={(e) =>
                setProposal({
                  ...proposal,
                  target_object_ids: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              onBlur={(e) =>
                editable &&
                patch({
                  target_object_ids: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            />
          </Field>
        </Section>

        <Section icon={TrendingUp} title="The change">
          {proposal.change_type === 'price_amount' ? (
            <>
              <Field label="Current price (cents)">
                <input
                  type="number"
                  value={proposal.current_value_cents ?? ''}
                  readOnly={!editable}
                  onChange={(e) =>
                    setProposal({
                      ...proposal,
                      current_value_cents: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  onBlur={(e) =>
                    editable &&
                    patch({
                      current_value_cents: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
                />
                <span className="text-[10px] text-white/45">
                  {formatCents(proposal.current_value_cents)}
                </span>
              </Field>
              <Field label="Proposed price (cents)">
                <input
                  type="number"
                  value={proposal.proposed_value_cents ?? ''}
                  readOnly={!editable}
                  onChange={(e) =>
                    setProposal({
                      ...proposal,
                      proposed_value_cents: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  onBlur={(e) =>
                    editable &&
                    patch({
                      proposed_value_cents: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
                />
                <span className="text-[10px] text-white/45">
                  {formatCents(proposal.proposed_value_cents)}
                </span>
              </Field>
            </>
          ) : (
            <>
              <Field label="Current discount percent">
                <input
                  type="number"
                  step="0.1"
                  value={proposal.current_value_percent ?? ''}
                  readOnly={!editable}
                  onChange={(e) =>
                    setProposal({
                      ...proposal,
                      current_value_percent: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  onBlur={(e) =>
                    editable &&
                    patch({
                      current_value_percent: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
                />
              </Field>
              <Field label="Proposed discount percent">
                <input
                  type="number"
                  step="0.1"
                  value={proposal.proposed_value_percent ?? ''}
                  readOnly={!editable}
                  onChange={(e) =>
                    setProposal({
                      ...proposal,
                      proposed_value_percent: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  onBlur={(e) =>
                    editable &&
                    patch({
                      proposed_value_percent: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
                />
              </Field>
            </>
          )}
          {proposal.percent_change !== null && (
            <p className="text-xs text-white/70">
              Percent change: <b>{proposal.percent_change.toFixed(2)}%</b>
            </p>
          )}
          {editable && (
            <button
              type="button"
              onClick={runPreview}
              disabled={previewLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white px-3 py-1.5 text-xs disabled:opacity-50"
            >
              <Beaker className="h-3.5 w-3.5" strokeWidth={1.5} />
              {previewLoading ? 'Classifying...' : 'Classify + estimate scope'}
            </button>
          )}
        </Section>

        {preview && (
          <Section icon={Shield} title="Classification preview">
            <div className={`rounded-xl border p-3 ${tierBadge(preview.classification.tier)} border-current/30`}>
              <p className="text-sm font-semibold">
                Tier: {preview.classification.tier.toUpperCase()}
              </p>
              <p className="text-xs mt-1">
                Percent change: {preview.classification.percentChange.toFixed(2)}%
                {' . '}
                Affected customers (est.): {preview.affected.count} ({preview.affected.method})
              </p>
              <p className="text-xs mt-2">
                Required approvers: {preview.classification.requiredApprovers.join(', ')}
              </p>
              {preview.classification.advisoryApprovers.length > 0 && (
                <p className="text-xs">
                  Advisory: {preview.classification.advisoryApprovers.join(', ')}
                </p>
              )}
              <p className="text-xs mt-1">
                Board: {preview.classification.requiresBoardNotification ? 'notification' : 'none'}
                {preview.classification.requiresBoardApproval ? ' + approval' : ''}
              </p>
              {preview.classification.reasons.length > 0 && (
                <ul className="text-[11px] mt-2 list-disc list-inside opacity-80">
                  {preview.classification.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
              {preview.affected.notes.length > 0 && (
                <p className="text-[11px] mt-2 opacity-80">
                  Scope notes: {preview.affected.notes.join(' . ')}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 mt-2">
              <p className="text-xs font-medium">Unit economics projection</p>
              {preview.ueProjection.available ? (
                <p className="text-[11px] text-white/70 mt-1">
                  Confidence: {preview.ueProjection.confidence}
                </p>
              ) : (
                <p className="text-[11px] text-amber-300 mt-1">
                  {preview.ueProjection.reason ?? 'Projection not available.'}
                </p>
              )}
              {preview.ueProjection.notes.length > 0 && (
                <ul className="text-[11px] text-white/55 mt-1 list-disc list-inside">
                  {preview.ueProjection.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}
            </div>
          </Section>
        )}

        <Section icon={FilePen} title="Rationale (required, min 200 characters)">
          <textarea
            value={proposal.rationale}
            readOnly={!editable}
            onChange={(e) => setProposal({ ...proposal, rationale: e.target.value })}
            onBlur={(e) => editable && patch({ rationale: e.target.value })}
            rows={5}
            className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          />
          <span className="text-[10px] text-white/45">{proposal.rationale.length} characters</span>
        </Section>

        <Section icon={FilePen} title="Competitive analysis (required for moderate+, min 50 chars)">
          <textarea
            value={proposal.competitive_analysis ?? ''}
            readOnly={!editable}
            onChange={(e) => setProposal({ ...proposal, competitive_analysis: e.target.value })}
            onBlur={(e) => editable && patch({ competitive_analysis: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          />
        </Section>

        <Section icon={FilePen} title="Stakeholder communication plan (required for moderate+)">
          <textarea
            value={proposal.stakeholder_communication_plan ?? ''}
            readOnly={!editable}
            onChange={(e) => setProposal({ ...proposal, stakeholder_communication_plan: e.target.value })}
            onBlur={(e) => editable && patch({ stakeholder_communication_plan: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          />
        </Section>

        <Section icon={FilePen} title="Risks and mitigations (optional)">
          <textarea
            value={proposal.risks_and_mitigations ?? ''}
            readOnly={!editable}
            onChange={(e) => setProposal({ ...proposal, risks_and_mitigations: e.target.value })}
            onBlur={(e) => editable && patch({ risks_and_mitigations: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          />
        </Section>

        <Section icon={CalendarClock} title="Effective date + grandfathering">
          <Field label="Proposed effective date">
            <input
              type="date"
              value={proposal.proposed_effective_date}
              readOnly={!editable}
              onChange={(e) => setProposal({ ...proposal, proposed_effective_date: e.target.value })}
              onBlur={(e) => editable && patch({ proposed_effective_date: e.target.value })}
              className="mt-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            />
          </Field>
          <Field label={`Grandfathering policy (domain default: ${domain?.default_grandfathering_policy ?? 'none'})`}>
            <select
              value={proposal.grandfathering_policy}
              disabled={!editable}
              onChange={(e) => {
                setProposal({ ...proposal, grandfathering_policy: e.target.value });
                if (editable) patch({ grandfathering_policy: e.target.value });
              }}
              className="mt-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            >
              {['indefinite', 'twelve_months', 'six_months', 'thirty_days', 'no_grandfathering'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
          {effectiveGrandfathering !== domain?.default_grandfathering_policy && (
            <Field label="Override justification (required when changing default, min 20 chars)">
              <textarea
                value={proposal.grandfathering_override_justification ?? ''}
                readOnly={!editable}
                onChange={(e) => setProposal({ ...proposal, grandfathering_override_justification: e.target.value })}
                onBlur={(e) => editable && patch({ grandfathering_override_justification: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
              />
            </Field>
          )}
        </Section>

        <Section icon={AlertTriangle} title="Emergency override">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={proposal.is_emergency}
              disabled={!editable}
              onChange={(e) => {
                const next = e.target.checked;
                setProposal({ ...proposal, is_emergency: next });
                if (editable) patch({ is_emergency: next });
              }}
            />
            This is an emergency change (requires post-hoc Domenic notification)
          </label>
          {proposal.is_emergency && (
            <Field label="Emergency justification (required, min 20 chars)">
              <textarea
                value={proposal.emergency_justification ?? ''}
                readOnly={!editable}
                onChange={(e) => setProposal({ ...proposal, emergency_justification: e.target.value })}
                onBlur={(e) => editable && patch({ emergency_justification: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-red-500/20 bg-red-500/5 px-2 py-1.5 text-xs text-red-100"
              />
            </Field>
          )}
        </Section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 flex flex-wrap gap-2">
          {editable && (
            <>
              <button
                type="button"
                onClick={submit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2DA5A0] text-[#0B1520] px-4 py-2 text-sm font-semibold hover:bg-[#2DA5A0]/90"
              >
                <Send className="h-4 w-4" strokeWidth={1.5} /> Submit for approval
              </button>
              <button
                type="button"
                onClick={withdraw}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-200 px-4 py-2 text-sm hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} /> Discard draft
              </button>
            </>
          )}
          {!editable && proposal.status === 'submitted_for_approval' && (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                Submitted {proposal.submitted_at ? new Date(proposal.submitted_at).toLocaleString() : ''}
              </span>
              <button
                type="button"
                onClick={withdraw}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-white px-3 py-1.5 text-xs hover:bg-white/[0.08]"
              >
                Withdraw
              </button>
            </>
          )}
          {proposal.status === 'activated' && proposal.activated_at && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              Activated {new Date(proposal.activated_at).toLocaleString()}
            </span>
          )}
        </section>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FilePen;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
      <h2 className="text-sm font-semibold flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-white/75">
      {label}
      {children}
    </label>
  );
}
