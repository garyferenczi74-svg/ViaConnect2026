export type ReadyViewerHost = 'phone' | 'desktop' | 'unknown';

export interface ReadyViewerHostSignals {
  userAgent?: string;
  maxTouchPoints?: number;
  pointerCoarse?: boolean;
}

export function detectReadyViewerHost(
  signals: ReadyViewerHostSignals = {},
): ReadyViewerHost {
  const ua =
    signals.userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (!ua && signals.maxTouchPoints === undefined && signals.pointerCoarse === undefined) {
    return 'unknown';
  }

  if (/iP(hone|od)/i.test(ua)) return 'phone';
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return 'phone';
  if (/Windows Phone|IEMobile|BlackBerry|webOS/i.test(ua)) return 'phone';

  const maxTouch =
    signals.maxTouchPoints ??
    (typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0);
  // iPadOS 13+ reports Macintosh; treat multi-touch Mac UA as phone/tablet WebKit.
  if (/Macintosh/i.test(ua) && maxTouch > 1) return 'phone';
  if (/iPad/i.test(ua)) return 'phone';

  if (signals.pointerCoarse === true && /Mobile|Android|iPhone|iPad/i.test(ua)) {
    return 'phone';
  }

  return 'desktop';
}
