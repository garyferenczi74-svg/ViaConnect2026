import AgentHeader from "./AgentHeader";
import { agentHasOwnedCadenceJob, agentHasRunner } from "@/lib/agents/runners";
import type {
  AgentActivityEvent,
  AgentCurrentTask,
  AgentHeartbeat,
  AgentRegistryRow,
} from "@/lib/agents/types";

export interface AgentPanelShellProps {
  registry: AgentRegistryRow;
  heartbeat: AgentHeartbeat | null;
  tasks: AgentCurrentTask[];
  events: AgentActivityEvent[];
  children?: React.ReactNode;
}

export default function AgentPanelShell({ registry, heartbeat, children }: AgentPanelShellProps) {
  return (
    <div className="space-y-4">
      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 md:p-5">
        <AgentHeader
          registry={registry}
          heartbeat={heartbeat}
          hasOwnedCadenceJob={agentHasOwnedCadenceJob(registry.agent_id)}
          hasRunner={agentHasRunner(registry.agent_id)}
        />
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
