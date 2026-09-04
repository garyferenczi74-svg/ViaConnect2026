'use client';

// Text-only plate notice. Gary standing lock 2026-09-03: the teal
// anatomical outline is gone from the product path. Never-empty plate is
// navy chamber + live 3D, or this caption. No SVG figure.

export type PlateNoticeKind = 'loading' | 'unavailable';

export const FORMAVISION_PLATE_LOADING_NOTICE =
  'Loading 3D avatar from your scan.';

export const FORMAVISION_PLATE_UNAVAILABLE_NOTICE = '3D avatar unavailable.';

export const FORMAVISION_PLATE_NOTICE_TESTID = 'formavision-plate-notice';

export interface FormaVisionPlateNoticeProps {
  kind: PlateNoticeKind;
  className?: string;
}

export function FormaVisionPlateNotice({
  kind,
  className,
}: FormaVisionPlateNoticeProps) {
  const copy =
    kind === 'unavailable'
      ? FORMAVISION_PLATE_UNAVAILABLE_NOTICE
      : FORMAVISION_PLATE_LOADING_NOTICE;

  return (
    <p
      data-testid={FORMAVISION_PLATE_NOTICE_TESTID}
      data-notice={kind}
      role="status"
      className={
        className ??
        'pointer-events-none absolute bottom-2 left-1/2 z-10 w-[min(92%,18rem)] -translate-x-1/2 text-center text-[10px] leading-relaxed text-white/55'
      }
    >
      {copy}
    </p>
  );
}
