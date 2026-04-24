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

export interface AgentPanelProps {
  registry: AgentRegistryRow;
  heartbeat: AgentHeartbeat | null;
  tasks: AgentCurrentTask[];
  events: AgentActivityEvent[];
}

export const AGENT_PANELS: Record<AgentId, ComponentType<AgentPanelProps>> = {
  jeffery:      JefferyPanel,
  hannah:       HannahPanel,
  michelangelo: MichelangeloPanel,
  sherlock:     SherlockPanel,
  arnold:       ArnoldPanel,
};
