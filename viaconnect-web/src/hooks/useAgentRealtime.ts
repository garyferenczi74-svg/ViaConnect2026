"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgentActivityEvent, AgentCurrentTask, AgentId } from "@/lib/agents/types";
import { mapUltrathinkEvent, type UltrathinkEventRow } from "@/lib/agents/activity-tracker";

interface UseAgentRealtimeOptions {
  agentId: AgentId;
  initialEvents?: AgentActivityEvent[];
  initialTasks?: AgentCurrentTask[];
  eventLimit?: number;
}

interface UseAgentRealtimeResult {
  events: AgentActivityEvent[];
  tasks: AgentCurrentTask[];
  connected: boolean;
  reconnecting: boolean;
}

export function useAgentRealtime(opts: UseAgentRealtimeOptions): UseAgentRealtimeResult {
  const { agentId, initialEvents = [], initialTasks = [], eventLimit = 100 } = opts;
  const [events, setEvents] = useState<AgentActivityEvent[]>(initialEvents);
  const [tasks, setTasks] = useState<AgentCurrentTask[]>(initialTasks);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    // Reset per-agent state when the tab changes.
    setEvents(initialEvents);
    setTasks(initialTasks);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;

    const channel = supabase
      .channel(`agents-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ultrathink_agent_events",
          filter: `agent_name=eq.${agentId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as unknown as UltrathinkEventRow;
          const mapped = mapUltrathinkEvent(row);
          if (!mapped) return;
          setEvents((prev) => [mapped, ...prev].slice(0, eventLimit));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeffery_agent_panel_tasks",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const neu = payload.new as unknown as AgentCurrentTask | undefined;
          const old = payload.old as { id?: string } | undefined;
          setTasks((prev) => {
            if (payload.eventType === "DELETE" && old?.id) {
              return prev.filter((t) => t.id !== old.id);
            }
            if (!neu) return prev;
            const terminal = ["completed", "cancelled", "failed"];
            if (terminal.includes(neu.task_status)) {
              return prev.filter((t) => t.id !== neu.id);
            }
            const existing = prev.findIndex((t) => t.id === neu.id);
            if (existing >= 0) {
              const copy = prev.slice();
              copy[existing] = neu;
              return copy;
            }
            return [neu, ...prev];
          });
        },
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          setReconnecting(false);
        } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
          setConnected(false);
          setReconnecting(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, eventLimit]);

  return { events, tasks, connected, reconnecting };
}
