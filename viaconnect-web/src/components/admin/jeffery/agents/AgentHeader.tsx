"use client";

import { useState } from "react";
import { Loader2, Pause, Play, Zap } from "lucide-react";
import { resolveAgentIcon } from "@/lib/agents/resolveAgentIcon";
import AgentStatusBadge from "./AgentStatusBadge";
import { deriveStatus } from "@/lib/agents/status";
import type { AgentHeartbeat, AgentRegistryRow } from "@/lib/agents/types";

export interface AgentHeaderProps {
  registry: AgentRegistryRow;
  heartbeat: AgentHeartbeat | null;
  /** Owns a cadence job that Run now can enqueue. */
  hasOwnedCadenceJob?: boolean;
  /** Has any real trigger (cadence, chain, OBRA). Grok-only seats are false. */
  hasRunner?: boolean;
}

export default function AgentHeader({
  registry,
  heartbeat,
  hasOwnedCadenceJob = false,
  hasRunner = false,
}: AgentHeaderProps) {
  const status = deriveStatus(heartbeat);
  const Icon = resolveAgentIcon(registry.icon_name);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [runBusy, setRunBusy] = useState(false);
  const [runMsg, setRunMsg] = useState<string | null>(null);

  const isPaused = status === "paused";
  const runDisabled = runBusy || isPaused || !hasOwnedCadenceJob;
  const pauseDisabled = !hasRunner;

  const toggle = async () => {
    setBusy(true);
    try {
      await fetch(`/api/admin/agents/${registry.agent_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isPaused ? "resume" : "pause" }),
      });
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const runNow = async () => {
    setRunBusy(true);
    setRunMsg(null);
    try {
      const res = await fetch(`/api/admin/agents/${registry.agent_id}/run-now`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        jobKey?: string;
        result?: { status?: string };
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setRunMsg(json.error ?? `Run failed (${res.status})`);
      } else {
        setRunMsg(
          `Ran ${json.jobKey ?? "job"}: ${json.result?.status ?? "ok"}`
        );
      }
    } catch {
      setRunMsg("Run now request failed");
    } finally {
      setRunBusy(false);
    }
  };

  return (
    <div className="flex items-start gap-4 flex-wrap">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${registry.accent_color}22`, border: `1px solid ${registry.accent_color}55` }}
      >
        <Icon className="w-6 h-6" strokeWidth={1.5} style={{ color: registry.accent_color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg md:text-xl font-bold text-white">{registry.display_name}</h2>
          <AgentStatusBadge status={status} agentName={registry.display_name} />
        </div>
        <p className="text-xs text-white/50 mt-1">{registry.role_label}</p>
        <p className="text-xs text-white/40 mt-1 max-w-3xl">{registry.description}</p>
      </div>
      <div className="ml-auto flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={runNow}
            disabled={runDisabled}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2DA5A0]/15 text-[#2DA5A0] hover:bg-[#2DA5A0]/25 disabled:opacity-30 min-h-[44px]"
            title={
              !hasOwnedCadenceJob
                ? "No runner for this seat"
                : isPaused
                  ? "Resume agent before Run now"
                  : "Enqueue primary task now"
            }
            aria-disabled={runDisabled}
          >
            {runBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
            ) : (
              <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
            Run now
          </button>
        {!confirmOpen ? (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={pauseDisabled}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[44px] disabled:opacity-30 ${
              isPaused
                ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
            title={pauseDisabled ? "No runner to pause" : isPaused ? "Resume this seat" : "Pause this seat"}
            aria-disabled={pauseDisabled}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5" strokeWidth={1.5} /> Resume
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" strokeWidth={1.5} /> Pause
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={toggle}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B75E18]/20 text-[#B75E18] hover:bg-[#B75E18]/30 disabled:opacity-30 flex items-center gap-1"
            >
              {busy && <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />}
              Confirm {isPaused ? "resume" : "pause"}
            </button>
          </div>
        )}
        </div>
        {runMsg && (
          <p className="text-[10px] text-white/50 max-w-xs text-right" role="status">
            {runMsg}
          </p>
        )}
      </div>
    </div>
  );
}
