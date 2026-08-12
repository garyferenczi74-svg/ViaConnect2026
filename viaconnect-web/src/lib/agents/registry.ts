/**
 * Static agent registry for the admin Agents panel (Prompt #126 + #214).
 * Nine agents are surfaced in the tab bar. Display metadata (icon, accent
 * color, role label, description) lives here so new agent additions are a
 * one-line change rather than a DB seed + migration.
 *
 * Heartbeat + activity data is sourced from ultrathink_agent_registry and
 * ultrathink_agent_events via activity-tracker.ts (with name alias resolution).
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
    role_label: "UX Guide / Wellness Assistant",
    description:
      "Tavus avatar, Ultrathink engine, Journey accelerators, and onboarding surfaces.",
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
    role_label: "Body Tracker / FormaVision",
    description:
      "Body metrics over time, FormaVision composition pipeline, coaching engine.",
    icon_name: "Dumbbell",
    accent_color: "#2DA5A0",
    sort_order: 5,
    is_active: true,
  },
  gordon: {
    agent_id: "gordon",
    display_name: "Gordon",
    role_label: "Nutrition Computation",
    description:
      "Sole owner of nutrition scoring, targets, and unified meals writes.",
    icon_name: "Utensils",
    accent_color: "#B75E18",
    sort_order: 6,
    is_active: true,
  },
  kelsey: {
    agent_id: "kelsey",
    display_name: "Kelsey",
    role_label: "Compliance Review",
    description:
      "Two-stage disease-claim and claims-language gate on protocol and free-text surfaces.",
    icon_name: "ClipboardCheck",
    accent_color: "#2DA5A0",
    sort_order: 7,
    is_active: true,
  },
  marshall: {
    agent_id: "marshall",
    display_name: "Marshall",
    role_label: "Compliance / Lexicon / Customs",
    description:
      "Rule engine, brand lexicon enforcement, protocol safety gate, and CBP customs case work.",
    icon_name: "ShieldCheck",
    accent_color: "#B75E18",
    sort_order: 8,
    is_active: true,
  },
  lex: {
    agent_id: "lex",
    display_name: "Lex",
    role_label: "Legal / Litigation",
    description:
      "Litigation case management, legal exposure review of claims language, and the protocol safety gate legal lane.",
    icon_name: "Scale",
    accent_color: "#2DA5A0",
    sort_order: 9,
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
