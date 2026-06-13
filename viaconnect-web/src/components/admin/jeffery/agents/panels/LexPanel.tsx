import { Scale, FileWarning, Landmark } from "lucide-react";
import type { IconType } from '@/types/icon';
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

// Lex's review lanes per the agent card (.claude/agents/lex.md). Customs is
// deliberately absent: that lane belongs to Marshall.
const LANES = [
  "Case management",
  "PACER / docketing",
  "E-filing payloads",
  "Discovery",
  "IOLTA / trust accounting",
  "MAP enforcement escalation",
  "Claims language exposure",
];

export default function LexPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const reviews24h = events.filter((e) => e.event_type === "task_completed" && /review|case|filing|legal|claim/i.test(e.message)).length;
  const flags24h = events.filter((e) => e.event_type === "gate_failed" || (e.severity === "warn" && /legal|claim|privilege/i.test(e.message))).length;

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
              <Scale className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-wide text-white/50">Review lanes</span>
            </div>
            <ul className="space-y-1">
              {LANES.map((l) => (
                <li key={l} className="text-xs text-white/70">{l}</li>
              ))}
            </ul>
          </div>
          <Widget icon={Landmark} title="Legal reviews (24h)" value={String(reviews24h)} subline="task_completed events" />
          <Widget icon={FileWarning} title="Exposure flags (24h)" value={String(flags24h)} subline="gate_failed and legal warns" />
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
