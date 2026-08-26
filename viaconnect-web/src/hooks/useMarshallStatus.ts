"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { countOpenQueue, rowsFromJefferyMessages, selectOpenQueueFindings } from "@/lib/marshall/openQueue";

export interface MarshallStatus {
  p0Count: number;
  p1Count: number;
  openCount: number;
  lastFindingAt: string | null;
  loading: boolean;
}

export function useMarshallStatus(): MarshallStatus {
  const [status, setStatus] = useState<MarshallStatus>({
    p0Count: 0,
    p1Count: 0,
    openCount: 0,
    lastFindingAt: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("jeffery_messages")
        .select("id, status, severity, title, summary, detail, created_at, source_agent")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      const findings = selectOpenQueueFindings(rowsFromJefferyMessages(data));
      const counts = countOpenQueue(findings);
      setStatus({
        p0Count: counts.p0,
        p1Count: counts.p1,
        openCount: counts.open,
        lastFindingAt: findings[0]?.createdAt ?? null,
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return status;
}
