import { Layers, Flame, MessageSquare } from "lucide-react";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";

export default function ArnoldPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const reconcileQueue = tasks.filter((t) => /reconcile|recompute/i.test(t.task_title)).length;
  const reconcileTone = reconcileQueue > 5 ? "warn" : "muted";
  const recPayloadLatencies = events
    .map((e) => (typeof e.metadata?.latencyMs === "number" ? (e.metadata.latencyMs as number) : null))
    .filter((n): n is number => typeof n === "number")
    .slice(0, 20);
  const avgLatency = recPayloadLatencies.length
    ? Math.round(recPayloadLatencies.reduce((a, b) => a + b, 0) / recPayloadLatencies.length)
    : null;

  const utterances = events
    .filter((e) => /coaching|personality|utterance/i.test(JSON.stringify(e.metadata)))
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
          <ReconcileCard count={reconcileQueue} tone={reconcileTone} />
          <Widget icon={Flame} title="Claude API latency (avg)" value={avgLatency === null ? "n/a" : `${avgLatency}ms`} subline="Last 20 runs" />
          <UtteranceLog utterances={utterances} />
        </div>
      </div>
    </>
  );
}

function ReconcileCard({ count, tone }: { count: number; tone: "warn" | "muted" }) {
  const toneClass = tone === "warn" ? "text-amber-300" : "text-white/60";
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-wide text-white/50">Reconciliation queue</span>
      </div>
      <div className={`text-xl font-bold ${toneClass} mt-1`}>{count}</div>
      <div className="text-[10px] text-white/40">{tone === "warn" ? "Queue depth above threshold" : "Queue at or below threshold"}</div>
    </div>
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

function UtteranceLog({ utterances }: { utterances: AgentPanelProps["events"] }) {
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-wide text-white/50">Coaching utterances</span>
      </div>
      {utterances.length === 0 ? (
        <p className="text-xs text-white/40">No coaching emissions logged.</p>
      ) : (
        <ul className="space-y-1">
          {utterances.map((u) => (
            <li key={u.id} className="text-[11px] text-white/70 truncate">{u.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
