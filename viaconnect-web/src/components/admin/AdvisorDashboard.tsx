'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Wrench, RefreshCw, Clock, Database, Shield, Zap, Activity, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';

interface AdvisorSummary { severity: string; category: string; open_count: number; fixed_today: number; }
interface RecentFix { fix_type: string; affected_table: string; title: string; severity: string; applied_at: string; success: boolean; duration_ms: number; }
interface MigrationLog { migration_name: string; applied_at: string; post_check_status: string; issues_found: number; issues_fixed: number; }

const SEV_CONFIG: Record<string, { icon: typeof AlertCircle; color: string; label: string }> = {
  error:   { icon: AlertCircle,   color: 'text-red-600 bg-red-50 border-red-200', label: 'Errors' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Warnings' },
  info:    { icon: Info,          color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Info' },
};
const CAT_ICON: Record<string, typeof Zap> = { performance: Zap, security: Shield, reliability: Database, auth: Activity };
const FIX_COLORS: Record<string, string> = {
  'create-index': 'bg-teal-100 text-teal-700', 'drop-index': 'bg-orange-100 text-orange-700',
  'vacuum-analyze': 'bg-purple-100 text-purple-700', 'enable-rls': 'bg-red-100 text-red-700',
  'update-stats': 'bg-blue-100 text-blue-700', 'custom-sql': 'bg-gray-100 text-gray-700',
};
const CHECK_CONFIG: Record<string, { color: string; label: string }> = {
  clean: { color: 'text-teal-600 bg-teal-50', label: 'Clean' },
  'issues-found': { color: 'text-red-600 bg-red-50', label: 'Issues' },
  pending: { color: 'text-gray-500 bg-gray-50', label: 'Pending' },
  'issues-fixed': { color: 'text-amber-600 bg-amber-50', label: 'Fixed' },
};

export default function AdvisorDashboard() {
  const [summary, setSummary] = useState<AdvisorSummary[]>([]);
  const [fixes, setFixes] = useState<RecentFix[]>([]);
  const [migrations, setMigrations] = useState<MigrationLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedMig, setExpandedMig] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    const supabase = createClient();
    const [sumRes, fixRes, migRes] = await Promise.all([
      supabase.rpc('get_advisor_summary'),
      supabase.rpc('get_recent_fixes', { limit_n: 15 }),
      supabase.from('migration_sync_log').select('*').order('applied_at', { ascending: false }).limit(10),
    ]);
    if (sumRes.data) setSummary(sumRes.data);
    if (fixRes.data) setFixes(fixRes.data);
    if (migRes.data) setMigrations(migRes.data);
    setIsRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalOpen = summary.reduce((a, s) => a + s.open_count, 0);
  const totalFixedToday = summary.reduce((a, s) => a + s.fixed_today, 0);
  const errorCount = summary.filter(s => s.severity === 'error').reduce((a, s) => a + s.open_count, 0);
  const warningCount = summary.filter(s => s.severity === 'warning').reduce((a, s) => a + s.open_count, 0);

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A2744] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#2DA5A0]" strokeWidth={1.5} />
            Performance Advisor Agent
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">24/7 auto-repair and synchronization</p>
        </div>
        <button onClick={loadData} disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2DA5A0] text-white text-sm font-medium hover:bg-[#2DA5A0]/90 transition-colors">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Open Issues', value: totalOpen, color: totalOpen > 0 ? 'text-amber-600' : 'text-teal-600', bg: totalOpen > 0 ? 'bg-amber-50 border-amber-200' : 'bg-teal-50 border-teal-200' },
          { label: 'Errors', value: errorCount, color: errorCount > 0 ? 'text-red-600' : 'text-gray-400', bg: errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200' },
          { label: 'Fixed Today', value: totalFixedToday, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
          { label: 'Warnings', value: warningCount, color: warningCount > 0 ? 'text-amber-600' : 'text-gray-400', bg: warningCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.bg}`}>
            <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Open issues */}
      {summary.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#1A2744] mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} /> Open Issues
          </h2>
          <div className="space-y-2">
            {summary.filter(s => s.open_count > 0).map(s => {
              const cfg = SEV_CONFIG[s.severity] ?? SEV_CONFIG.info;
              const CatIcon = CAT_ICON[s.category] ?? Activity;
              const SevIcon = cfg.icon;
              return (
                <div key={`${s.severity}-${s.category}`} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.color}`}>
                  <SevIcon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                  <CatIcon className="w-4 h-4 flex-shrink-0 opacity-60" strokeWidth={1.5} />
                  <span className="text-sm font-medium capitalize flex-1">{s.category} <span className="text-xs opacity-70">({s.severity})</span></span>
                  <span className="text-lg font-bold">{s.open_count}</span>
                </div>
              );
            })}
            {summary.every(s => s.open_count === 0) && (
              <div className="flex items-center gap-3 px-4 py-4 rounded-xl border border-teal-200 bg-teal-50">
                <CheckCircle className="w-5 h-5 text-teal-600" strokeWidth={1.5} />
                <p className="text-sm font-medium text-teal-700">All clear — no open advisories</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent fixes */}
      {fixes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#1A2744] mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} /> Recent Fixes
          </h2>
          <div className="space-y-1.5">
            {fixes.map((fix, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white">
                {fix.success ? <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" strokeWidth={1.5} /> : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" strokeWidth={1.5} />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{fix.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {fix.affected_table && <span className="text-xs text-gray-400">{fix.affected_table}</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${FIX_COLORS[fix.fix_type] ?? FIX_COLORS['custom-sql']}`}>{fix.fix_type}</span>
                    <span className="text-xs text-gray-400">{fix.duration_ms}ms</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Migration sync */}
      {migrations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#1A2744] mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} /> Migration Sync
          </h2>
          <div className="space-y-1.5">
            {migrations.map(mig => {
              const chk = CHECK_CONFIG[mig.post_check_status] ?? CHECK_CONFIG.pending;
              return (
                <div key={mig.migration_name} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button onClick={() => setExpandedMig(expandedMig === mig.migration_name ? null : mig.migration_name)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                    <p className="text-sm font-mono text-gray-700 truncate flex-1">{mig.migration_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${chk.color}`}>{chk.label}</span>
                    {expandedMig === mig.migration_name ? <ChevronUp className="w-4 h-4 text-gray-400" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4 text-gray-400" strokeWidth={1.5} />}
                  </button>
                  {expandedMig === mig.migration_name && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 grid grid-cols-2 gap-4 text-xs">
                      <div><span className="text-gray-500">Issues Found</span><p className="font-semibold mt-0.5">{mig.issues_found}</p></div>
                      <div><span className="text-gray-500">Issues Fixed</span><p className="font-semibold text-teal-700 mt-0.5">{mig.issues_fixed}</p></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
