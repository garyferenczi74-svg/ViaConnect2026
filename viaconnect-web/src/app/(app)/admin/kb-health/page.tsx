// src/app/(app)/admin/kb-health/page.tsx
//
// KB Health panel - admin-only internal page showing research loop health:
//   - Per-agent heartbeats with stale/error visual flags
//   - Recent research runs (atoms created/rejected, gaps, duration, status)
//
// Admin access is enforced by the middleware at src/lib/supabase/middleware.ts:
// any request to /admin/* that lacks profiles.role='admin' is redirected to
// the role home path. The page itself is a server component that does NOT
// perform its own redirect - it relies entirely on the middleware gate (same
// pattern as src/app/(app)/admin/marshall/page.tsx and all other admin pages).
// Data reads use the service-role admin client because research_run_log and
// agent_heartbeats have service-role-only RLS policies.
//
// Prompt 208, Phase 9, Task 24 (2026-06-21).
// No em/en-dashes. No emojis. Lucide strokeWidth 1.5.

import { Activity, AlertTriangle, CheckCircle, Clock, Database, XCircle } from 'lucide-react'
import { readHeartbeats } from '@/lib/research/heartbeat'
import { getRecentResearchRuns } from '@/lib/research/readRuns'

export const dynamic = 'force-dynamic'

// A heartbeat is considered stale if the last beat is older than this threshold.
const STALE_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutes

function isStale(lastBeatAt: string): boolean {
  try {
    const age = Date.now() - new Date(lastBeatAt).getTime()
    return age > STALE_THRESHOLD_MS
  } catch {
    return true
  }
}

function formatRelative(isoString: string): string {
  try {
    const age = Date.now() - new Date(isoString).getTime()
    const minutes = Math.floor(age / 60_000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  } catch {
    return isoString
  }
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export default async function KbHealthPage() {
  const [heartbeats, runs] = await Promise.all([
    readHeartbeats(),
    getRecentResearchRuns(50),
  ])

  return (
    <div className="min-h-screen bg-[#1A2744]">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/33 flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-teal-400" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">KB Health</h1>
            <p className="text-xs text-white/40">Research loop health: agent heartbeats and recent research runs.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-8">

        {/* Heartbeats section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-white/60" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wide">Agent Heartbeats</h2>
          </div>

          {heartbeats.length === 0 ? (
            <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-6 text-center text-sm text-white/40">
              No heartbeats yet. Agents have not run or no heartbeats have been recorded.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {heartbeats.map((hb) => {
                const stale = isStale(hb.last_beat_at)
                const isError = hb.status === 'error' || hb.status === 'degraded'
                const flagged = stale || isError

                return (
                  <div
                    key={hb.agent}
                    className={`rounded-xl border p-4 ${
                      flagged
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-[#1E3054] border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-white truncate">{hb.agent}</span>
                      <HeartbeatStatusBadge status={hb.status} stale={stale} />
                    </div>
                    <div className="text-xs text-white/50">
                      Last beat: <span className={flagged ? 'text-red-300' : 'text-white/70'}>{formatRelative(hb.last_beat_at)}</span>
                    </div>
                    {flagged && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-red-300">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
                        <span>{stale ? 'Stale beat (over 15 min)' : `Status: ${hb.status}`}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent Runs section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-white/60" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wide">Recent Research Runs</h2>
            <span className="ml-auto text-xs text-white/40">(last 50)</span>
          </div>

          {runs.length === 0 ? (
            <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-6 text-center text-sm text-white/40">
              No research runs yet. The research scheduler has not produced any run log entries.
            </div>
          ) : (
            <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-xs text-white/40 uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Domain</th>
                      <th className="text-right px-4 py-3 font-medium">Created</th>
                      <th className="text-right px-4 py-3 font-medium">Rejected</th>
                      <th className="text-right px-4 py-3 font-medium">Gaps</th>
                      <th className="text-right px-4 py-3 font-medium">Duration</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run, idx) => (
                      <tr
                        key={`${run.domain}-${run.created_at}-${idx}`}
                        className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 text-white font-medium">
                          {run.domain ?? <span className="text-white/30 italic">unknown</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-teal-300">{run.atoms_created}</td>
                        <td className="px-4 py-3 text-right text-amber-300">{run.atoms_rejected}</td>
                        <td className="px-4 py-3 text-right text-blue-300">{run.gaps_recorded}</td>
                        <td className="px-4 py-3 text-right text-white/60">{formatDuration(run.duration_ms)}</td>
                        <td className="px-4 py-3 text-center">
                          <RunStatusBadge status={run.status} />
                        </td>
                        <td className="px-4 py-3 text-right text-white/40 text-xs">{formatRelative(run.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HeartbeatStatusBadge({ status, stale }: { status: string; stale: boolean }) {
  if (stale || status === 'error') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-medium">
        <XCircle className="w-3 h-3" strokeWidth={1.5} />
        {stale ? 'stale' : 'error'}
      </span>
    )
  }
  if (status === 'degraded') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium">
        <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
        degraded
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-medium">
      <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
      ok
    </span>
  )
}

function RunStatusBadge({ status }: { status: string }) {
  if (status === 'error' || status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs">
        <XCircle className="w-3 h-3" strokeWidth={1.5} />
        {status}
      </span>
    )
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs">
        <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
        partial
      </span>
    )
  }
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs">
        <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
        ok
      </span>
    )
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-xs">
      {status}
    </span>
  )
}
