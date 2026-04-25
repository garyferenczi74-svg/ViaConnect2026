import { describe, it, expect } from 'vitest';
import { detectWebView } from '@/lib/device/detect-webview';

describe('detectWebView', () => {
  it('returns isWebView: false for null, undefined, empty, or whitespace', () => {
    expect(detectWebView(null)).toEqual({ isWebView: false });
    expect(detectWebView(undefined)).toEqual({ isWebView: false });
    expect(detectWebView('')).toEqual({ isWebView: false });
    expect(detectWebView('   ')).toEqual({ isWebView: false });
  });

  it('does not flag standard mobile browsers', () => {
    const safariIos =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const chromeIos =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1';
    const chromeAndroid =
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36';
    expect(detectWebView(safariIos).isWebView).toBe(false);
    expect(detectWebView(chromeIos).isWebView).toBe(false);
    expect(detectWebView(chromeAndroid).isWebView).toBe(false);
  });

  it('does not flag desktop browsers', () => {
    const desktopChrome =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const desktopFirefox =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:121.0) Gecko/20100101 Firefox/121.0';
    const desktopEdge =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    const desktopSafari =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
    expect(detectWebView(desktopChrome).isWebView).toBe(false);
    expect(detectWebView(desktopFirefox).isWebView).toBe(false);
    expect(detectWebView(desktopEdge).isWebView).toBe(false);
    expect(detectWebView(desktopSafari).isWebView).toBe(false);
  });

  it('flags Instagram in-app browser', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 295.0.0.21.111 (iPhone14,3; iOS 17_0; en_US; en; scale=3.00; 1170x2532; 471862634)';
    expect(detectWebView(ua)).toEqual({ isWebView: true, client: 'instagram' });
  });

  it('flags Facebook in-app browser via FBAN/FBAV markers', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0.0.30.107;FBBV/543220119]';
    expect(detectWebView(ua)).toEqual({ isWebView: true, client: 'facebook' });
  });

  it('flags Threads in-app browser', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Threads 305.0.0.21.111';
    expect(detectWebView(ua)).toEqual({ isWebView: true, client: 'threads' });
  });

  it('flags LinkedIn in-app browser', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkedInApp/9.30.0';
    expect(detectWebView(ua)).toEqual({ isWebView: true, client: 'linkedin' });
  });

  it('flags TikTok in-app browser', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36 musical_ly_2024010120 BytedanceWebview/d8a21c6';
    expect(detectWebView(ua)).toEqual({ isWebView: true, client: 'tiktok' });
  });

  it('flags Twitter (X) in-app browser', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone';
    expect(detectWebView(ua)).toEqual({ isWebView: true, client: 'twitter' });
  });

  it('flags Line in-app browser', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36 Line/13.18.0/IAB';
    expect(detectWebView(ua)).toEqual({ isWebView: true, client: 'line' });
  });

  it('handles malformed UA gracefully', () => {
    expect(detectWebView('garbage')).toEqual({ isWebView: false });
    expect(detectWebView('a'.repeat(50_000)).isWebView).toBe(false);
  });
});
