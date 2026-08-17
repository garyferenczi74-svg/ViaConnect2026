import { ShieldAlert } from "lucide-react";
import AgentCurrentTaskCard from "../AgentCurrentTaskCard";
import AgentTaskQueueList from "../AgentTaskQueueList";
import AgentActivityFeed from "../AgentActivityFeed";
import AgentMetricsTiles from "../AgentMetricsTiles";
import type { AgentPanelProps } from "./index";
import {
  BASELINE_SECURITY_FINDINGS,
  classifySecurityFindings,
} from "@/lib/agents/synchronism/chainTypes";

/** Prompt 214a: Security Advisor panel. */
export default function SecurityAdvisorPanel({ tasks, events }: AgentPanelProps) {
  const primary = tasks.find((t) => t.task_status === "running") ?? tasks[0] ?? null;
  const summary = classifySecurityFindings(BASELINE_SECURITY_FINDINGS);

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
        <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-wide text-white/50">Baseline posture</span>
          </div>
          <div className="text-xs text-white/70">Total findings: {summary.total}</div>
          <div className="text-xs text-[#2DA5A0]">Auto-fix tier: {summary.autoFixable}</div>
          <div className="text-xs text-[#B75E18]">Report tier (Gary): {summary.reportOnly}</div>
          <ul className="text-[11px] text-white/60 space-y-1 mt-2">
            {BASELINE_SECURITY_FINDINGS.map((f) => (
              <li key={f.id}>
                [{f.tier}] {f.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
