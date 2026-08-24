import { Dna, Lock } from "lucide-react";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

/** Prompt 214c: Elysium My Genetics panel. */
export default function ElysiumPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const genetics = events.filter((e) => /genetic|variant|igsr|upload/i.test(e.message)).length;

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
              <Dna className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-wide text-white/50">Ownership</span>
            </div>
            <div className="text-sm text-white/80 mt-1">
              My Genetics hub, GENEX360 coverage, upload mapping, 1000 Genomes reference.
            </div>
          </div>
          <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-wide text-white/50">Privacy</span>
            </div>
            <div className="text-sm text-white/80 mt-1">
              RLS on user coverage tables. Server-side uploads only. UNKNOWN never fabricated.
            </div>
          </div>
          <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
            <div className="text-[10px] uppercase tracking-wide text-white/50">Genetics events</div>
            <div className="text-xl font-bold text-white mt-1">{genetics}</div>
          </div>
        </div>
      </div>
    </>
  );
}
