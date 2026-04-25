// In-app browser (WebView) detection for the supplement upload flow.
//
// In-app browsers strip `capture="environment"` and silently refuse camera
// intents, leaving the user to tap a no-op affordance. This module identifies
// the seven most common social WebViews so the surface can show a friendly
// "open in your real browser" banner instead.
//
// Conservative posture: false negatives (missing a WebView) are acceptable;
// false positives are slightly bad. Patterns target distinctive UA markers
// that do not appear in standard mobile or desktop browsers.

export type WebViewClient =
  | 'instagram'
  | 'facebook'
  | 'threads'
  | 'linkedin'
  | 'tiktok'
  | 'twitter'
  | 'line';

export interface WebViewDetection {
  isWebView: boolean;
  client?: WebViewClient;
}

const PATTERNS: ReadonlyArray<{ client: WebViewClient; pattern: RegExp }> = [
  { client: 'instagram', pattern: /\bInstagram\b/i },
  { client: 'facebook', pattern: /\b(?:FBAN|FBAV|FB_IAB|FB4A)\b/ },
  { client: 'threads', pattern: /\bThreads\b/i },
  { client: 'linkedin', pattern: /\bLinkedInApp\b/i },
  { client: 'tiktok', pattern: /(?:musical_ly|BytedanceWebview|TikTok_app)/i },
  { client: 'twitter', pattern: /Twitter for /i },
  { client: 'line', pattern: /\bLine\/\d/i },
];

export function detectWebView(userAgent: string | null | undefined): WebViewDetection {
  if (!userAgent || typeof userAgent !== 'string') return { isWebView: false };
  const trimmed = userAgent.trim();
  if (trimmed.length === 0) return { isWebView: false };
  for (const { client, pattern } of PATTERNS) {
    if (pattern.test(trimmed)) return { isWebView: true, client };
  }
  return { isWebView: false };
}
