import { ShieldCheck, Gavel, ScrollText } from "lucide-react";
import type { IconType } from '@/types/icon';
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

// The 14 rule sets Marshall enforces (src/lib/compliance/rules/index.ts).
const PILLARS = [
  "Claims", "Peptide", "Genetic", "Practitioner", "MAP", "Comms", "Privacy",
  "Brand", "Audit", "Social", "Pre-check", "Counterfeit", "Marketing", "Rebuttal",
];

export default function MarshallPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const scans24h = events.filter((e) => e.event_type === "task_completed" && /scan|rule|finding|gate/i.test(e.message)).length;
  const gateFails24h = events.filter((e) => e.event_type === "gate_failed").length;

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
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-wide text-white/50">Rule sets</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {PILLARS.map((p) => (
                <span key={p} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-white/70">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <Widget icon={ScrollText} title="Compliance scans (24h)" value={String(scans24h)} subline="task_completed events" />
          <Widget icon={Gavel} title="Gate blocks (24h)" value={String(gateFails24h)} subline="gate_failed events" />
        </div>
      </div>
    </>
  );
}

function Widget({ icon: Icon, title, value, subline }: { icon: IconType; title: string; value: string; subline: string }) {
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-wide text-white/50">{title}</span>
      </div>
      <div className="text-xl font-bold text-white mt-1">{value}</div>
      <div className="text-[10px] text-white/40">{subline}</div>
    </div>
  );
}
