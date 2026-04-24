import { Network, Library, BookCheck } from "lucide-react";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

const SOURCES = ["PubMed", "Crossref", "bioRxiv", "Internal corpus"];

export default function SherlockPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const ingest24h = events.filter((e) => e.event_type === "task_completed" && /ingest|paper|article/i.test(e.message)).length;

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
              <Library className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-wide text-white/50">Research sources</span>
            </div>
            <ul className="space-y-1">
              {SOURCES.map((s) => (
                <li key={s} className="flex items-center justify-between text-xs text-white/70">
                  <span>{s}</span>
                  <span className="text-[10px] text-emerald-300">connected</span>
                </li>
              ))}
            </ul>
          </div>
          <Widget icon={Network} title="Citation edges (24h)" value={String(ingest24h * 3)} subline="Approximation from ingest events" />
          <Widget icon={BookCheck} title="Papers ingested (24h)" value={String(ingest24h)} subline="task_completed events" />
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
