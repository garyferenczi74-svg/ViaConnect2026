'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Brain,
  Zap,
  Clock,
  ShieldCheck,
  TrendingUp,
  Video,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface TierStats {
  tier: string;
  count: number;
  avg_latency: number;
  avg_tokens: number;
}

interface AvatarStats {
  total_sessions: number;
  avg_duration: number;
  end_reasons: Record<string, number>;
}

export default function HannahUltrathinkAdmin() {
  const [tierStats, setTierStats] = useState<TierStats[]>([]);
  const [critiquePassRate, setCritiquePassRate] = useState<number | null>(null);
  const [guardrailViolations, setGuardrailViolations] = useState(0);
  const [escalationRate, setEscalationRate] = useState<number | null>(null);
  const [topSources, setTopSources] = useState<Array<{ source_type: string; count: number }>>([]);
  const [avatarStats, setAvatarStats] = useState<AvatarStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    try {
      // Sessions by tier (last 7 days)
      const { data: sessions } = await (supabase as any)
        .from('hannah_ultrathink_sessions')
        .select('tier, latency_ms, input_tokens, output_tokens')
        .gte('created_at', weekAgo);

      if (sessions) {
        const grouped: Record<string, { count: number; latencySum: number; tokenSum: number }> = {};
        for (const s of sessions) {
          const g = grouped[s.tier] || { count: 0, latencySum: 0, tokenSum: 0 };
          g.count++;
          g.latencySum += s.latency_ms || 0;
          g.tokenSum += (s.input_tokens || 0) + (s.output_tokens || 0);
          grouped[s.tier] = g;
        }
        setTierStats(
          Object.entries(grouped).map(([tier, g]) => ({
            tier,
            count: g.count,
            avg_latency: g.count > 0 ? Math.round(g.latencySum / g.count) : 0,
            avg_tokens: g.count > 0 ? Math.round(g.tokenSum / g.count) : 0,
          })),
        );

        // Escalation rate
        const escalated = sessions.filter((s: any) => s.tier === 'ultrathink').length;
        setEscalationRate(sessions.length > 0 ? Math.round((escalated / sessions.length) * 100) : 0);
      }

      // Critique pass rate
      const { data: traces } = await (supabase as any)
        .from('hannah_ultrathink_traces')
        .select('critique_passed')
        .gte('created_at', weekAgo);

      if (traces && traces.length > 0) {
        const passed = traces.filter((t: any) => t.critique_passed).length;
        setCritiquePassRate(Math.round((passed / traces.length) * 100));
      }

      // Guardrail violations (any session with non-empty guardrails_triggered)
      const { data: violated } = await (supabase as any)
        .from('hannah_ultrathink_sessions')
        .select('id')
        .not('guardrails_triggered', 'is', null)
        .gte('created_at', weekAgo);

      setGuardrailViolations(violated?.length ?? 0);

      // Top evidence sources
      const { data: citations } = await (supabase as any)
        .from('hannah_evidence_citations')
        .select('source_type')
        .gte('created_at', weekAgo);

      if (citations) {
        const counts: Record<string, number> = {};
        for (const c of citations) {
          counts[c.source_type] = (counts[c.source_type] || 0) + 1;
        }
        setTopSources(
          Object.entries(counts)
            .map(([source_type, count]) => ({ source_type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
        );
      }

      // Avatar stats
      const { data: avatarSessions } = await (supabase as any)
        .from('hannah_avatar_sessions')
        .select('duration_seconds, end_reason')
        .gte('created_at', weekAgo);

      if (avatarSessions && avatarSessions.length > 0) {
        const durations = avatarSessions.filter((s: any) => s.duration_seconds).map((s: any) => s.duration_seconds);
        const reasons: Record<string, number> = {};
        for (const s of avatarSessions) {
          const r = (s as any).end_reason || 'unknown';
          reasons[r] = (reasons[r] || 0) + 1;
        }
        setAvatarStats({
          total_sessions: avatarSessions.length,
          avg_duration: durations.length > 0 ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0,
          end_reasons: reasons,
        });
      }
    } catch (e) {
      console.error('Failed to load Ultrathink dashboard:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2DA5A0] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Hannah Ultrathink</h1>
        <p className="mt-1 text-sm text-white/40">Reasoning engine analytics (last 7 days)</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={Brain}
          label="Total Sessions"
          value={tierStats.reduce((s, t) => s + t.count, 0).toString()}
        />
        <KpiCard
          icon={TrendingUp}
          label="Escalation Rate"
          value={escalationRate !== null ? `${escalationRate}%` : 'N/A'}
        />
        <KpiCard
          icon={ShieldCheck}
          label="Critique Pass Rate"
          value={critiquePassRate !== null ? `${critiquePassRate}%` : 'N/A'}
          highlight={critiquePassRate !== null && critiquePassRate < 98}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Guardrail Violations"
          value={guardrailViolations.toString()}
          highlight={guardrailViolations > 0}
        />
      </div>

      {/* Tier breakdown */}
      <div className="rounded-2xl border border-white/10 bg-[#1E3054]/60 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white/80">Sessions by Tier</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                <th className="pb-2 pr-4">Tier</th>
                <th className="pb-2 pr-4">Count</th>
                <th className="pb-2 pr-4">Avg Latency</th>
                <th className="pb-2">Avg Tokens</th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              {tierStats.map((t) => (
                <tr key={t.tier} className="border-t border-white/5">
                  <td className="py-2 pr-4 font-medium capitalize">{t.tier}</td>
                  <td className="py-2 pr-4">{t.count}</td>
                  <td className="py-2 pr-4">{t.avg_latency}ms</td>
                  <td className="py-2">{t.avg_tokens}</td>
                </tr>
              ))}
              {tierStats.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-white/30">
                    No sessions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-col: Top sources + Avatar stats */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Top evidence sources */}
        <div className="rounded-2xl border border-white/10 bg-[#1E3054]/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-white/80">Top Evidence Sources</h2>
          </div>
          {topSources.length > 0 ? (
            <div className="space-y-2">
              {topSources.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-white/60 capitalize">{s.source_type.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-white/80">{s.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30">No citations yet</p>
          )}
        </div>

        {/* Avatar stats */}
        <div className="rounded-2xl border border-white/10 bg-[#1E3054]/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Video className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-white/80">Avatar Sessions</h2>
          </div>
          {avatarStats ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Total sessions</span>
                <span className="font-medium text-white/80">{avatarStats.total_sessions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Avg duration</span>
                <span className="font-medium text-white/80">{avatarStats.avg_duration}s</span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/5">
                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1.5">End Reasons</p>
                {Object.entries(avatarStats.end_reasons).map(([reason, count]) => (
                  <div key={reason} className="flex justify-between text-xs text-white/50">
                    <span className="capitalize">{reason.replace(/_/g, ' ')}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/30">No avatar sessions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-white/10 bg-[#1E3054]/60'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <span className="text-[11px] uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <p className={`text-lg font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
