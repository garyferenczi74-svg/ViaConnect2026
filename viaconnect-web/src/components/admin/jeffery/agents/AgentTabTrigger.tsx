"use client";

import { forwardRef } from "react";
import * as Icons from "lucide-react";
import AgentStatusBadge from "./AgentStatusBadge";
import type { AgentRegistryRow, AgentStatus } from "@/lib/agents/types";

export interface AgentTabTriggerProps {
  registry: AgentRegistryRow;
  status: AgentStatus;
  active: boolean;
  onSelect: () => void;
}

const AgentTabTrigger = forwardRef<HTMLButtonElement, AgentTabTriggerProps>(function AgentTabTrigger(
  { registry, status, active, onSelect },
  ref,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = ((Icons as unknown) as Record<string, React.ElementType>)[registry.icon_name] ?? Icons.Circle;
  return (
    <button
      ref={ref}
      id={`agent-tab-${registry.agent_id}`}
      role="tab"
      aria-selected={active}
      aria-controls={`agent-panel-${registry.agent_id}`}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap snap-start outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0] ${
        active
          ? "bg-[#1E3054] text-white border-b-2 border-b-[#2DA5A0]"
          : "text-white/70 hover:text-white/90 hover:bg-white/5"
      }`}
      style={active ? { boxShadow: `0 1px 0 0 ${registry.accent_color} inset` } : undefined}
    >
      <Icon className="w-4 h-4" strokeWidth={1.5} style={active ? { color: registry.accent_color } : undefined} />
      <span>{registry.display_name}</span>
      <AgentStatusBadge status={status} agentName={registry.display_name} withLabel={false} size="sm" />
    </button>
  );
});

export default AgentTabTrigger;
