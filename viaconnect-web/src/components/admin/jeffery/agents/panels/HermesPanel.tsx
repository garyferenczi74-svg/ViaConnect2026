import { Send } from "lucide-react";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

/** Hermes peptide scout. Counts come from live tasks/events only. */
export default function HermesPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const scoutEvents = events.filter((e) => /hermes|scout|peptide/i.test(e.message)).length;

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
        <div className="space-y-3">
          <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-wide text-white/50">Ownership</span>
            </div>
            <div className="text-sm text-white/80 mt-1">
              Peptide scout under Jeffery. Reports to Thanos. Educational sources only.
            </div>
          </div>
          <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
            <div className="text-[10px] uppercase tracking-wide text-white/50">Scout events</div>
            <div className="text-xl font-bold text-white mt-1">{scoutEvents}</div>
          </div>
        </div>
      </div>
    </>
  );
}
