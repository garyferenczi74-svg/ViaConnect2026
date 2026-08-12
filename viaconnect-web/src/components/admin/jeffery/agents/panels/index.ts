import type { ComponentType } from "react";
import type {
  AgentActivityEvent,
  AgentCurrentTask,
  AgentHeartbeat,
  AgentId,
  AgentRegistryRow,
} from "@/lib/agents/types";
import JefferyPanel from "./JefferyPanel";
import HannahPanel from "./HannahPanel";
import MichelangeloPanel from "./MichelangeloPanel";
import SherlockPanel from "./SherlockPanel";
import ArnoldPanel from "./ArnoldPanel";
import GordonPanel from "./GordonPanel";
import HounddogPanel from "./HounddogPanel";
import MarshallPanel from "./MarshallPanel";
import LexPanel from "./LexPanel";
import SecurityAdvisorPanel from "./SecurityAdvisorPanel";
import PerformanceAdvisorPanel from "./PerformanceAdvisorPanel";

export interface AgentPanelProps {
  registry: AgentRegistryRow;
  heartbeat: AgentHeartbeat | null;
  tasks: AgentCurrentTask[];
  events: AgentActivityEvent[];
}

export const AGENT_PANELS: Record<AgentId, ComponentType<AgentPanelProps>> = {
  jeffery: JefferyPanel,
  hannah: HannahPanel,
  gordon: GordonPanel,
  arnold: ArnoldPanel,
  michelangelo: MichelangeloPanel,
  hounddog: HounddogPanel,
  sherlock: SherlockPanel,
  marshall: MarshallPanel,
  lex: LexPanel,
  security_advisor: SecurityAdvisorPanel,
  performance_advisor: PerformanceAdvisorPanel,
};
