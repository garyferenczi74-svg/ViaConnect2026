/**
 * Static agent registry for the admin Agents panel (Prompt #214a).
 * Eleven agents. Kelsey is retired (alias to Lex for historical events only).
 */

import type { AgentId, AgentRegistryRow } from "./types";

export const AGENT_REGISTRY: Readonly<Record<AgentId, AgentRegistryRow>> = {
  jeffery: {
    agent_id: "jeffery",
    display_name: "Jeffery",
    role_label: "Main Manager",
    description:
      "The brain: orchestration, scheduling, dispatch, Admin Command Center, and the daily synchronism chain.",
    icon_name: "Brain",
    accent_color: "#2DA5A0",
    sort_order: 1,
    is_active: true,
  },
  hannah: {
    agent_id: "hannah",
    display_name: "Hannah",
    role_label: "AI Wellness Assistant",
    description:
      "Assistant surfaces, daily insight compilation, and user-facing wellness copy.",
    icon_name: "MessageCircle",
    accent_color: "#B75E18",
    sort_order: 2,
    is_active: true,
  },
  gordon: {
    agent_id: "gordon",
    display_name: "Gordon",
    role_label: "My Nutrition Agent",
    description:
      "Sole nutrition computation owner: unified meals, targets, analyze-text and log-meal scoring.",
    icon_name: "Utensils",
    accent_color: "#2DA5A0",
    sort_order: 3,
    is_active: true,
  },
  arnold: {
    agent_id: "arnold",
    display_name: "Arnold",
    role_label: "My Biology Agent",
    description:
      "My Biology hub: FormaVision body composition, vitals trends, wearables-derived biology metrics.",
    icon_name: "Dumbbell",
    accent_color: "#B75E18",
    sort_order: 4,
    is_active: true,
  },
  michelangelo: {
    agent_id: "michelangelo",
    display_name: "Michelangelo",
    role_label: "Senior Developer",
    description:
      "Code quality, TDD/OBRA discipline, CI regression suites, technical standards.",
    icon_name: "Code2",
    accent_color: "#2DA5A0",
    sort_order: 5,
    is_active: true,
  },
  hounddog: {
    agent_id: "hounddog",
    display_name: "Hound Dog",
    role_label: "Web Ingest",
    description:
      "Scrapes and ingests clinical data and relevant social content into gated staging.",
    icon_name: "Radar",
    accent_color: "#B75E18",
    sort_order: 6,
    is_active: true,
  },
  sherlock: {
    agent_id: "sherlock",
    display_name: "Sherlock",
    role_label: "Social Media Analytics",
    description:
      "Analyzes and curates gated Hound Dog staging and research feeds into finished outputs.",
    icon_name: "Search",
    accent_color: "#2DA5A0",
    sort_order: 7,
    is_active: true,
  },
  marshall: {
    agent_id: "marshall",
    display_name: "Marshall",
    role_label: "Compliance Officer",
    description:
      "Content and product compliance, lexicon enforcement, Stage 1 claims detector, customs case work.",
    icon_name: "ShieldCheck",
    accent_color: "#B75E18",
    sort_order: 8,
    is_active: true,
  },
  lex: {
    agent_id: "lex",
    display_name: "Lex",
    role_label: "Appellate Litigator / Litigation",
    description:
      "Legal routes, terms, privacy, litigation case management, and former Kelsey Stage 2 legal review.",
    icon_name: "Scale",
    accent_color: "#2DA5A0",
    sort_order: 9,
    is_active: true,
  },
  security_advisor: {
    agent_id: "security_advisor",
    display_name: "Security Advisor",
    role_label: "Supabase Security",
    description:
      "Daily security advisor sweep: RLS, policies, search_path, exposure; auto-fix vs report tiers.",
    icon_name: "ShieldAlert",
    accent_color: "#B75E18",
    sort_order: 10,
    is_active: true,
  },
  performance_advisor: {
    agent_id: "performance_advisor",
    display_name: "Performance Advisor",
    role_label: "Supabase Performance",
    description:
      "Daily performance advisor sweep: indexes, FK coverage, slow queries; auto-fix vs report tiers.",
    icon_name: "Gauge",
    accent_color: "#2DA5A0",
    sort_order: 11,
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
