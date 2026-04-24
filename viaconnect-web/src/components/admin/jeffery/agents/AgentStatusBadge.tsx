import { STATUS_COLOR, STATUS_LABEL } from "@/lib/agents/status";
import type { AgentStatus } from "@/lib/agents/types";

export interface AgentStatusBadgeProps {
  status: AgentStatus;
  agentName?: string;
  withLabel?: boolean;
  size?: "sm" | "md";
}

export default function AgentStatusBadge({ status, agentName, withLabel = true, size = "md" }: AgentStatusBadgeProps) {
  const color = STATUS_COLOR[status];
  const label = STATUS_LABEL[status];
  const aria = agentName ? `${agentName} status: ${label}` : `status: ${label}`;
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const isHealthy = status === "healthy";
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${textSize}`}
      role="status"
      aria-label={aria}
    >
      <span className="relative inline-flex">
        <span
          className={`${dotSize} rounded-full`}
          style={{ backgroundColor: color }}
          aria-hidden
        />
        {isHealthy && (
          <span
            className={`absolute inset-0 ${dotSize} rounded-full opacity-60 motion-safe:animate-ping`}
            style={{ backgroundColor: color }}
            aria-hidden
          />
        )}
      </span>
      {withLabel && <span className="text-white/70">{label}</span>}
    </span>
  );
}
