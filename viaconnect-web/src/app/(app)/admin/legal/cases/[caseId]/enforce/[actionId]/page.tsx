'use client';

// Prompt #104 Phase 4: Enforcement action detail.
// Shows the rendered draft body, SHA-256 hash, and the typed-confirmation
// approval flow. NO auto-send; every state transition is explicit.

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, ShieldCheck, ShieldAlert, FileText, Send,
} from 'lucide-react';

interface ActionRow {
  action_id: string;
  case_id: string;
  status: string;
  action_type: string;
  template_id: string | null;
  drafted_at: string;
  drafted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approval_confirmation_text: string | null;
  sent_at: string | null;
  sent_via: string | null;
  external_reference_id: string | null;
  draft_content_sha256: string | null;
  response_deadline: string | null;
  metadata_json: { body?: string; signing_officer?: string; missing_fields?: string[]; template_family?: string; template_version?: string };
  legal_investigation_cases: { case_label: string; bucket: string };
}

const STATUS_TONE: Record<string, string> = {
  draft:                   'border-white/10 text-gray-300 bg-white/5',
  pending_approval:        'border-amber-500/40 text-amber-300 bg-amber-500/10',
  approved_awaiting_send:  'border-sky-500/40 text-sky-300 bg-sky-500/10',
  sent:                    'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  acknowledged:            'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
  response_received:       'border-purple-500/40 text-purple-300 bg-purple-500/10',
  complied:                'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  disputed:                'border-rose-500/40 text-rose-300 bg-rose-500/10',
  withdrawn:               'border-white/10 text-gray-400 bg-white/[0.02]',
};

export default function EnforcementActionDetailPage() {
  const params = useParams<{ caseId: string; actionId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionRow | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [sentVia, setSentVia] = useState('email');
  const [externalRef, setExternalRef] = useState('');
  const [responseClassification, setResponseClassification] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/enforcement-actions/${params.actionId}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setAction(json.action);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.actionId]);

  useEffect(() => { reload(); }, [reload]);

  async function patch(actionVerb: string, payload: Record<string, unknown>) {
    setBusy(actionVerb);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/enforcement-actions/${params.actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionVerb, ...payload }),
      });
      const json = await r.json();
      if (!r.ok) {
        const msg = json.error ?? `HTTP ${r.status}`;
        throw new Error(json.expected ? `${msg}. Expected: "${json.expected}"` : msg);
      }
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href={`/admin/legal/cases/${params.caseId}/enforce`} className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Composer
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 inline-flex items-center gap-2">
          <FileText className="w-6 h-6" strokeWidth={1.5} /> Enforcement action
        </h1>
        {action && (
          <p className="text-sm text-gray-400 mt-1">
            <span className="font-mono">{action.legal_investigation_cases?.case_label}</span> &middot; <span className="font-mono">{action.action_type}</span> &middot; <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_TONE[action.status] ?? 'border-white/10 text-gray-300'}`}>{action.status}</span>
          </p>
        )}
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

      {!loading && action && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Rendered draft</h2>
              {action.draft_content_sha256 && (
                <span className="text-[10px] inline-flex items-center gap-1 text-emerald-300">
                  <ShieldCheck className="w-3 h-3" strokeWidth={1.5} /> SHA-256 {action.draft_content_sha256.slice(0, 16)}...
                </span>
              )}
            </div>
            {action.metadata_json?.missing_fields && action.metadata_json.missing_fields.length > 0 && (
              <div className="mb-3 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-300 inline-flex items-center gap-2">
                <ShieldAlert className="w-3 h-3" strokeWidth={1.5} />
                Missing merge fields: {action.metadata_json.missing_fields.join(', ')}
              </div>
            )}
            <pre className="text-xs text-gray-200 whitespace-pre-wrap border border-white/5 rounded p-3 bg-black/20 max-h-[60vh] overflow-y-auto">
              {action.metadata_json?.body ?? '(no body recorded)'}
            </pre>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold mb-2">Workflow</h2>
              <ol className="text-xs text-gray-400 space-y-1">
                <li className={action.status === 'draft' ? 'text-white' : ''}>1. draft</li>
                <li className={action.status === 'pending_approval' ? 'text-white' : ''}>2. pending_approval</li>
                <li className={action.status === 'approved_awaiting_send' ? 'text-white' : ''}>3. approved_awaiting_send</li>
                <li className={action.status === 'sent' ? 'text-white' : ''}>4. sent</li>
                <li className={['acknowledged','response_received','complied','disputed'].includes(action.status) ? 'text-white' : ''}>5. response</li>
              </ol>
            </div>

            {action.status === 'draft' && (
              <button
                disabled={busy !== null}
                onClick={() => patch('submit_for_approval', {})}
                className="w-full text-xs px-3 py-2 rounded border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 disabled:opacity-50 inline-flex items-center justify-center gap-1"
              >
                {busy === 'submit_for_approval' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : null}
                Submit for approval
              </button>
            )}

            {action.status === 'pending_approval' && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400 block">
                  Type APPROVE {action.legal_investigation_cases?.case_label} to confirm
                </label>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder={`APPROVE ${action.legal_investigation_cases?.case_label}`}
                  className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white font-mono"
                />
                <button
                  disabled={busy !== null || confirmation.length === 0}
                  onClick={() => patch('approve', { approval_confirmation_text: confirmation })}
                  className="w-full text-xs px-3 py-2 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                >
                  {busy === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <ShieldCheck className="w-3 h-3" strokeWidth={1.5} />}
                  Approve
                </button>
              </div>
            )}

            {action.status === 'approved_awaiting_send' && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400 block">Sent via</label>
                <select
                  value={sentVia}
                  onChange={(e) => setSentVia(e.target.value)}
                  className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
                >
                  <option value="email">email</option>
                  <option value="certified_mail">certified_mail</option>
                  <option value="marketplace_form">marketplace_form</option>
                  <option value="dmca_form">dmca_form</option>
                  <option value="overnight_courier">overnight_courier</option>
                </select>
                <label className="text-xs text-gray-400 block">External reference (optional)</label>
                <input
                  type="text"
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  placeholder="message-id, tracking number, complaint id"
                  className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
                />
                <button
                  disabled={busy !== null}
                  onClick={() => patch('mark_sent', { sent_via: sentVia, external_reference_id: externalRef || undefined })}
                  className="w-full text-xs px-3 py-2 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                >
                  {busy === 'mark_sent' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <Send className="w-3 h-3" strokeWidth={1.5} />}
                  Mark sent
                </button>
                <p className="text-[10px] text-gray-500">
                  Records that the document was transmitted via the chosen channel. The actual send is your manual step (email send, marketplace form submit, etc.).
                </p>
              </div>
            )}

            {(action.status === 'sent' || action.status === 'acknowledged') && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400 block">Response classification</label>
                <select
                  value={responseClassification}
                  onChange={(e) => setResponseClassification(e.target.value)}
                  className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
                >
                  <option value="">Choose...</option>
                  <option value="complied">complied</option>
                  <option value="more_info_requested">more_info_requested</option>
                  <option value="disputed_identity">disputed_identity</option>
                  <option value="counter_threat_litigation">counter_threat_litigation</option>
                  <option value="ignored_or_no_response">ignored_or_no_response</option>
                </select>
                <button
                  disabled={busy !== null || responseClassification.length === 0}
                  onClick={() => patch('record_response', { response_classification: responseClassification })}
                  className="w-full text-xs px-3 py-2 rounded border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                >
                  {busy === 'record_response' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : null}
                  Record response
                </button>
              </div>
            )}

            {(action.status === 'draft' || action.status === 'pending_approval' || action.status === 'approved_awaiting_send') && (
              <button
                disabled={busy !== null}
                onClick={() => patch('withdraw', {})}
                className="w-full text-[10px] text-gray-400 hover:text-rose-300 underline"
              >
                Withdraw this action
              </button>
            )}

            <div className="border-t border-white/5 pt-3 text-[10px] text-gray-500 space-y-1">
              {action.approved_at && <div>Approved {new Date(action.approved_at).toLocaleString()}</div>}
              {action.sent_at && <div>Sent {new Date(action.sent_at).toLocaleString()} via {action.sent_via}</div>}
              {action.response_deadline && <div>Response deadline {new Date(action.response_deadline).toLocaleString()}</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
