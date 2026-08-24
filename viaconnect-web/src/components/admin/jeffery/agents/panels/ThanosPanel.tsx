import { FlaskConical, ShieldAlert } from "lucide-react";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

/** Prompt 214c: Thanos Peptide Education panel. */
export default function ThanosPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const edu = events.filter((e) => /peptide|education|allowlist/i.test(e.message)).length;

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
              <FlaskConical className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-wide text-white/50">Ownership</span>
            </div>
            <div className="text-sm text-white/80 mt-1">
              Peptide Education catalog and educational protocol guidance with Hannah.
            </div>
          </div>
          <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-wide text-white/50">Compliance</span>
            </div>
            <div className="text-sm text-white/80 mt-1">
              Educational / practitioner guidance only. Zero shop purchase paths.
            </div>
          </div>
          <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
            <div className="text-[10px] uppercase tracking-wide text-white/50">Education events</div>
            <div className="text-xl font-bold text-white mt-1">{edu}</div>
          </div>
        </div>
      </div>
    </>
  );
}
