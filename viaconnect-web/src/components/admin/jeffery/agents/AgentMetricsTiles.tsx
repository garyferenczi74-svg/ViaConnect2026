import { CheckCircle2, AlertOctagon, Timer, Cpu } from "lucide-react";
import AgentSparkline from "./AgentSparkline";
import type { AgentCurrentTask } from "@/lib/agents/types";

// The panel metrics table is new (Prompt #126); for the first ship we derive
// approximate tiles from current-task counts + any snapshots passed in. Real
// snapshot backfill lands when agents start writing to
// jeffery_agent_panel_metrics.
export interface AgentMetricsTilesProps {
  tasks: AgentCurrentTask[];
  tokens24h?: number;
  sparklines?: { tasksDone?: number[]; failureRate?: number[]; avgDuration?: number[]; tokens?: number[] };
}

export default function AgentMetricsTiles({ tasks, tokens24h = 0, sparklines }: AgentMetricsTilesProps) {
  const completed = tasks.filter((t) => t.task_status === "completed").length;
  const failed = tasks.filter((t) => t.task_status === "failed").length;
  const failureRate = completed + failed === 0 ? 0 : Math.round((failed / (completed + failed)) * 100);
  const running = tasks.filter((t) => t.task_status === "running");
  const avgDuration =
    running.length > 0
      ? Math.round(
          running
            .filter((t) => t.started_at)
            .map((t) => Date.now() - Date.parse(t.started_at as string))
            .reduce((a, b) => a + b, 0) /
            (running.filter((t) => t.started_at).length || 1),
        )
      : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Tile icon={CheckCircle2} label="Tasks done (24h)" value={completed} spark={sparklines?.tasksDone} />
      <Tile icon={AlertOctagon} label="Failure rate (24h)" value={`${failureRate}%`} spark={sparklines?.failureRate} tone="red" />
      <Tile icon={Timer} label="Avg running duration" value={avgDuration === null ? "n/a" : formatMs(avgDuration)} spark={sparklines?.avgDuration} />
      <Tile icon={Cpu} label="Tokens (24h)" value={formatNumber(tokens24h)} spark={sparklines?.tokens} />
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  spark,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  spark?: number[];
  tone?: "red";
}) {
  const valueClass = tone === "red" ? "text-red-400" : "text-white";
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-wide text-white/50">{label}</span>
      </div>
      <div className={`text-xl font-bold ${valueClass}`}>{value}</div>
      <div className="mt-1">
        <AgentSparkline values={spark ?? []} stroke={tone === "red" ? "#E05A4B" : "#2DA5A0"} />
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}
