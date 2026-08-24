import { Utensils, Leaf, Gauge } from "lucide-react";
import type { IconType } from "@/types/icon";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

/**
 * Admin panel for Gordon (Prompt 214). Sole nutrition computation owner.
 * Surfaces live tasks/events from the fleet bus when present.
 */
export default function GordonPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const scored = events.filter(
    (e) => e.event_type === "task_completed" && /meal|score|nutrition|target/i.test(e.message),
  ).length;

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
          <Widget
            icon={Utensils}
            title="Meal scores (24h events)"
            value={String(scored)}
            subline="task_completed nutrition events"
          />
          <Widget
            icon={Leaf}
            title="Ownership"
            value="Sole"
            subline="Unified meals + targets via Gordon"
          />
          <Widget
            icon={Gauge}
            title="UNKNOWN rule"
            value="Honest"
            subline="Never fabricate 0 for missing nutrients"
          />
        </div>
      </div>
    </>
  );
}

function Widget({
  icon: Icon,
  title,
  value,
  subline,
}: {
  icon: IconType;
  title: string;
  value: string;
  subline: string;
}) {
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
