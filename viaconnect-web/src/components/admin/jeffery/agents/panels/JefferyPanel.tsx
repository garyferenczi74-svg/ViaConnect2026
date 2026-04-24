import { GitBranch, Sparkles, ShieldAlert } from "lucide-react";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

export default function JefferyPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const guardrailEvents = events
    .filter((e) => /guardrail|policy|violat/i.test(JSON.stringify(e.metadata)) || e.event_type === "gate_failed")
    .slice(0, 10);

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
          <Widget icon={GitBranch} title="Delegation last hour" value={String(events.filter((e) => e.event_type === "delegation_sent" || e.event_type === "delegation_received").length)} subline="Orchestration edges observed" />
          <Widget icon={Sparkles} title="Self-evolution" value={String(events.filter((e) => e.event_type === "gate_passed").length)} subline="Gates passed this session" />
          <GuardrailList events={guardrailEvents} />
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

function GuardrailList({ events }: { events: AgentPanelProps["events"] }) {
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4 text-amber-300" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-wide text-white/50">Guardrail triggers</span>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-white/40">None in the last 24 hours.</p>
      ) : (
        <ul className="space-y-1">
          {events.map((e) => (
            <li key={e.id} className="text-[11px] text-white/70">
              <span className="text-white/40">{new Date(e.created_at).toLocaleTimeString()}</span> {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
