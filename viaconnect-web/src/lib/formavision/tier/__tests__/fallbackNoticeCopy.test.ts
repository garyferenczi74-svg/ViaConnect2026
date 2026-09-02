import { describe, it, expect } from 'vitest';
import {
  GENERIC_WEBGL_UNAVAILABLE_DETAIL,
  LATER_INIT_FALLBACK_DETAIL,
  errorMessageFromUnknown,
  formatFallbackNoticeDetail,
  shouldLatchFallback2d,
} from '../fallbackNoticeCopy';

describe('shouldLatchFallback2d', () => {
  it('latches the SVG floor only when a fresh probe is unavailable', () => {
    expect(shouldLatchFallback2d('unavailable')).toBe(true);
    expect(shouldLatchFallback2d('available')).toBe(false);
    expect(shouldLatchFallback2d('ssr')).toBe(false);
    expect(shouldLatchFallback2d('unknown')).toBe(false);
  });
});

describe('formatFallbackNoticeDetail', () => {
  it('uses the generic WebGL sentence only for a confirmed no-context probe', () => {
    expect(formatFallbackNoticeDetail(null, 'unavailable')).toBe(GENERIC_WEBGL_UNAVAILABLE_DETAIL);
    expect(formatFallbackNoticeDetail('WebGL context unavailable', 'unavailable')).toBe(
      GENERIC_WEBGL_UNAVAILABLE_DETAIL,
    );
  });

  it('never blames "device could not start WebGL" when getContext still works', () => {
    expect(formatFallbackNoticeDetail('WebGL context unavailable', 'available')).toBe(
      LATER_INIT_FALLBACK_DETAIL,
    );
    expect(formatFallbackNoticeDetail('Shader compile failed', 'available')).toContain(
      'Shader compile failed',
    );
    expect(formatFallbackNoticeDetail('Shader compile failed', 'available')).not.toContain(
      'This device could not start WebGL',
    );
    expect(formatFallbackNoticeDetail('WebGL context lost', 'available')).not.toContain(
      'This device could not start WebGL',
    );
  });

  it('surfaces a later-init reason even when the probe is unknown', () => {
    const copy = formatFallbackNoticeDetail('Error creating WebGL renderer internals', 'unknown');
    expect(copy).toContain('Error creating WebGL renderer internals');
    expect(copy).not.toContain('This device could not start WebGL');
  });
});

describe('errorMessageFromUnknown', () => {
  it('reads Error.message and string errors without fabricating', () => {
    expect(errorMessageFromUnknown(new Error('Shader compile failed'))).toBe('Shader compile failed');
    expect(errorMessageFromUnknown('context lost')).toBe('context lost');
    expect(errorMessageFromUnknown({})).toBe('3D avatar failed to initialize');
  });
});
