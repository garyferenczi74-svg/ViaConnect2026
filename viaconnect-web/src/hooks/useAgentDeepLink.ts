"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AGENT_REGISTRY, isKnownAgentId } from "@/lib/agents/registry";
import type { AgentId } from "@/lib/agents/types";

// Sync ?agent= search param with active tab. On mount, reads the URL to
// pick the initial tab; on change, writes back via router.replace without a
// navigation flash.
export function useAgentDeepLink(defaultAgent: AgentId): {
  activeAgent: AgentId;
  setActiveAgent: (a: AgentId) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initial = (() => {
    const raw = searchParams.get("agent");
    if (raw && isKnownAgentId(raw)) return raw;
    return defaultAgent;
  })();

  const [activeAgent, setActiveAgentState] = useState<AgentId>(initial);

  useEffect(() => {
    const raw = searchParams.get("agent");
    if (raw && isKnownAgentId(raw) && raw !== activeAgent) {
      setActiveAgentState(raw);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setActiveAgent = useCallback(
    (a: AgentId) => {
      if (!AGENT_REGISTRY[a]) return;
      setActiveAgentState(a);
      const params = new URLSearchParams(searchParams.toString());
      params.set("agent", a);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { activeAgent, setActiveAgent };
}
