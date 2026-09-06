'use client';

// Text-only plate notice. Gary standing lock 2026-09-03: the teal
// anatomical outline is gone from the product path. Never-empty plate is
// navy chamber + live 3D, or this caption. No SVG figure.
// Theme 5: photo-discarded Ready copy is distinct from generic unavailable.
// Never a cyan wireframe.

import {
  READY_UNAVAILABLE_GENERIC,
  readyUnavailableCopy,
  type ReadyUnavailableReason,
} from '@/lib/formavision/twoProtocolCopy';

export type PlateNoticeKind = 'loading' | 'unavailable';

export type PlateNoticePlacement = 'caption' | 'fill';

export type { ReadyUnavailableReason };

export const FORMAVISION_PLATE_LOADING_NOTICE =
  'Loading 3D avatar from your scan.';

export const FORMAVISION_PLATE_UNAVAILABLE_NOTICE = READY_UNAVAILABLE_GENERIC;

export const FORMAVISION_PLATE_NOTICE_TESTID = 'formavision-plate-notice';

const CAPTION_NOTICE_CLASS =
  'pointer-events-none absolute bottom-2 left-1/2 z-10 w-[min(92%,18rem)] -translate-x-1/2 text-center text-[10px] leading-relaxed text-white/55';

const FILL_NOTICE_CLASS =
  'pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6 text-center text-sm leading-relaxed text-white/80 sm:text-base';

export interface FormaVisionPlateNoticeProps {
  kind: PlateNoticeKind;
  className?: string;
  placement?: PlateNoticePlacement;
  unavailableReason?: ReadyUnavailableReason;
}

export function FormaVisionPlateNotice({
  kind,
  className,
  placement = 'caption',
  unavailableReason = 'generic',
}: FormaVisionPlateNoticeProps) {
  const copy =
    kind === 'unavailable'
      ? readyUnavailableCopy(unavailableReason)
      : FORMAVISION_PLATE_LOADING_NOTICE;

  return (
    <p
      data-testid={FORMAVISION_PLATE_NOTICE_TESTID}
      data-notice={kind}
      data-unavailable-reason={kind === 'unavailable' ? unavailableReason : undefined}
      data-placement={placement}
      role="status"
      className={
        className ?? (placement === 'fill' ? FILL_NOTICE_CLASS : CAPTION_NOTICE_CLASS)
      }
    >
      {copy}
    </p>
  );
}
