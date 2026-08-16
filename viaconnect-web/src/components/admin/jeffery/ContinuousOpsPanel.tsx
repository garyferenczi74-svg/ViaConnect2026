"use client";

/**
 * Prompt 219H: Admin Command Center continuous operations view.
 * Desktop + mobile: stacked cards, no horizontal overflow.
 */

import { useCallback, useEffect, useState } from "react";
import { getDisplayName } from "@/lib/getDisplayName";
import { Activity, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

interface CadenceRow {
  job_key: string;
  agent_id: string;
  label: string;
  interval_minutes: number;
  mechanism: string;
  budget_class: string;
  enabled: boolean;
  last_run_at: string | null;
  last_status: string | null;
  next_run_at: string | null;
}

interface FreshnessRow {
  targetKey: string;
  label: string;
  maxAgeHours: number;
  ageHours: number | null;
  status: string;
  domain: string;
}

interface Payload {
  cadence: CadenceRow[];
  recentRuns: Array<{
    runId: string;
    jobKey: string;
    agent: string;
    outcome: string;
    durationMs: number;
    startedAt: string;
  }>;
  deadLetters: Array<{
    id: string;
    job_key: string;
    agent_id: string;
    failure_class: string;
    created_at: string;
  }>;
  freshness: FreshnessRow[];
  backlog: Array<{ job_key: string; agent_id: string; reason: string; created_at: string }>;
  budgetProjection: {
    firecrawl: { projectedCredits: number; ceilingCredits: number; flag: boolean };
    grok: { projectedTokens: number; ceilingTokens: number; flag: boolean };
    flags: string[];
  };
  mechanisms: Record<string, string>;
}

export default function ContinuousOpsPanel() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/jeffery/ops", { credentials: "same-origin" });
      if (!res.ok) {
        setData(null);
        return;
      }
      setData((await res.json()) as Payload);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (mode: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/jeffery/ops", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, ...extra }),
      });
      const json = await res.json().catch(() => ({}));
      setNote(JSON.stringify(json).slice(0, 280));
      await load();
    } catch {
      setNote("Request failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm p-4">
        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
        Loading continuous ops...
      </div>
    );
  }

  const freshness = data?.freshness ?? [];
  const breaches = freshness.filter((f) => f.status === "breach" || f.status === "warning");

  return (
    <div className="space-y-4 p-3 md:p-4 max-w-full overflow-x-hidden">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
            Continuous operations
          </h2>
          <p className="text-xs text-white/40 mt-1">
            Cadence matrix, freshness, dead letters, budget projection. Machine-scheduled only;
            no agent self-modification.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/15 text-white/70 hover:bg-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void post("tick")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[#2DA5A0]/40 text-[#2DA5A0] hover:bg-[#2DA5A0]/10 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Run ops tick
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void post("coalesce_test")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/15 text-white/70 hover:bg-white/10 disabled:opacity-50"
          >
            Coalesce drill
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void post("watchdog_drill", { forceSecondFailure: true })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
          >
            Recovery drill
          </button>
        </div>
      </div>

      {note && (
        <p className="text-[11px] text-white/40 break-all font-mono bg-black/20 rounded-lg p-2">{note}</p>
      )}

      {/* Freshness */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1E3054]/40 p-3">
        <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Freshness targets</p>
        {breaches.length > 0 && (
          <p className="text-xs text-amber-300 flex items-center gap-1 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
            {breaches.length} warning/breach reading(s)
          </p>
        )}
        <ul className="space-y-2">
          {freshness.map((f) => (
            <li
              key={f.targetKey}
              className="flex flex-wrap gap-x-3 gap-y-1 text-xs border border-white/[0.06] rounded-lg px-3 py-2"
            >
              <span className="text-white/80 min-w-0 flex-1">{f.label}</span>
              <span className="text-white/40">max {f.maxAgeHours}h</span>
              <span className="text-white/40">
                age {f.ageHours === null ? "UNKNOWN" : `${f.ageHours}h`}
              </span>
              <span
                className={
                  f.status === "ok"
                    ? "text-emerald-400"
                    : f.status === "breach"
                      ? "text-red-400"
                      : f.status === "warning"
                        ? "text-amber-300"
                        : "text-white/40"
                }
              >
                {f.status}
              </span>
            </li>
          ))}
          {freshness.length === 0 && (
            <li className="text-xs text-white/40">No measurements yet.</li>
          )}
        </ul>
      </div>

      {/* Budget projection flags */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1E3054]/40 p-3">
        <p className="text-xs uppercase tracking-wider text-white/40 mb-2">
          Budget projection (for Gary; ceilings not raised)
        </p>
        <p className="text-xs text-white/70">
          Firecrawl ~{data?.budgetProjection.firecrawl.projectedCredits ?? "—"} /{" "}
          {data?.budgetProjection.firecrawl.ceilingCredits ?? "—"} credits/day
          {data?.budgetProjection.firecrawl.flag ? " (flag)" : ""}
        </p>
        <p className="text-xs text-white/70 mt-1">
          Grok ~{data?.budgetProjection.grok.projectedTokens ?? "—"} /{" "}
          {data?.budgetProjection.grok.ceilingTokens ?? "—"} tokens/day
          {data?.budgetProjection.grok.flag ? " (flag)" : ""}
        </p>
        <ul className="mt-2 space-y-1">
          {(data?.budgetProjection.flags ?? []).map((f, i) => (
            <li key={i} className="text-[11px] text-amber-200/80">
              {f}
            </li>
          ))}
          {(data?.budgetProjection.flags ?? []).length === 0 && (
            <li className="text-[11px] text-white/40">No ceiling flags under projected 24/7 load.</li>
          )}
        </ul>
      </div>

      {/* Cadence matrix */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1E3054]/40 p-3 overflow-x-auto">
        <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Cadence matrix</p>
        <table className="w-full text-left text-[11px] min-w-[640px]">
          <thead>
            <tr className="text-white/40">
              <th className="py-1 pr-2">Job</th>
              <th className="py-1 pr-2">Agent</th>
              <th className="py-1 pr-2">Interval</th>
              <th className="py-1 pr-2">Mechanism</th>
              <th className="py-1 pr-2">Budget</th>
              <th className="py-1 pr-2">Last</th>
              <th className="py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.cadence ?? []).map((j) => (
              <tr key={j.job_key} className="border-t border-white/[0.06] text-white/75">
                <td className="py-1.5 pr-2 font-medium">{j.job_key}</td>
                <td className="py-1.5 pr-2">{getDisplayName(j.agent_id)}</td>
                <td className="py-1.5 pr-2">{j.interval_minutes}m</td>
                <td className="py-1.5 pr-2">{j.mechanism}</td>
                <td className="py-1.5 pr-2">{j.budget_class}</td>
                <td className="py-1.5 pr-2 whitespace-nowrap">
                  {j.last_run_at ? new Date(j.last_run_at).toISOString().slice(11, 16) + "Z" : "—"}
                </td>
                <td className="py-1.5">{j.last_status ?? (j.enabled ? "idle" : "off")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dead letters + backlog */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#1E3054]/40 p-3">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Dead letters</p>
          <ul className="space-y-1.5">
            {(data?.deadLetters ?? []).map((d) => (
              <li key={d.id} className="text-xs text-white/70 border border-white/[0.06] rounded-lg px-2 py-1.5">
                <span className="text-amber-300">{d.job_key}</span> · {d.failure_class}
                <span className="text-white/30 block text-[10px]">{d.created_at}</span>
              </li>
            ))}
            {(data?.deadLetters ?? []).length === 0 && (
              <li className="text-xs text-white/40">None open.</li>
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1E3054]/40 p-3">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Budget backlog</p>
          <ul className="space-y-1.5">
            {(data?.backlog ?? []).map((b, i) => (
              <li key={i} className="text-xs text-white/70 border border-white/[0.06] rounded-lg px-2 py-1.5">
                {b.job_key} · {b.reason}
              </li>
            ))}
            {(data?.backlog ?? []).length === 0 && (
              <li className="text-xs text-white/40">Empty.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Recent ops runs */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1E3054]/40 p-3">
        <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Recent ops runs</p>
        <ul className="space-y-1.5 max-h-64 overflow-y-auto">
          {(data?.recentRuns ?? []).map((r) => (
            <li key={r.runId} className="text-xs text-white/70 flex flex-wrap gap-x-2">
              <span className="text-white/40">{r.startedAt?.slice(0, 19)}</span>
              <span>{r.jobKey}</span>
              <span>{getDisplayName(r.agent)}</span>
              <span
                className={
                  r.outcome === "ok" ? "text-emerald-400" : r.outcome === "failed" ? "text-red-400" : "text-white/50"
                }
              >
                {r.outcome}
              </span>
              <span className="text-white/30">{r.durationMs}ms</span>
            </li>
          ))}
          {(data?.recentRuns ?? []).length === 0 && (
            <li className="text-xs text-white/40">No ops-* pipeline rows yet. Run ops tick.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
