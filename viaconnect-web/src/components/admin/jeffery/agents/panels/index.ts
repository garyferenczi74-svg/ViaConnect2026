import type { ComponentType } from "react";
import type {
  AgentActivityEvent,
  AgentCurrentTask,
  AgentHeartbeat,
  AgentId,
  AgentRegistryRow,
} from "@/lib/agents/types";
import JefferyPanel from "./JefferyPanel";
import IdleRosterPanel from "./IdleRosterPanel";
import MichelangeloPanel from "./MichelangeloPanel";
import HermesPanel from "./HermesPanel";
import ElysiumPanel from "./ElysiumPanel";
import MarshallPanel from "./MarshallPanel";
import HannahPanel from "./HannahPanel";
import ThanosPanel from "./ThanosPanel";
import ElizabethPanel from "./ElizabethPanel";
import LexPanel from "./LexPanel";
import SherlockPanel from "./SherlockPanel";
import ArnoldPanel from "./ArnoldPanel";
import HounddogPanel from "./HounddogPanel";

export interface AgentPanelProps {
  registry: AgentRegistryRow;
  heartbeat: AgentHeartbeat | null;
  tasks: AgentCurrentTask[];
  events: AgentActivityEvent[];
}

export const AGENT_PANELS: Record<AgentId, ComponentType<AgentPanelProps>> = {
  jeffery: JefferyPanel,
  picasso: IdleRosterPanel,
  michelangelo: MichelangeloPanel,
  conan: IdleRosterPanel,
  hermes: HermesPanel,
  gene: IdleRosterPanel,
  elysium: ElysiumPanel,
  marshall: MarshallPanel,
  martha: IdleRosterPanel,
  hannah: HannahPanel,
  thanos: ThanosPanel,
  elizabeth: ElizabethPanel,
  lex: LexPanel,
  sherlock: SherlockPanel,
  watson: IdleRosterPanel,
  arnold: ArnoldPanel,
  hounddog: HounddogPanel,
};
