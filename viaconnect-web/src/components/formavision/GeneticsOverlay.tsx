'use client';

// Prompt 210b P4-T1: GeneticsOverlay - honest-disabled genetics layer on the
// Body Composition avatar surface.
//
// HONESTY CONTRACT: Genetics has no body-region tendency model in this codebase.
// This component ships TWO honest states only. It NEVER renders a fabricated
// region band, segment tint, or body-region coloring from genetics data:
//
//   GENETICS PRESENT (real non-sample variants found):
//     A calm, body-positive invitation. "Your Genetics, Your Protocol."
//     Framed as tendency-not-destiny. No band, no tint, no fabricated region.
//
//   GENETICS ABSENT (no real variants or hook error -> EMPTY_DATA):
//     An honest CTA to the existing /genetics/upload route.
//
// Presence source: useGeneticsVariants (already fail-open; returns EMPTY_DATA on
// any error, never throws). We read the shared hook once - no second fetch.
// is_sample=true rows are seeded on a GeneX360 purchase and are NOT the member's
// actual genetics. Only is_sample=false rows count toward presence.
//
// Standing rules honored: no em-dashes, no en-dashes, no emojis. Lucide icons
// strokeWidth 1.5. Design tokens only. Responsive desktop+mobile from first line.
// 44px touch targets. Fail-open.

import Link from 'next/link';
import { Info, ArrowRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useGeneticsVariants } from '@/components/genetics/hub/useGeneticsVariants';
import type { GeneticsVariantsData } from '@/components/genetics/hub/useGeneticsVariants';
import { resolveGeneticsUploadState } from '@/lib/genetics/geneticsUploadState';

// ---------------------------------------------------------------------------
// Presence gate (pure, exported for direct testing).
//
// Iterates the variant panels and returns 'present' as soon as any real
// (is_sample=false) variant is found. Falls back to 'absent'.
// Empty data or sample-only data both return 'absent' - fail-open at the gate.
// ---------------------------------------------------------------------------
export function computeGeneticsPresence(data: GeneticsVariantsData): 'present' | 'absent' {
  if (data.geneticsUploaded === true || data.geneticsUploadState === 'uploaded') {
    return 'present';
  }
  const rows = Object.values(data.variantsByPanel).flatMap((variants) => variants ?? []);
  return resolveGeneticsUploadState({ variantRows: rows }) === 'uploaded'
    ? 'present'
    : 'absent';
}

// ---------------------------------------------------------------------------
// Pure renderer (exported for testing with renderToStaticMarkup).
// Accepts presence state as a prop; no hooks, no side effects.
// Does NOT produce any region band, segment tint, or body-region coloring.
// ---------------------------------------------------------------------------
export interface GeneticsOverlayPanelProps {
  presence: 'present' | 'absent' | 'loading';
}

export function GeneticsOverlayPanel({ presence }: GeneticsOverlayPanelProps) {
  if (presence === 'loading') {
    return (
      <div
        data-testid="genetics-overlay-loading"
        aria-busy="true"
        aria-label="Loading genetics context"
        className="h-14 rounded-xl bg-white/[0.04] motion-safe:animate-pulse"
      />
    );
  }

  if (presence === 'present') {
    // Invitation state: the member has real (non-sample) genetic variants.
    // Body-positive, tendency-not-destiny framing. No region band or tint.
    return (
      <div
        data-testid="genetics-overlay-present"
        className="rounded-2xl border border-[#2DA5A0]/25 bg-[#1E3054]/40 p-4 sm:p-5 backdrop-blur-sm"
      >
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-white">Your Genetics, Your Protocol</h3>
          <p className="text-xs leading-relaxed text-white/60">
            Your genetic profile is on file and will help personalize your wellness
            protocol as new insights become available. Tendency, not destiny.
          </p>
        </div>
        {/* AI-estimate disclaimer block - mirrors the BodyScanResults Info pattern */}
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/50">
          <Info size={14} strokeWidth={1.5} className="mt-0.5 flex-none text-white/40" />
          <p>
            Genetic insights, when available, reflect AI-derived tendency estimates.
            For informational context only. Not a clinical finding.
          </p>
        </div>
      </div>
    );
  }

  // Absent state: no real variants yet. Honest CTA to /genetics/upload.
  return (
    <div
      data-testid="genetics-overlay-absent"
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 sm:p-5 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-sm font-semibold text-white">Explore Your Genetic Tendencies</h3>
          <p className="text-xs leading-relaxed text-white/55">
            A GENEX360 panel can offer personalized genetic context as part of your
            wellness protocol. Tendencies only, not a clinical result.
          </p>
        </div>
        <Link
          href="/genetics/upload"
          data-testid="genetics-overlay-cta"
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 self-start rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-4 py-2.5 text-sm font-medium text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/20 sm:self-center"
        >
          Get Your GENEX360 Panel
          <ArrowRight size={14} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client wrapper (surface mount point). Calls the shared hook once.
// Fail-open: isLoading shows the loading placeholder; any hook error already
// returns EMPTY_DATA so computeGeneticsPresence always receives a valid payload.
// ---------------------------------------------------------------------------

export interface GeneticsOverlayProps {
  // P8-T1b: telemetry seam. Called once when the overlay first transitions out
  // of loading (formavision.genetics_overlay_viewed). The state argument is
  // 'present' or 'absent' -- coarse, non-identifying. Absent means no telemetry.
  onFirstView?: (state: 'present' | 'absent') => void;
}

export function GeneticsOverlay({ onFirstView }: GeneticsOverlayProps = {}) {
  const { data, isLoading } = useGeneticsVariants();
  const presence: 'present' | 'absent' | 'loading' = isLoading
    ? 'loading'
    : computeGeneticsPresence(data);

  // P8-T1b: fire once when presence resolves from loading.
  const firstViewFiredRef = useRef(false);
  useEffect(() => {
    if (presence !== 'loading' && !firstViewFiredRef.current) {
      firstViewFiredRef.current = true;
      onFirstView?.(presence);
    }
  }, [presence, onFirstView]);

  return <GeneticsOverlayPanel presence={presence} />;
}
