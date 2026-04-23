"use client";

// Prompt #113 — DSHEA disclaimer with MutationObserver re-mount guard.
// Must render on every US surface that displays an S/F claim. Cannot be
// hidden via CSS (display:none, visibility:hidden, opacity:0, height:0).
// Attempts to suppress are logged to regulatory_disclaimer_events.

import { useEffect, useRef } from "react";

// Sherlock review: 21 CFR 101.93(d) canonical plural form. The singular
// "This statement has not been evaluated ..." is permitted only when a
// single claim is displayed; multi-claim surfaces require the plural.
const DISCLAIMER_TEXT =
  "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.";

export interface DSHEADisclaimerProps {
  surface: string;
  surfaceId?: string;
  jurisdiction?: "US" | "CA";
}

async function logImpression(params: DSHEADisclaimerProps & { displayed: boolean; suppression_attempt?: boolean }) {
  try {
    await fetch("/api/compliance/disclaimer/impression", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        surface: params.surface,
        surface_id: params.surfaceId,
        jurisdiction: params.jurisdiction ?? "US",
        displayed: params.displayed,
        suppression_attempt: params.suppression_attempt ?? false,
      }),
    });
  } catch {
    // impression telemetry is best-effort
  }
}

function isSuppressed(el: HTMLElement): boolean {
  const s = getComputedStyle(el);
  if (s.display === "none" || s.visibility === "hidden") return true;
  if (Number(s.opacity) === 0) return true;
  if (el.offsetHeight === 0) return true;
  return false;
}

export function DSHEADisclaimer({ surface, surfaceId, jurisdiction = "US" }: DSHEADisclaimerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastImpressionAt = useRef<number>(0);

  useEffect(() => {
    if (jurisdiction !== "US") return; // CA has no equivalent disclaimer per spec §5.1
    const el = ref.current;
    if (!el) return;

    const now = Date.now();
    if (now - lastImpressionAt.current > 60_000) {
      lastImpressionAt.current = now;
      logImpression({ surface, surfaceId, jurisdiction, displayed: true });
    }

    const observer = new MutationObserver(() => {
      if (isSuppressed(el)) {
        logImpression({ surface, surfaceId, jurisdiction, displayed: false, suppression_attempt: true });
        // Remount / restore visible styles.
        el.style.cssText = "display:block !important; visibility:visible !important; opacity:1 !important; height:auto !important;";
      }
    });
    observer.observe(el, { attributes: true, attributeFilter: ["style", "class"], subtree: false });

    const intervalCheck = setInterval(() => {
      if (isSuppressed(el)) {
        logImpression({ surface, surfaceId, jurisdiction, displayed: false, suppression_attempt: true });
        el.style.cssText = "display:block !important; visibility:visible !important; opacity:1 !important; height:auto !important;";
      }
    }, 2000);

    return () => {
      observer.disconnect();
      clearInterval(intervalCheck);
    };
  }, [surface, surfaceId, jurisdiction]);

  if (jurisdiction !== "US") return null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label="FDA DSHEA disclaimer"
      className="mt-4 border-t border-slate-700 bg-[#1A2744] px-4 py-3 text-xs text-slate-400 sm:text-sm"
      style={{ contain: "layout" }}
    >
      {DISCLAIMER_TEXT}
    </div>
  );
}
