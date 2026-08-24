import { ClipboardCheck, ShieldAlert, FileCheck } from "lucide-react";
import type { IconType } from "@/types/icon";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

/**
 * Admin panel for Kelsey (Prompt 214). Compliance review gate (Stage 1 + Stage 2).
 */
export default function KelseyPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const reviews = events.filter(
    (e) => /kelsey|review|claim|gate/i.test(e.message) || e.event_type === "gate_passed" || e.event_type === "gate_failed",
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
            icon={ClipboardCheck}
            title="Review events"
            value={String(reviews)}
            subline="Gate and review activity"
          />
          <Widget
            icon={ShieldAlert}
            title="Stage 1"
            value="Detector"
            subline="Disease-claim fail path"
          />
          <Widget
            icon={FileCheck}
            title="Stage 2"
            value="LLM"
            subline="Claims language review"
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
