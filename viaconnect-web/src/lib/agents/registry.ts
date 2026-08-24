/**
 * Static agent registry for the admin Agents panel (Brief 23 Grok roster).
 * Seventeen Command Center seats. Kelsey is retired (alias to Lex).
 * Gordon and advisor seats are not Command Center agents.
 * Thanos owns Peptide Education; Elysium owns My Genetics.
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
  picasso: {
    agent_id: "picasso",
    display_name: "Picasso",
    role_label: "Grok roster",
    description:
      "Grok roster seat. No Command Center ops row yet. Idle until a real heartbeat or task exists.",
    icon_name: "Palette",
    accent_color: "#B75E18",
    sort_order: 2,
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
    sort_order: 3,
    is_active: true,
  },
  conan: {
    agent_id: "conan",
    display_name: "Conan",
    role_label: "Grok roster",
    description:
      "Grok roster seat. No Command Center ops row yet. Idle until a real heartbeat or task exists.",
    icon_name: "ScrollText",
    accent_color: "#B75E18",
    sort_order: 4,
    is_active: true,
  },
  hermes: {
    agent_id: "hermes",
    display_name: "Hermes",
    role_label: "Peptide Scout",
    description:
      "Jeffery research lane scout for peptide education. Reports to Thanos. Weekday 8am Edmonton cadence.",
    icon_name: "Send",
    accent_color: "#2DA5A0",
    sort_order: 5,
    is_active: true,
  },
  gene: {
    agent_id: "gene",
    display_name: "Gene",
    role_label: "Grok roster",
    description:
      "Grok roster seat. No Command Center ops row yet. Idle until a real heartbeat or task exists.",
    icon_name: "CircleDot",
    accent_color: "#B75E18",
    sort_order: 6,
    is_active: true,
  },
  elysium: {
    agent_id: "elysium",
    display_name: "Elysium",
    role_label: "My Genetics Agent",
    description:
      "Owns My Genetics: GENEX360 interpretations, upload mapping, 1000 Genomes population context, genetics education with Hannah.",
    icon_name: "Dna",
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
  martha: {
    agent_id: "martha",
    display_name: "Martha",
    role_label: "Grok roster",
    description:
      "Grok roster seat. No Command Center ops row yet. Idle until a real heartbeat or task exists.",
    icon_name: "Heart",
    accent_color: "#2DA5A0",
    sort_order: 9,
    is_active: true,
  },
  hannah: {
    agent_id: "hannah",
    display_name: "HannahAI",
    role_label: "AI Wellness Assistant",
    description:
      "Assistant surfaces, daily insight compilation, and user-facing wellness copy.",
    icon_name: "MessageCircle",
    accent_color: "#B75E18",
    sort_order: 10,
    is_active: true,
  },
  thanos: {
    agent_id: "thanos",
    display_name: "Thanos",
    role_label: "Peptide Education Agent",
    description:
      "Owns Peptide Education end to end: allowlist research freshness, educational catalog, practitioner protocol guidance with Hannah. Never commercial product paths.",
    icon_name: "FlaskConical",
    accent_color: "#2DA5A0",
    sort_order: 11,
    is_active: true,
  },
  elizabeth: {
    agent_id: "elizabeth",
    display_name: "Elizabeth",
    role_label: "Hannah Research Assistant",
    description:
      "Helps Hannah with educational research freshness and gap fill. Reports to Hannah. No consumer dosing or purchase guidance.",
    icon_name: "BookOpen",
    accent_color: "#B75E18",
    sort_order: 12,
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
    sort_order: 13,
    is_active: true,
  },
  sherlock: {
    agent_id: "sherlock",
    display_name: "Sherlock",
    role_label: "Social Media Analytics",
    description:
      "Analyzes and curates gated Hound Dog staging and research feeds into finished outputs.",
    icon_name: "Search",
    accent_color: "#B75E18",
    sort_order: 14,
    is_active: true,
  },
  watson: {
    agent_id: "watson",
    display_name: "Watson",
    role_label: "Grok roster",
    description:
      "Grok roster seat. No Command Center ops row yet. Idle until a real heartbeat or task exists.",
    icon_name: "FileText",
    accent_color: "#2DA5A0",
    sort_order: 15,
    is_active: true,
  },
  arnold: {
    agent_id: "arnold",
    display_name: "Arnold",
    role_label: "My Biology Agent",
    description:
      "My Biology hub: FormaVision body composition, vitals trends, wearables-derived biology metrics. Genetics context via Elysium digest only.",
    icon_name: "Dumbbell",
    accent_color: "#B75E18",
    sort_order: 16,
    is_active: true,
  },
  hounddog: {
    agent_id: "hounddog",
    display_name: "Hound Dog",
    role_label: "Web Ingest",
    description:
      "Scrapes and ingests clinical data and relevant social content into gated staging.",
    icon_name: "Radar",
    accent_color: "#2DA5A0",
    sort_order: 17,
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
