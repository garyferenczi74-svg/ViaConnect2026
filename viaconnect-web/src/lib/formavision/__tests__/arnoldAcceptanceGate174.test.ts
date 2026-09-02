// Arnold tip acceptance gate for the #174 PRIMARY (false-negative 2D mount
// after #173). Prod www dpl_B7Zbkk7u / main c9b0700f: both getContext('webgl')
// and getContext('webgl2') succeed (ANGLE SwiftShader) but the plate still
// mounted formavision-fallback-2d + "This device could not start WebGL."

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  acquireWebGLContext,
  SOFTWARE_SAFE_GL_ATTRIBUTES,
} from '@/lib/formavision/gl/acquireWebGLContext';
import {
  GENERIC_WEBGL_UNAVAILABLE_DETAIL,
  formatFallbackNoticeDetail,
  shouldLatchFallback2d,
} from '@/lib/formavision/tier/fallbackNoticeCopy';
import { selectAvatarSurface } from '@/lib/formavision/tier/avatarSurfaceDecision';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

describe('Arnold #174 PRIMARY: keep 3D when getContext succeeds', () => {
  it('does not refuse SwiftShader / software GL', () => {
    const probe = src('src/lib/formavision/tier/capabilityProbe.ts');
    const acquire = src('src/lib/formavision/gl/acquireWebGLContext.ts');
    expect(probe).toMatch(/LOW_POWER_RENDERER_HINTS/);
    expect(probe).toMatch(/return 'lite'/);
    expect(probe).not.toMatch(/return '2d'/);
    expect(probe).toMatch(/Do NOT call readRendererString/);
    expect(acquire).toMatch(/failIfMajorPerformanceCaveat: false/);
    expect(SOFTWARE_SAFE_GL_ATTRIBUTES.failIfMajorPerformanceCaveat).toBe(false);
    expect(SOFTWARE_SAFE_GL_ATTRIBUTES.antialias).toBe(false);
  });

  it('retries without antialias so SwiftShader MSAA-null is not "no WebGL"', () => {
    const host = {
      getContext: (id: string, attrs?: { antialias?: boolean }) => {
        if (attrs?.antialias === false && (id === 'webgl2' || id === 'webgl')) {
          return { renderer: 'ANGLE SwiftShader' };
        }
        return null;
      },
    };
    expect(acquireWebGLContext(host, { safariLike: false })).toEqual({
      renderer: 'ANGLE SwiftShader',
    });
  });

  it('never selects the SVG floor while a 3D tier has not confirmed-failed', () => {
    expect(
      selectAvatarSurface({
        renderTier: 'lite',
        confirmedFailure: false,
        webgl: 'available',
      }),
    ).toBe('formavision3d');
    expect(shouldLatchFallback2d('available')).toBe(false);
    expect(shouldLatchFallback2d('ssr')).toBe(false);
  });

  it('surfaces the real later-init error instead of the generic WebGL sentence', () => {
    expect(formatFallbackNoticeDetail('WebGL context lost', 'available')).not.toContain(
      'This device could not start WebGL',
    );
    expect(formatFallbackNoticeDetail(null, 'unavailable')).toBe(GENERIC_WEBGL_UNAVAILABLE_DETAIL);
  });

  it('wires remount-on-usable-probe and stamps the testid on the real canvas', () => {
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    expect(avatar).toMatch(/shouldLatchFallback2d/);
    expect(avatar).toMatch(/setMountEpoch/);
    expect(avatar).toMatch(/probeWebGL/);
    expect(canvas).toMatch(/setAttribute\('data-testid', 'formavision-avatar-canvas'\)/);
    expect(canvas).not.toMatch(/data-testid="formavision-avatar-canvas"/);
    expect(page).toMatch(/empty:hidden/);
    expect(page).not.toMatch(/className="contents"/);
  });
});
