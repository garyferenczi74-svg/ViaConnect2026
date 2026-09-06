export type ReadyViewerHost = 'phone' | 'desktop' | 'unknown';

export interface ReadyViewerHostSignals {
  userAgent?: string;
  maxTouchPoints?: number;
  pointerCoarse?: boolean;
}

// Jeffery scope lock: Safari phone spike only (iPhone / iPad / iPadOS WKWebView).
// Android and other phones stay on the existing desktop/R3F path.
export function isSafariPhoneUserAgent(
  userAgent: string,
  maxTouchPoints = 0,
): boolean {
  if (/iP(hone|od)/i.test(userAgent)) return true;
  if (/iPad/i.test(userAgent)) return true;
  // iPadOS 13+ reports Macintosh; multi-touch Mac UA is Safari tablet WebKit.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return true;
  return false;
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

  const maxTouch =
    signals.maxTouchPoints ??
    (typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0);

  if (isSafariPhoneUserAgent(ua, maxTouch)) return 'phone';
  return 'desktop';
}
