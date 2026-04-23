"use client";

// Prompt #118 — Arnold region-blurb fetch with Kelsey-gated response.
// Caches per (regionId, metric-bucket) in-memory for the session.

import { useEffect, useState } from "react";
import type { ArnoldBlurbResponse, BodyMode, RegionId } from "../BodyGraphic.types";

interface UseArnoldBlurbInput {
  regionId: RegionId | null;
  mode: BodyMode;
  metricValue?: number;
  metricUnit?: string;
  trend?: "up" | "down" | "stable" | "unknown";
  delta?: number;
}

const cache = new Map<string, ArnoldBlurbResponse>();

function bucketKey(input: UseArnoldBlurbInput): string {
  const valueBucket = typeof input.metricValue === "number" ? Math.floor(input.metricValue / 5) * 5 : "_";
  return `${input.regionId}|${input.mode}|${valueBucket}|${input.trend ?? "_"}`;
}

export function useArnoldBlurb(input: UseArnoldBlurbInput) {
  const [data, setData] = useState<ArnoldBlurbResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.regionId) { setData(null); setError(null); setLoading(false); return; }
    const key = bucketKey(input);
    if (cache.has(key)) { setData(cache.get(key) ?? null); setError(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const r = await fetch("/api/arnold/region-blurb", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            regionId: input.regionId,
            mode: input.mode,
            metric: {
              value: input.metricValue,
              unit: input.metricUnit,
              trend: input.trend,
              delta: input.delta,
            },
          }),
        });
        const j = (await r.json()) as ArnoldBlurbResponse & { ok?: boolean; error?: string };
        if (cancelled) return;
        if (!r.ok || j.error) { setError(j.error ?? "arnold_unavailable"); setLoading(false); return; }
        cache.set(key, j);
        setData(j);
        setLoading(false);
      } catch (e) {
        if (!cancelled) { setError(String(e)); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [input.regionId, input.mode, input.metricValue, input.metricUnit, input.trend, input.delta]);

  return { data, loading, error };
}
