"use client";

import { useMemo } from "react";
import { Cpu } from "lucide-react";
import AgentTabBar from "@/components/admin/jeffery/agents/AgentTabBar";
import AgentPanelShell from "@/components/admin/jeffery/agents/AgentPanelShell";
import { AGENT_PANELS } from "@/components/admin/jeffery/agents/panels";
import { useAgentRealtime } from "@/hooks/useAgentRealtime";
import { useAgentHeartbeats } from "@/hooks/useAgentHeartbeats";
import { useAgentDeepLink } from "@/hooks/useAgentDeepLink";
import { deriveStatus } from "@/lib/agents/status";
import type {
  AgentActivityEvent,
  AgentCurrentTask,
  AgentHeartbeat,
  AgentId,
  AgentRegistryRow,
} from "@/lib/agents/types";

interface AgentsClientProps {
  initialRegistry: AgentRegistryRow[];
  initialHeartbeats: AgentHeartbeat[];
  initialTasks: AgentCurrentTask[];
  initialEvents: AgentActivityEvent[];
}

export default function AgentsClient({
  initialRegistry,
  initialHeartbeats,
  initialTasks,
  initialEvents,
}: AgentsClientProps) {
  const firstId = (initialRegistry[0]?.agent_id ?? "jeffery") as AgentId;
  const { activeAgent, setActiveAgent } = useAgentDeepLink(firstId);
  const heartbeats = useAgentHeartbeats(initialHeartbeats, 5000);
  const { events, tasks, reconnecting } = useAgentRealtime({
    agentId: activeAgent,
    initialEvents: activeAgent === firstId ? initialEvents : [],
    initialTasks: initialTasks.filter((t) => t.agent_id === activeAgent),
  });

  const heartbeatByAgent = useMemo(() => {
    const map = new Map<AgentId, AgentHeartbeat>();
    for (const h of heartbeats) map.set(h.agent_id, h);
    return map;
  }, [heartbeats]);

  const activeRegistry = initialRegistry.find((r) => r.agent_id === activeAgent) ?? initialRegistry[0];
  const activeHeartbeat = heartbeatByAgent.get(activeAgent) ?? null;
  const PanelComponent = AGENT_PANELS[activeAgent];

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Agents</h1>
            <p className="text-xs text-white/40">Per-agent activity, tasks, heartbeat, and KPI widgets.</p>
          </div>
          {reconnecting && (
            <span className="ml-auto text-xs text-amber-300" role="status" aria-live="polite">
              Reconnecting realtime stream
            </span>
          )}
        </div>
      </div>

      <AgentTabBar
        registry={initialRegistry}
        heartbeats={heartbeatByAgent}
        activeAgent={activeAgent}
        onChange={setActiveAgent}
        deriveStatus={(hb) => deriveStatus(hb)}
      />

      <div id={`agent-panel-${activeAgent}`} role="tabpanel" aria-labelledby={`agent-tab-${activeAgent}`} className="px-4 md:px-8 py-6">
        {activeRegistry && PanelComponent && (
          <AgentPanelShell
            registry={activeRegistry}
            heartbeat={activeHeartbeat}
            tasks={tasks}
            events={events}
          >
            <PanelComponent
              registry={activeRegistry}
              heartbeat={activeHeartbeat}
              tasks={tasks}
              events={events}
            />
          </AgentPanelShell>
        )}
      </div>
    </div>
  );
}
