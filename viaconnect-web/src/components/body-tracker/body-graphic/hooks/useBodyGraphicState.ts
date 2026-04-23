"use client";

// Prompt #118 — Body Graphic persisted preferences + prefers-reduced-motion.

import { useCallback, useEffect, useState } from "react";
import type { BodyGraphicPreferencesRow, BodyView, Gender, GraphicSize } from "../BodyGraphic.types";

export function useBodyGraphicState() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return { prefersReducedMotion };
}

/**
 * Read the current user's Body Graphic preferences. Returns defaults while
 * loading and on first-run (no row yet).
 */
export function useBodyGraphicPreferences() {
  const [prefs, setPrefs] = useState<BodyGraphicPreferencesRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/body-graphic/preferences");
        if (!r.ok) { if (!cancelled) setLoading(false); return; }
        const j = await r.json();
        if (cancelled) return;
        if (j.ok && j.preferences) setPrefs(j.preferences as BodyGraphicPreferencesRow);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const patch = useCallback(async (changes: Partial<BodyGraphicPreferencesRow>) => {
    setPrefs((prev) => (prev ? { ...prev, ...changes } : prev));
    try {
      await fetch("/api/body-graphic/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(changes),
      });
    } catch {
      // non-blocking
    }
  }, []);

  const setGender = useCallback((g: Gender) => patch({ default_gender: g }), [patch]);
  const setView   = useCallback((v: BodyView) => patch({ default_view: v }), [patch]);
  const setShowLabels = useCallback((show: boolean) => patch({ show_region_labels: show }), [patch]);
  const setShowDetail = useCallback((show: boolean) => patch({ show_anatomical_detail: show }), [patch]);
  const setSize       = useCallback((s: GraphicSize) => patch({ preferred_size: s }), [patch]);

  return { prefs, loading, setGender, setView, setShowLabels, setShowDetail, setSize };
}
