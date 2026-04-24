"use client";

import { useCallback, useRef } from "react";
import AgentTabTrigger from "./AgentTabTrigger";
import type { AgentHeartbeat, AgentId, AgentRegistryRow, AgentStatus } from "@/lib/agents/types";

export interface AgentTabBarProps {
  registry: AgentRegistryRow[];
  heartbeats: Map<AgentId, AgentHeartbeat>;
  activeAgent: AgentId;
  onChange: (a: AgentId) => void;
  deriveStatus: (hb: AgentHeartbeat | null) => AgentStatus;
}

export default function AgentTabBar({ registry, heartbeats, activeAgent, onChange, deriveStatus }: AgentTabBarProps) {
  const refs = useRef<Map<AgentId, HTMLButtonElement>>(new Map());

  const focusAgent = useCallback((id: AgentId) => {
    refs.current.get(id)?.focus();
  }, []);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = registry.findIndex((r) => r.agent_id === activeAgent);
      if (currentIndex < 0) return;
      let nextIndex = currentIndex;
      if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % registry.length;
      else if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + registry.length) % registry.length;
      else if (e.key === "Home") nextIndex = 0;
      else if (e.key === "End") nextIndex = registry.length - 1;
      else return;
      e.preventDefault();
      const next = registry[nextIndex];
      onChange(next.agent_id);
      focusAgent(next.agent_id);
    },
    [registry, activeAgent, onChange, focusAgent],
  );

  return (
    <div
      role="tablist"
      aria-label="Agent tabs"
      className="px-4 md:px-8 pt-3 pb-2 border-b border-white/[0.08] overflow-x-auto snap-x snap-mandatory"
      onKeyDown={handleKey}
    >
      <div className="flex items-center gap-1">
        {registry.map((r) => {
          const status = deriveStatus(heartbeats.get(r.agent_id) ?? null);
          return (
            <AgentTabTrigger
              key={r.agent_id}
              ref={(el) => {
                if (el) refs.current.set(r.agent_id, el);
                else refs.current.delete(r.agent_id);
              }}
              registry={r}
              status={status}
              active={r.agent_id === activeAgent}
              onSelect={() => onChange(r.agent_id)}
            />
          );
        })}
      </div>
    </div>
  );
}
