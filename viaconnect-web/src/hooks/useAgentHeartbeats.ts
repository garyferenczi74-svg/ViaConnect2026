"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgentHeartbeat } from "@/lib/agents/types";
import { AGENT_IDS } from "@/lib/agents/types";
import { mapUltrathinkRegistry, type UltrathinkRegistryRow } from "@/lib/agents/activity-tracker";

const DEFAULT_INTERVAL_MS = 5000;

export function useAgentHeartbeats(
  initial: AgentHeartbeat[] = [],
  intervalMs: number = DEFAULT_INTERVAL_MS,
): AgentHeartbeat[] {
  const [heartbeats, setHeartbeats] = useState<AgentHeartbeat[]>(initial);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("ultrathink_agent_registry")
        .select("agent_name, display_name, health_status, last_heartbeat_at, consecutive_misses, is_active")
        .in("agent_name", AGENT_IDS);
      if (cancelled) return;
      const mapped = ((data ?? []) as UltrathinkRegistryRow[])
        .map(mapUltrathinkRegistry)
        .filter((h): h is AgentHeartbeat => h !== null);
      setHeartbeats(mapped);
    };

    load();
    const id = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return heartbeats;
}
