"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [p0, p1, open, last] = await Promise.all([
        supabase.from("compliance_findings").select("id", { count: "exact", head: true }).eq("severity", "P0").gte("created_at", since),
        supabase.from("compliance_findings").select("id", { count: "exact", head: true }).eq("severity", "P1").gte("created_at", since),
        supabase.from("compliance_findings").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("compliance_findings").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      setStatus({
        p0Count: p0.count ?? 0,
        p1Count: p1.count ?? 0,
        openCount: open.count ?? 0,
        lastFindingAt: (last.data as { created_at: string } | null)?.created_at ?? null,
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return status;
}
