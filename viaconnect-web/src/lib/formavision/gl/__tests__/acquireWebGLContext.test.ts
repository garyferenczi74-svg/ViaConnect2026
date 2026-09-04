// Safari / iOS WebGL acquisition: the live r3f canvas must not be poisoned by
// a failed webgl2 request. Box Chrome still prefers webgl2 first.

import { describe, it, expect, vi } from 'vitest';
import {
  acquireWebGLContext,
  acquireWebGLContextResult,
  isSafariWebGLHost,
  webglContextTypeOrder,
  SAFE_GL_ATTRIBUTES,
  SAFARI_SAFE_GL_ATTRIBUTES,
  SOFTWARE_SAFE_GL_ATTRIBUTES,
  glAttributesForHost,
} from '../acquireWebGLContext';

function canvasThat(
  impl: (id: string) => unknown,
): { getContext: ReturnType<typeof vi.fn> } {
  return {
    getContext: vi.fn((id: string) => impl(id)),
  };
}

describe('isSafariWebGLHost', () => {
  it('treats iPhone and iPad as Safari-like (WKWebView, including iOS Chrome)', () => {
    expect(
      isSafariWebGLHost(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(true);
    expect(
      isSafariWebGLHost(
        'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(true);
  });

  it('treats desktop Safari as Safari-like and Chrome as not', () => {
    expect(
      isSafariWebGLHost(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      ),
    ).toBe(true);
    expect(
      isSafariWebGLHost(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
  });
});

describe('webglContextTypeOrder', () => {
  it('asks WebGL1 first on Safari so the live canvas is never webgl2-poisoned', () => {
    expect(webglContextTypeOrder(true)[0]).toBe('webgl');
    expect(webglContextTypeOrder(true)).not.toContain('webgl2');
  });

  it('asks WebGL2 first on Chromium', () => {
    expect(webglContextTypeOrder(false)[0]).toBe('webgl2');
  });
});

describe('acquireWebGLContext', () => {
  it('on Safari gets webgl1 and never touches webgl2 on that canvas', () => {
    const host = canvasThat((id) => (id === 'webgl' ? { kind: 'webgl' } : null));
    const ctx = acquireWebGLContext(host, { safariLike: true });
    expect(ctx).toEqual({ kind: 'webgl' });
    const ids = host.getContext.mock.calls.map((c) => c[0]);
    expect(ids).toContain('webgl');
    expect(ids).not.toContain('webgl2');
    expect(host.getContext).toHaveBeenCalledWith(
      'webgl',
      expect.objectContaining({
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default',
      }),
    );
  });

  it('on Safari a failed first request does not try another type on the same canvas', () => {
    const host = canvasThat(() => null);
    expect(acquireWebGLContext(host, { safariLike: true })).toBeNull();
    const ids = host.getContext.mock.calls.map((c) => c[0]);
    expect(ids.every((id) => id === 'webgl')).toBe(true);
    expect(ids).not.toContain('webgl2');
  });

  it('retries without antialias when MSAA getContext returns null (SwiftShader)', () => {
    const host = canvasThat((_id: string) => null);
    host.getContext.mockImplementation((_id: string, attrs?: { antialias?: boolean }) => {
      if (attrs && attrs.antialias === false) return { kind: 'soft' };
      return null;
    });
    expect(acquireWebGLContext(host, { safariLike: false })).toEqual({ kind: 'soft' });
    const attrCalls = host.getContext.mock.calls.map((c) => c[1] as { antialias?: boolean });
    expect(attrCalls.some((a) => a?.antialias === true)).toBe(true);
    expect(attrCalls.some((a) => a?.antialias === false)).toBe(true);
    expect(acquireWebGLContextResult(host, { safariLike: false })?.attributes.antialias).toBe(
      false,
    );
  });

  it('on Chrome prefers webgl2 and can fall through to webgl1 on the same canvas', () => {
    const host = canvasThat((id) => (id === 'webgl' ? { kind: 'webgl' } : null));
    const ctx = acquireWebGLContext(host, { safariLike: false });
    expect(ctx).toEqual({ kind: 'webgl' });
    const ids = host.getContext.mock.calls.map((c) => c[0]);
    expect(ids[0]).toBe('webgl2');
    expect(ids).toContain('webgl');
  });

  it('exports caveat-false default attributes so low-power GPUs still count', () => {
    expect(SAFE_GL_ATTRIBUTES.failIfMajorPerformanceCaveat).toBe(false);
    expect(SAFE_GL_ATTRIBUTES.powerPreference).toBe('default');
    expect(SOFTWARE_SAFE_GL_ATTRIBUTES.antialias).toBe(false);
    expect(SOFTWARE_SAFE_GL_ATTRIBUTES.failIfMajorPerformanceCaveat).toBe(false);
  });

  it('uses an opaque preserved buffer on Safari so the first body frame composites', () => {
    expect(SAFARI_SAFE_GL_ATTRIBUTES.alpha).toBe(false);
    expect(SAFARI_SAFE_GL_ATTRIBUTES.preserveDrawingBuffer).toBe(true);
    expect(glAttributesForHost(true)).toBe(SAFARI_SAFE_GL_ATTRIBUTES);
    expect(glAttributesForHost(false)).toBe(SAFE_GL_ATTRIBUTES);
    expect(SAFE_GL_ATTRIBUTES.alpha).toBe(true);
  });
});
