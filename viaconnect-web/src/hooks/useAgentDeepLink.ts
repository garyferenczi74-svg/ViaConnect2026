"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AGENT_REGISTRY, isKnownAgentId } from "@/lib/agents/registry";
import type { AgentId } from "@/lib/agents/types";

function agentFromLocationSearch(): AgentId | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("agent");
  if (raw && isKnownAgentId(raw)) return raw;
  return null;
}

// Sync ?agent= after mount. Do not call useSearchParams here: Next 16
// requires a Suspense boundary for that hook, and a throw on Agents tab
// mount is caught by AdminPanelErrorBoundary as "Agents failed to load".
export function useAgentDeepLink(defaultAgent: AgentId): {
  activeAgent: AgentId;
  setActiveAgent: (a: AgentId) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const [activeAgent, setActiveAgentState] = useState<AgentId>(defaultAgent);

  useEffect(() => {
    const fromUrl = agentFromLocationSearch();
    if (fromUrl && fromUrl !== activeAgent) {
      setActiveAgentState(fromUrl);
    }
    // First paint uses the ACC default seat. URL sync is post-mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveAgent = useCallback(
    (a: AgentId) => {
      if (!AGENT_REGISTRY[a]) return;
      setActiveAgentState(a);
      const params = new URLSearchParams(
        typeof window === "undefined" ? "" : window.location.search,
      );
      params.set("agent", a);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname],
  );

  return { activeAgent, setActiveAgent };
}
