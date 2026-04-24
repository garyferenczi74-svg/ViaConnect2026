import { Video, BookOpen, Users } from "lucide-react";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

export default function HannahPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const activeSessions = tasks.filter((t) => t.task_status === "running" && /tavus|avatar/i.test(t.task_title));

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
          <Widget icon={Video} title="Tavus sessions" value={String(activeSessions.length)} subline="Currently live avatars" />
          <Widget icon={BookOpen} title="Ultrathink queue" value={String(tasks.filter((t) => /ultrathink/i.test(t.task_title)).length)} subline="Queued thought streams" />
          <Widget icon={Users} title="CAQ interstitials" value="10" subline="Configured onboarding segments" />
        </div>
      </div>
    </>
  );
}

function Widget({ icon: Icon, title, value, subline }: { icon: React.ElementType; title: string; value: string; subline: string }) {
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
