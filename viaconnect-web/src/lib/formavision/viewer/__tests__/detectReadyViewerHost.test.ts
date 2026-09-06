import { describe, expect, it } from 'vitest';
import { detectReadyViewerHost } from '../detectReadyViewerHost';

describe('detectReadyViewerHost', () => {
  it('classifies iPhone and Android phone UAs as phone', () => {
    expect(
      detectReadyViewerHost({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
      }),
    ).toBe('phone');
    expect(
      detectReadyViewerHost({
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36',
      }),
    ).toBe('phone');
  });

  it('classifies desktop Chrome as desktop', () => {
    expect(
      detectReadyViewerHost({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
        maxTouchPoints: 0,
      }),
    ).toBe('desktop');
  });

  it('treats iPadOS Macintosh + multi-touch as phone', () => {
    expect(
      detectReadyViewerHost({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        maxTouchPoints: 5,
      }),
    ).toBe('phone');
  });

  it('returns unknown when no signals are available', () => {
    expect(detectReadyViewerHost({ userAgent: '' })).toBe('unknown');
  });
});
