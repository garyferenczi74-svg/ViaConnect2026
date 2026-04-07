'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Shield, ShieldCheck, RefreshCw, AlertTriangle, Info, CheckCircle, Clock, ChevronDown, ChevronUp, Wrench, Eye, Settings, Activity, AlertCircle, XCircle, Filter } from 'lucide-react';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
type Status = 'open' | 'auto_repaired' | 'pending_review' | 'approved' | 'rejected' | 'resolved' | 'suppressed';

interface AuditFinding { id: string; scan_id: string; scanned_at: string; finding_type: string; severity: Severity; category: string; title: string; description: string; affected_object: string | null; status: Status; }
interface ScanSummary { scan_id: string; scanned_at: string; total_findings: number; critical_count: number; high_count: number; medium_count: number; low_count: number; info_count: number; auto_repaired_count: number; pending_review_count: number; open_count: number; }
interface PendingRepair { id: string; title: string; description: string; proposed_sql: string; risk_level: string; repair_method: string; claude_analysis: string | null; claude_confidence: number | null; status: string; }

const SEV: Record<Severity, { color: string; bg: string; icon: typeof XCircle; label: string }> = {
  CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: XCircle, label: 'Critical' },
  HIGH: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: AlertCircle, label: 'High' },
  MEDIUM: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: AlertTriangle, label: 'Medium' },
  LOW: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: Info, label: 'Low' },
  INFO: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', icon: Info, label: 'Info' },
};
const ST: Record<Status, { label: string; color: string }> = {
  open: { label: 'Open', color: 'text-red-400' }, auto_repaired: { label: 'Auto-Repaired', color: 'text-emerald-400' },
  pending_review: { label: 'Pending Review', color: 'text-yellow-400' }, approved: { label: 'Approved', color: 'text-teal-400' },
  rejected: { label: 'Rejected', color: 'text-slate-400' }, resolved: { label: 'Resolved', color: 'text-emerald-400' },
  suppressed: { label: 'Suppressed', color: 'text-slate-400' },
};

export default function SecurityAdminPage() {
  const [scan, setScan] = useState<ScanSummary | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [pending, setPending] = useState<PendingRepair[]>([]);
  const [mode, setMode] = useState<'auto' | 'review' | 'audit'>('auto');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'findings' | 'pending' | 'config'>('findings');
  const [sevFilter, setSevFilter] = useState<Severity | 'ALL'>('ALL');
  const [statFilter, setStatFilter] = useState<Status | 'ALL'>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [s, f, p, c] = await Promise.all([
      supabase.from('security_scan_summary').select('*').limit(1).single(),
      supabase.from('security_audit_log').select('*').order('scanned_at', { ascending: false }).limit(100),
      supabase.from('security_pending_repairs').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('security_agent_config').select('key, value').eq('key', 'agent_mode').single(),
    ]);
    // Cast through unknown: typegen Row types and the local ScanSummary /
    // AuditFinding shapes don't structurally overlap, but the runtime data is
    // correct. The cast keeps the local UI types authoritative.
    if (s.data) setScan(s.data as unknown as any);
    if (f.data) setFindings(f.data as unknown as any);
    if (p.data) setPending(p.data);
    if (c.data) setMode((c.data.value as string).replace(/"/g, '') as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateMode = async (m: 'auto' | 'review' | 'audit') => {
    setMode(m);
    const supabase = createClient();
    await supabase.from('security_agent_config').update({ value: JSON.stringify(m), updated_at: new Date().toISOString() }).eq('key', 'agent_mode');
  };

  const approve = async (id: string) => { const supabase = createClient(); await supabase.from('security_pending_repairs').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id); load(); };
  const reject = async (id: string) => { const supabase = createClient(); await supabase.from('security_pending_repairs').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id); load(); };

  const filtered = findings.filter(f => (sevFilter === 'ALL' || f.severity === sevFilter) && (statFilter === 'ALL' || f.status === statFilter));

  if (loading) return <div className="min-h-screen bg-[#0f1623] flex items-center justify-center"><Activity className="w-5 h-5 text-[#2DA5A0] animate-spin" strokeWidth={1.5} /><span className="ml-2 text-[#2DA5A0]">Loading...</span></div>;

  return (
    <div className="min-h-screen bg-[#0f1623] text-white p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2DA5A0]/20 border border-[#2DA5A0]/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#2DA5A0]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Security Advisor Agent</h1>
            <p className="text-sm text-slate-400">24/7 autonomous monitoring & repair</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            {(['auto', 'review', 'audit'] as const).map(m => (
              <button key={m} onClick={() => updateMode(m)} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${mode === m ? 'bg-[#2DA5A0] text-white' : 'text-slate-400 hover:text-white'}`}>{m}</button>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-[#2DA5A0] text-white rounded-lg text-sm font-medium">
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </div>

      {/* Severity cards */}
      {scan && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {([['CRITICAL', scan.critical_count], ['HIGH', scan.high_count], ['MEDIUM', scan.medium_count], ['LOW', scan.low_count], ['INFO', scan.info_count]] as [Severity, number][]).map(([sev, cnt]) => {
            const c = SEV[sev]; const Icon = c.icon;
            return (
              <button key={sev} onClick={() => setSevFilter(sevFilter === sev ? 'ALL' : sev)}
                className={`p-4 rounded-xl border text-left transition-all ${sevFilter === sev ? c.bg + ' ring-1 ring-white/10' : 'bg-white/5 border-white/10'}`}>
                <div className={`text-2xl font-bold ${c.color}`}>{cnt}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Icon className="w-3.5 h-3.5" strokeWidth={1.5} />{c.label}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Scan stats */}
      {scan && (
        <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" strokeWidth={1.5} /> {new Date(scan.scanned_at).toLocaleString()}</span>
          <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} /> {scan.auto_repaired_count} repaired</span>
          <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-yellow-400" strokeWidth={1.5} /> {scan.pending_review_count} pending</span>
          <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-red-400" strokeWidth={1.5} /> {scan.open_count} open</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 gap-6">
        {([{ key: 'findings', label: 'Findings', icon: AlertTriangle, badge: findings.filter(f => f.status === 'open').length },
           { key: 'pending', label: 'Pending Repairs', icon: Wrench, badge: pending.length },
           { key: 'config', label: 'Config', icon: Settings, badge: 0 }] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-[#2DA5A0] text-[#2DA5A0]' : 'border-transparent text-slate-400 hover:text-white'}`}>
            <t.icon className="w-4 h-4" strokeWidth={1.5} />{t.label}
            {t.badge > 0 && <span className="ml-1 px-1.5 py-0.5 bg-[#2DA5A0]/20 text-[#2DA5A0] rounded text-xs">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Findings */}
      {tab === 'findings' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="flex items-center gap-1 text-xs text-slate-400"><Filter className="w-3.5 h-3.5" strokeWidth={1.5} /> Status:</span>
            {(['ALL', 'open', 'auto_repaired', 'pending_review', 'resolved'] as const).map(s => (
              <button key={s} onClick={() => setStatFilter(s)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${statFilter === s ? 'bg-[#2DA5A0]/20 text-[#2DA5A0] border border-[#2DA5A0]/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                {s === 'ALL' ? 'All' : ST[s as Status]?.label || s}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.length === 0 && <div className="text-center py-12 text-slate-500"><ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400" strokeWidth={1.5} /><p>No findings match filters.</p></div>}
            {filtered.map(f => {
              const s = SEV[f.severity]; const st = ST[f.status]; const Icon = s.icon;
              return (
                <div key={f.id} className={`rounded-xl border transition-all ${s.bg}`}>
                  <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                    <span className={s.color}><Icon className="w-4 h-4" strokeWidth={1.5} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className={`text-xs font-bold uppercase ${s.color}`}>{s.label}</span>
                        <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded">{f.category}</span>
                        <span className={`text-xs ${st.color}`}>{st.label}</span>
                      </div>
                      <p className="text-sm font-medium text-white truncate">{f.title}</p>
                    </div>
                    {expanded === f.id ? <ChevronUp className="w-4 h-4 text-slate-400" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4 text-slate-400" strokeWidth={1.5} />}
                  </button>
                  {expanded === f.id && (
                    <div className="px-4 pb-4 border-t border-white/10">
                      <p className="text-sm text-slate-300 mt-3">{f.description}</p>
                      {f.affected_object && <p className="text-xs text-slate-400 font-mono bg-black/30 rounded px-2 py-1 mt-2 inline-block">{f.affected_object}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending */}
      {tab === 'pending' && (
        <div className="space-y-4">
          {pending.length === 0 && <div className="text-center py-12 text-slate-500"><CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" strokeWidth={1.5} /><p>No pending repairs.</p></div>}
          {pending.map(r => (
            <div key={r.id} className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${r.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400' : r.risk_level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{r.risk_level} Risk</span>
                    {r.repair_method === 'claude_ai' && <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">Claude AI</span>}
                  </div>
                  <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{r.description}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => approve(r.id)} className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium">Approve</button>
                  <button onClick={() => reject(r.id)} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium">Reject</button>
                </div>
              </div>
              <pre className="text-xs font-mono bg-black/40 rounded-lg p-3 overflow-x-auto text-slate-300 whitespace-pre-wrap">{r.proposed_sql}</pre>
            </div>
          ))}
        </div>
      )}

      {/* Config */}
      {tab === 'config' && (
        <div className="max-w-xl">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Settings className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} /> Agent Mode</h3>
            <div className="flex gap-2">
              {(['auto', 'review', 'audit'] as const).map(m => (
                <button key={m} onClick={() => updateMode(m)} className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${mode === m ? 'bg-[#2DA5A0] text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}>{m}</button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3"><b className="text-slate-400">Auto:</b> Safe repairs applied immediately. <b className="text-slate-400">Review:</b> All repairs staged. <b className="text-slate-400">Audit:</b> Read-only.</p>
          </div>
        </div>
      )}
    </div>
  );
}
