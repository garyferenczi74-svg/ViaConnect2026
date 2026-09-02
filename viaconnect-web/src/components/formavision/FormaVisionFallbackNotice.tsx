'use client';

// Honest 2D-floor chrome. Shown only when 3D truly cannot run (confirmed
// Canvas / error-boundary failure, or a runtime step-down to tier 2d). The
// SegmentalHeatMap SVG is a fallback outline, not a morph; this notice makes
// that obvious so a lean template cannot be mistaken for FormaVision 3D.

import { Box } from 'lucide-react';

export interface FormaVisionFallbackNoticeProps {
  children: React.ReactNode;
}

export function FormaVisionFallbackNotice({ children }: FormaVisionFallbackNoticeProps) {
  return (
    <div
      data-testid="formavision-fallback-2d"
      className="relative flex h-full w-full flex-col items-center justify-center"
    >
      <div
        role="status"
        data-testid="formavision-fallback-notice"
        className="mb-3 flex max-w-sm items-start gap-2 rounded-xl border border-[#B75F19]/40 bg-[#B75F19]/10 px-3 py-2"
      >
        <Box
          className="mt-0.5 h-4 w-4 shrink-0 text-[#B75F19]"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div>
          <p className="text-xs font-medium text-white/85">3D avatar unavailable</p>
          <p className="text-[10px] leading-relaxed text-white/50">
            This device could not start WebGL. The outline below is a 2D fallback, not a body
            morph.
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
