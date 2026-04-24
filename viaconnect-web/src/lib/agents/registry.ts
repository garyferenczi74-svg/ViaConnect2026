/**
 * Static agent registry for the admin Agents panel (Prompt #126).
 * Five agents are surfaced in the tab bar. Display metadata (icon, accent
 * color, role label, description) lives here so new agent additions are a
 * one-line change rather than a DB seed + migration.
 *
 * Heartbeat + activity data is sourced from ultrathink_agent_registry and
 * ultrathink_agent_events via activity-tracker.ts.
 */

import type { AgentId, AgentRegistryRow } from "./types";

export const AGENT_REGISTRY: Readonly<Record<AgentId, AgentRegistryRow>> = {
  jeffery: {
    agent_id: "jeffery",
    display_name: "Jeffery",
    role_label: "Orchestrator / Master Intelligence",
    description:
      "Coordinates all sub-agents, runs the self-evolution engine, and enforces cross-portal guardrails.",
    icon_name: "Brain",
    accent_color: "#2DA5A0",
    sort_order: 1,
    is_active: true,
  },
  hannah: {
    agent_id: "hannah",
    display_name: "Hannah",
    role_label: "UX Guide / Tutorial",
    description:
      "Tavus avatar and Ultrathink engine for CAQ interstitials and onboarding.",
    icon_name: "MessageCircle",
    accent_color: "#B75E18",
    sort_order: 2,
    is_active: true,
  },
  michelangelo: {
    agent_id: "michelangelo",
    display_name: "Michelangelo",
    role_label: "TDD / Development",
    description: "Enforces the four OBRA gates on every code change.",
    icon_name: "Code2",
    accent_color: "#2DA5A0",
    sort_order: 3,
    is_active: true,
  },
  sherlock: {
    agent_id: "sherlock",
    display_name: "Sherlock",
    role_label: "Research Hub",
    description:
      "Peer-reviewed literature ingestion, citation graph, research hub requests.",
    icon_name: "Search",
    accent_color: "#B75E18",
    sort_order: 4,
    is_active: true,
  },
  arnold: {
    agent_id: "arnold",
    display_name: "Arnold",
    role_label: "Body Tracker Module",
    description:
      "Reconciliation Layer, Claude API recommendation engine, coaching engine.",
    icon_name: "Dumbbell",
    accent_color: "#2DA5A0",
    sort_order: 5,
    is_active: true,
  },
};

export function orderedRegistry(): AgentRegistryRow[] {
  return Object.values(AGENT_REGISTRY)
    .filter((r) => r.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function isKnownAgentId(value: string): value is AgentId {
  return value in AGENT_REGISTRY;
}
