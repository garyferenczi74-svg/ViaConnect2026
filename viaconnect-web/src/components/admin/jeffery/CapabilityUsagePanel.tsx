"use client";

/**
 * Prompt 219G: Admin Command Center capability usage panel.
 * Desktop + mobile: responsive table / stacked cards, no horizontal overflow.
 */

import { useCallback, useEffect, useState } from "react";
import { getDisplayName } from "@/lib/getDisplayName";
import { Loader2, RefreshCw, Zap } from "lucide-react";

interface UsageRow {
  runId: string;
  runDate: string;
  agent: string;
  capability: string;
  queryShape: string;
  credits: number;
  tokens: number;
  outcome: string;
  reason?: string;
  durationMs: number;
  startedAt: string;
}

interface MatrixRow {
  agent_id: string;
  capability_id: string;
  granted: boolean;
}

interface Payload {
  matrix: MatrixRow[];
  usage: UsageRow[];
  budgets: {
    dayKey: string;
    firecrawl: { pagesUsed: number; creditsUsed: number; maxCredits: number; hitBudget: boolean };
    firecrawlByAgent: Array<{ agent: string; credits: number }>;
    grok: { tokensUsed: number; maxTokens: number; byAgent: Array<{ agent: string; tokens: number }> };
  };
  grok: { configured: boolean; model: string };
  coreSeven: string[];
}

export default function CapabilityUsagePanel() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoNote, setDemoNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/jeffery/capabilities", { credentials: "same-origin" });
      if (!res.ok) {
        setError("Could not load capability usage");
        setData(null);
        return;
      }
      const json = (await res.json()) as Payload;
      setData(json);
    } catch {
      setError("Could not load capability usage");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runDemos = async () => {
    setDemoRunning(true);
    setDemoNote(null);
    try {
      const res = await fetch("/api/admin/jeffery/capabilities", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "demo" }),
      });
      const json = await res.json().catch(() => ({}));
      const n = Array.isArray(json.demos) ? json.demos.length : 0;
      setDemoNote(`Ran ${n} core-seven capability demos. Refreshing usage...`);
      await load();
    } catch {
      setDemoNote("Demo run failed open. Check logs.");
    } finally {
      setDemoRunning(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm p-4">
        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
        Loading capability registry...
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-sm text-white/50 p-4">{error}</p>;
  }

  const matrix = data?.matrix ?? [];
  const usage = data?.usage ?? [];
  const coreSeven = data?.coreSeven ?? [];
  const caps = Array.from(new Set(matrix.map((m) => m.capability_id))).sort();

  return (
    <div className="space-y-4 p-3 md:p-4 max-w-full overflow-x-hidden">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
            Agent capabilities
          </h2>
          <p className="text-xs text-white/40 mt-1">
            Shared registry (Firecrawl, PubMed, Grok research, health digests, Authorities, Research Hub).
            Per-agent usage from pipeline_runs.
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
            disabled={demoRunning}
            onClick={() => void runDemos()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[#2DA5A0]/40 text-[#2DA5A0] hover:bg-[#2DA5A0]/10 disabled:opacity-50"
          >
            {demoRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Run core-seven demos
          </button>
        </div>
      </div>

      {demoNote && <p className="text-xs text-white/50">{demoNote}</p>}

      {/* Matrix */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1E3054]/40 p-3 overflow-x-auto">
        <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Permission matrix (core seven)</p>
        <table className="w-full text-left text-xs min-w-[520px]">
          <thead>
            <tr className="text-white/40">
              <th className="py-1 pr-2 font-medium">Agent</th>
              {caps.map((c) => (
                <th key={c} className="py-1 px-1 font-medium whitespace-nowrap">
                  {c.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coreSeven.map((agent) => (
              <tr key={agent} className="border-t border-white/[0.06]">
                <td className="py-1.5 pr-2 text-white/80">{getDisplayName(agent)}</td>
                {caps.map((c) => {
                  const granted = matrix.some(
                    (m) => m.agent_id === agent && m.capability_id === c && m.granted
                  );
                  return (
                    <td key={c} className="py-1.5 px-1 text-center">
                      <span className={granted ? "text-emerald-400" : "text-white/20"}>
                        {granted ? "Y" : "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#1E3054]/40 p-3">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Firecrawl shared budget</p>
          <p className="text-sm text-white/80">
            {data?.budgets.firecrawl.creditsUsed ?? 0} / {data?.budgets.firecrawl.maxCredits ?? "—"} credits
            {data?.budgets.firecrawl.hitBudget ? " (ceiling hit)" : ""}
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-white/50">
            {(data?.budgets.firecrawlByAgent ?? []).map((s) => (
              <li key={s.agent}>
                {getDisplayName(s.agent)}: {s.credits} credits
              </li>
            ))}
            {(data?.budgets.firecrawlByAgent ?? []).length === 0 && (
              <li>No agent spend yet today ({data?.budgets.dayKey})</li>
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1E3054]/40 p-3">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Grok research budget</p>
          <p className="text-sm text-white/80">
            Model {data?.grok.model ?? "—"} · {data?.grok.configured ? "key present" : "key missing"}
          </p>
          <p className="text-xs text-white/50 mt-1">
            {data?.budgets.grok.tokensUsed ?? 0} / {data?.budgets.grok.maxTokens ?? "—"} tokens today
          </p>
        </div>
      </div>

      {/* Usage log */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1E3054]/40 p-3">
        <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Recent capability calls</p>
        {usage.length === 0 ? (
          <p className="text-xs text-white/40">No capability rows yet. Run demos or wait for agent traffic.</p>
        ) : (
          <ul className="space-y-2">
            {usage.map((u) => (
              <li
                key={u.runId}
                className="rounded-lg border border-white/[0.06] bg-black/10 px-3 py-2 text-xs min-w-0"
              >
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/80">
                  <span className="font-medium">{getDisplayName(u.agent)}</span>
                  <span className="text-white/40">{u.capability}</span>
                  <span
                    className={
                      u.outcome === "ok"
                        ? "text-emerald-400"
                        : u.outcome === "budget_exhausted"
                          ? "text-amber-400"
                          : "text-white/50"
                    }
                  >
                    {u.outcome}
                  </span>
                  <span className="text-white/30 ml-auto">{u.durationMs}ms</span>
                </div>
                <p className="text-white/40 mt-0.5 truncate" title={u.queryShape}>
                  {u.queryShape || "(no shape)"}
                </p>
                <p className="text-white/30 mt-0.5">
                  credits {u.credits} · tokens {u.tokens}
                  {u.reason ? ` · ${u.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
