import { Clock } from "lucide-react";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import { resolveLastSyncState } from "@/lib/body-tracker/last-sync-state";
import type { AgentPanelProps } from "./index";

/**
 * Grok roster seats with an ACC ops row and no current work.
 * Metrics come only from live tasks. No invented heartbeats, tokens, or jobs.
 */
export default function IdleRosterPanel({ tasks, events, registry, heartbeat }: AgentPanelProps) {
  const primary =
    tasks.find((t) => t.task_status === "running" || t.task_status === "queued" || t.task_status === "blocked") ??
    null;
  const sync = resolveLastSyncState({
    linked: true,
    lastSyncAt: heartbeat?.last_heartbeat || null,
  });

  return (
    <>
      <AgentMetricsTiles tasks={tasks} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AgentCurrentTaskCard task={primary} />
        <AgentTaskQueueList tasks={tasks} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <AgentActivityFeed events={events} />
        </div>
        <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/40" strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-wide text-white/50">Ops row</span>
          </div>
          <p className="text-sm text-white/70 mt-1" data-testid={`idle-ops-${registry.agent_id}`}>
            Ops row present. Idle — no current work.
          </p>
          <p className="text-[10px] text-white/40 mt-1" data-testid={`idle-sync-${registry.agent_id}`}>
            {sync.label}
          </p>
        </div>
      </div>
    </>
  );
}
