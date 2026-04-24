import { Clock, Loader2, AlertTriangle } from "lucide-react";
import type { AgentCurrentTask } from "@/lib/agents/types";

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  queued:    { bg: "bg-white/10",         text: "text-white/60",    label: "Queued" },
  running:   { bg: "bg-[#2DA5A0]/15",     text: "text-[#2DA5A0]",   label: "Running" },
  blocked:   { bg: "bg-amber-500/15",     text: "text-amber-300",   label: "Blocked" },
  completed: { bg: "bg-emerald-500/15",   text: "text-emerald-300", label: "Completed" },
  failed:    { bg: "bg-red-500/15",       text: "text-red-400",     label: "Failed" },
  cancelled: { bg: "bg-white/5",          text: "text-white/40",    label: "Cancelled" },
};

export interface AgentCurrentTaskCardProps {
  task: AgentCurrentTask | null;
}

export default function AgentCurrentTaskCard({ task }: AgentCurrentTaskCardProps) {
  if (!task) {
    return (
      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-white/40" strokeWidth={1.5} />
          <h3 className="text-xs font-semibold text-white/60">Current task</h3>
        </div>
        <p className="text-sm text-white/50 mt-2">Idle. No tasks queued or running.</p>
      </div>
    );
  }
  const s = STATUS_STYLE[task.task_status] ?? STATUS_STYLE.queued;
  const Icon = task.task_status === "blocked" ? AlertTriangle : Loader2;
  const iconClass = task.task_status === "running" ? "motion-safe:animate-spin" : "";
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Icon className={`w-4 h-4 text-[#2DA5A0] ${iconClass}`} strokeWidth={1.5} />
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Current task</h3>
        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.bg} ${s.text}`}>
          {s.label}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white/60 uppercase">
          {task.priority}
        </span>
      </div>
      <p className="text-sm font-semibold text-white">{task.task_title}</p>
      {task.task_description && <p className="text-xs text-white/60 mt-1">{task.task_description}</p>}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
          <span>Progress</span>
          <span>{task.progress_percent}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${task.progress_percent}%`, background: "#2DA5A0" }}
          />
        </div>
      </div>
      {task.started_at && (
        <p className="text-[10px] text-white/30 mt-2">Started {new Date(task.started_at).toLocaleString()}</p>
      )}
    </div>
  );
}
