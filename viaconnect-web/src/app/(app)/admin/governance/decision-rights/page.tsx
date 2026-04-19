'use client';

// Prompt #95 Phase 2: decision rights configuration admin UI.
// Shows the four decision rights tiers, lets admins edit thresholds +
// approver routing + SLA, and lists current approver_assignments.
// Every mutation requires a justification and writes a row to the
// governance_configuration_log (immutable audit trail).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle,
  ArrowLeft,
  Building,
  History,
  ShieldCheck,
  UserMinus,
  UserPlus,
} from 'lucide-react';

const supabase = createClient();

interface RuleRow {
  id: string;
  tier: string;
  min_percent_change: number | null;
  max_percent_change: number | null;
  applies_to_categories: string[];
  required_approvers: string[];
  advisory_approvers: string[];
  requires_board_notification: boolean;
  requires_board_approval: boolean;
  target_decision_sla_hours: number | null;
  is_active: boolean;
  sort_order: number;
}

interface AssignmentRow {
  id: string;
  approver_role: string;
  user_id: string;
  assigned_at: string;
  is_active: boolean;
}

interface LogRow {
  id: string;
  change_type: string;
  target_table: string;
  target_id: string;
  change_justification: string;
  changed_at: string;
}

const ROLES = ['ceo', 'cfo', 'advisory_cto', 'advisory_medical', 'board_member'];

function tierBadge(tier: string): string {
  switch (tier) {
    case 'minor': return 'bg-emerald-500/15 text-emerald-300';
    case 'moderate': return 'bg-sky-500/15 text-sky-300';
    case 'major': return 'bg-amber-500/15 text-amber-300';
    case 'structural': return 'bg-red-500/15 text-red-300';
    default: return 'bg-white/[0.06] text-white/60';
  }
}

export default function DecisionRightsPage() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<RuleRow | null>(null);
  const [newAssignRole, setNewAssignRole] = useState('cfo');
  const [newAssignUserId, setNewAssignUserId] = useState('');

  const refresh = useCallback(async () => {
    const [rulesResp, assignsResp, logResp] = await Promise.all([
      supabase.from('decision_rights_rules').select('*').order('sort_order'),
      supabase
        .from('approver_assignments')
        .select('id, approver_role, user_id, assigned_at, is_active')
        .eq('is_active', true)
        .order('approver_role'),
      supabase
        .from('governance_configuration_log')
        .select('id, change_type, target_table, target_id, change_justification, changed_at')
        .order('changed_at', { ascending: false })
        .limit(20),
    ]);
    setRules((rulesResp.data ?? []) as RuleRow[]);
    setAssignments((assignsResp.data ?? []) as AssignmentRow[]);
    setLog((logResp.data ?? []) as LogRow[]);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveRule = async (rule: RuleRow, justification: string) => {
    const response = await fetch(`/api/admin/governance/decision-rights/${rule.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patch: {
          min_percent_change: rule.min_percent_change,
          max_percent_change: rule.max_percent_change,
          required_approvers: rule.required_approvers,
          advisory_approvers: rule.advisory_approvers,
          requires_board_notification: rule.requires_board_notification,
          requires_board_approval: rule.requires_board_approval,
          target_decision_sla_hours: rule.target_decision_sla_hours,
        },
        justification,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Save failed: ${err.error ?? response.status}`);
      return;
    }
    setMessage('Rule updated; change logged to governance_configuration_log.');
    setEditingRule(null);
    await refresh();
  };

  const assign = async () => {
    const justification = window.prompt('Justification for this assignment (required, >=10 chars):') ?? '';
    if (justification.trim().length < 10) {
      setMessage('Justification must be at least 10 characters.');
      return;
    }
    const response = await fetch('/api/admin/governance/approvers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign',
        approver_role: newAssignRole,
        user_id: newAssignUserId.trim(),
        justification,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Assignment failed: ${err.error ?? response.status}`);
      return;
    }
    setMessage('Approver assigned.');
    setNewAssignUserId('');
    await refresh();
  };

  const unassign = async (assignmentId: string) => {
    const justification = window.prompt('Justification for unassignment (required, >=10 chars):') ?? '';
    if (justification.trim().length < 10) return;
    const response = await fetch('/api/admin/governance/approvers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'unassign',
        assignment_id: assignmentId,
        justification,
      }),
    });
    if (!response.ok) {
      setMessage('Unassign failed');
      return;
    }
    setMessage('Approver unassigned.');
    await refresh();
  };

  const assignmentsByRole = useMemo(() => {
    const map: Record<string, AssignmentRow[]> = {};
    for (const a of assignments) {
      map[a.approver_role] = map[a.approver_role] ?? [];
      map[a.approver_role].push(a);
    }
    return map;
  }, [assignments]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Admin
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} /> Decision rights
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Four tiers classify every price-change proposal by percent change, category, and affected-customer count.
            Every edit below is logged to governance_configuration_log (immutable).
          </p>
        </div>

        {message && (
          <div className="rounded-xl bg-[#2DA5A0]/10 border border-[#2DA5A0]/30 px-3 py-2 text-xs text-[#2DA5A0]">
            {message}
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Tier rules</h2>
          {rules.map((r) => (
            <div key={r.id} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${tierBadge(r.tier)}`}>
                    {r.tier.toUpperCase()}
                  </span>
                  <span className="ml-3 text-xs text-white/70">
                    {r.min_percent_change ?? 'any'}% to {r.max_percent_change ?? 'any'}% . SLA {r.target_decision_sla_hours ?? 'n/a'} hours
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRule(r)}
                  className="text-xs rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 hover:bg-white/[0.08]"
                >
                  Edit
                </button>
              </div>
              <p className="text-[11px] text-white/60">
                Required: {r.required_approvers.join(', ')}
                {r.advisory_approvers.length > 0 ? ` . Advisory: ${r.advisory_approvers.join(', ')}` : ''}
              </p>
              <p className="text-[11px] text-white/55">
                Board: {r.requires_board_notification ? 'notification' : 'none'}
                {r.requires_board_approval ? ' + approval' : ''}
              </p>
            </div>
          ))}
        </section>

        {editingRule && (
          <EditRuleForm
            rule={editingRule}
            onCancel={() => setEditingRule(null)}
            onSave={saveRule}
          />
        )}

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Building className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} /> Approver assignments
          </h2>
          {ROLES.map((role) => {
            const items = assignmentsByRole[role] ?? [];
            return (
              <div key={role} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="font-medium text-xs w-36">{role}</span>
                {items.length === 0 ? (
                  <span className="text-[11px] text-white/45">(none assigned)</span>
                ) : (
                  <ul className="text-[11px] text-white/75 space-y-1 flex-1">
                    {items.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 bg-white/[0.04] rounded-lg px-2 py-1">
                        <code className="text-white/60">{a.user_id}</code>
                        <button
                          type="button"
                          onClick={() => unassign(a.id)}
                          className="inline-flex items-center gap-1 text-red-300 hover:text-red-200 text-[11px]"
                        >
                          <UserMinus className="h-3 w-3" strokeWidth={1.5} /> Unassign
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          <div className="border-t border-white/[0.06] pt-3 space-y-2">
            <p className="text-xs font-medium">Assign a role</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={newAssignRole}
                onChange={(e) => setNewAssignRole(e.target.value)}
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input
                type="text"
                value={newAssignUserId}
                onChange={(e) => setNewAssignUserId(e.target.value)}
                placeholder="User UUID"
                className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={assign}
                disabled={!newAssignUserId.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DA5A0] text-[#0B1520] px-3 py-1.5 text-xs font-semibold hover:bg-[#2DA5A0]/90 disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" strokeWidth={1.5} /> Assign
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <History className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} /> Configuration log (last 20)
          </h2>
          {log.length === 0 ? (
            <p className="text-xs text-white/55">No changes logged.</p>
          ) : (
            <ul className="text-[11px] text-white/80 space-y-1">
              {log.map((l) => (
                <li key={l.id} className="bg-white/[0.04] rounded-lg px-2 py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span>
                    <span className="font-medium">{l.change_type}</span>
                    {' on '}
                    <code className="text-white/55">{l.target_table}</code>
                    {': '}
                    {l.change_justification}
                  </span>
                  <span className="text-white/50 text-[10px]">{new Date(l.changed_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-white/40 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} /> Tier edits affect every future proposal. The log is append-only; past decisions are never altered.
        </p>
      </div>
    </div>
  );
}

function EditRuleForm({
  rule,
  onCancel,
  onSave,
}: {
  rule: RuleRow;
  onCancel: () => void;
  onSave: (updated: RuleRow, justification: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(rule);
  const [justification, setJustification] = useState('');

  const submit = async () => {
    if (justification.trim().length < 10) {
      alert('Justification must be at least 10 characters.');
      return;
    }
    await onSave(draft, justification);
  };

  return (
    <div className="rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/5 p-4 space-y-3">
      <h3 className="text-sm font-semibold">
        Edit {draft.tier} rule
      </h3>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="text-xs">
          Min percent
          <input
            type="number"
            step="0.1"
            value={draft.min_percent_change ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                min_percent_change: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          />
        </label>
        <label className="text-xs">
          Max percent
          <input
            type="number"
            step="0.1"
            value={draft.max_percent_change ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                max_percent_change: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          />
        </label>
        <label className="text-xs">
          SLA hours
          <input
            type="number"
            value={draft.target_decision_sla_hours ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                target_decision_sla_hours: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          />
        </label>
        <label className="text-xs flex items-center gap-2 mt-5">
          <input
            type="checkbox"
            checked={draft.requires_board_notification}
            onChange={(e) =>
              setDraft({ ...draft, requires_board_notification: e.target.checked })
            }
          />
          Board notification required
        </label>
        <label className="text-xs flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.requires_board_approval}
            onChange={(e) =>
              setDraft({ ...draft, requires_board_approval: e.target.checked })
            }
          />
          Board approval required
        </label>
      </div>
      <label className="block text-xs">
        Justification (required, saved to audit log)
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          className="rounded-lg bg-[#2DA5A0] text-[#0B1520] px-3 py-1.5 text-xs font-semibold hover:bg-[#2DA5A0]/90"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/[0.1] bg-white/[0.04] text-white px-3 py-1.5 text-xs hover:bg-white/[0.08]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
