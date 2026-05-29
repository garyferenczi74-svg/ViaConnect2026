'use client';

// Prompt #170 Phase 1l: reference-object guidance overlay.
//
// Phase 1 does not detect a reference object in real time; this is a static
// guidance badge anchored to the top right of the framing surface. The badge
// suggests the user includes a credit card or fork for portion accuracy.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { Info } from 'lucide-react';

export function ReferenceObjectOverlay() {
  return (
    <div
      role="note"
      aria-label="Place a reference object near the food for portion accuracy"
      className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#1A2744]/85 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur-md"
    >
      <Info className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
      <span>Place a credit card or fork nearby for best accuracy.</span>
    </div>
  );
}
