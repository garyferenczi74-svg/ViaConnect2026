'use client';

// Honest 2D-floor chrome. Shown only when 3D truly cannot run (confirmed
// Canvas / error-boundary failure, or a runtime step-down to tier 2d). The
// SegmentalHeatMap SVG is a fallback outline, not a morph; this notice makes
// that obvious so a lean template cannot be mistaken for FormaVision 3D.
//
// Arnold www smoke after #173: opacity 1 but elementFromPoint at the notice
// center hit the Female sex toggle. The banner must not live inside the
// overflow-hidden plate (that clips / loses the hit to the control row).
// When the page host is present it portals above Male/Female + units.

import { useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Box } from 'lucide-react';

export interface FormaVisionFallbackNoticeProps {
  children: ReactNode;
}

export const FORMAVISION_FALLBACK_NOTICE_HOST_TESTID = 'formavision-fallback-notice-host';

// Floor stays in the plate. Banner is in-flow + z-50 so a portal into the
// page host (above the sex-toggle row) wins hit-testing against Female.
export const FORMAVISION_FALLBACK_FLOOR_STACK_CLASS = 'relative z-20';
export const FORMAVISION_FALLBACK_NOTICE_STACK_CLASS =
  'pointer-events-auto relative z-50';

function FallbackNoticeBanner() {
  return (
    <div
      role="status"
      data-testid="formavision-fallback-notice"
      className={`${FORMAVISION_FALLBACK_NOTICE_STACK_CLASS} mx-auto flex w-full max-w-sm items-start gap-2 rounded-xl border border-[#B75F19]/40 bg-[#B75F19]/10 px-3 py-2`}
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
  );
}

export function FormaVisionFallbackNotice({ children }: FormaVisionFallbackNoticeProps) {
  const [host, setHost] = useState<Element | null>(null);

  useLayoutEffect(() => {
    setHost(document.querySelector(`[data-testid="${FORMAVISION_FALLBACK_NOTICE_HOST_TESTID}"]`));
  }, []);

  const banner = <FallbackNoticeBanner />;

  return (
    <div
      data-testid="formavision-fallback-2d"
      className={`${FORMAVISION_FALLBACK_FLOOR_STACK_CLASS} flex h-full w-full flex-col items-center justify-center`}
    >
      {host ? createPortal(banner, host) : banner}
      {children}
    </div>
  );
}
