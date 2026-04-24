import { CheckCircle2, Circle, TestTube, GitCommit } from "lucide-react";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

const GATES = ["observe", "blueprint", "review", "audit"] as const;
type ObraGate = (typeof GATES)[number];

function deriveActiveGate(tasks: AgentPanelProps["tasks"]): ObraGate | null {
  const running = tasks.find((t) => t.task_status === "running");
  const metaGate = (running?.metadata?.obra_gate as string | undefined)?.toLowerCase();
  if (metaGate && GATES.includes(metaGate as ObraGate)) return metaGate as ObraGate;
  return null;
}

export default function MichelangeloPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const activeGate = deriveActiveGate(tasks);
  const testsPassed = events.filter((e) => e.event_type === "gate_passed").length;
  const testsFailed = events.filter((e) => e.event_type === "gate_failed").length;
  const auditsQueued = tasks.filter((t) => (t.metadata?.awaiting_gate as string | undefined) === "audit").length;

  return (
    <>
      <AgentMetricsTiles tasks={tasks} />
      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wide text-white/50">OBRA pipeline</span>
        </div>
        <ol className="grid grid-cols-4 gap-2">
          {GATES.map((g, idx) => {
            const passed = activeGate !== null && GATES.indexOf(activeGate) > idx;
            const current = activeGate === g;
            const Icon = passed ? CheckCircle2 : current ? Circle : Circle;
            const tone = passed
              ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
              : current
                ? "text-[#2DA5A0] border-[#2DA5A0]/40 bg-[#2DA5A0]/10"
                : "text-white/40 border-white/10";
            return (
              <li key={g} className={`rounded-lg border p-2 ${tone}`}>
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="text-[10px] uppercase font-bold">{idx + 1}. {g}</span>
                </div>
                <p className="text-[10px] opacity-70 mt-1 capitalize">
                  {passed ? "Passed" : current ? "In progress" : "Pending"}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AgentCurrentTaskCard task={primary} />
        <AgentTaskQueueList tasks={tasks} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <AgentActivityFeed events={events} />
        </div>
        <div className="space-y-3">
          <Widget icon={TestTube} title="Tests passed" value={String(testsPassed)} subline="Gate events in feed" />
          <Widget icon={TestTube} title="Tests failed" value={String(testsFailed)} subline="Gate_failed events" tone={testsFailed > 0 ? "red" : undefined} />
          <Widget icon={GitCommit} title="Awaiting audit" value={String(auditsQueued)} subline="Tasks at Gate 4" />
        </div>
      </div>
    </>
  );
}

function Widget({ icon: Icon, title, value, subline, tone }: { icon: React.ElementType; title: string; value: string; subline: string; tone?: "red" }) {
  const valueClass = tone === "red" ? "text-red-400" : "text-white";
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-wide text-white/50">{title}</span>
      </div>
      <div className={`text-xl font-bold ${valueClass} mt-1`}>{value}</div>
      <div className="text-[10px] text-white/40">{subline}</div>
    </div>
  );
}
