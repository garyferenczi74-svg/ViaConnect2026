"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { Loader2, Pause, Play } from "lucide-react";
import AgentStatusBadge from "./AgentStatusBadge";
import { deriveStatus } from "@/lib/agents/status";
import type { AgentHeartbeat, AgentRegistryRow } from "@/lib/agents/types";

export interface AgentHeaderProps {
  registry: AgentRegistryRow;
  heartbeat: AgentHeartbeat | null;
}

export default function AgentHeader({ registry, heartbeat }: AgentHeaderProps) {
  const status = deriveStatus(heartbeat);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = ((Icons as unknown) as Record<string, React.ElementType>)[registry.icon_name] ?? Icons.Circle;
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isPaused = status === "paused";

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
      <div className="ml-auto">
        {!confirmOpen ? (
          <button
            onClick={() => setConfirmOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
              isPaused
                ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
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
    </div>
  );
}
