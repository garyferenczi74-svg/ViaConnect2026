// r3f Canvas `gl` factory. Builds a THREE.WebGLRenderer from a Safari-safe
// context so iPhone Safari does not throw "Error creating WebGL context"
// after a poisoned webgl2-null canvas (Gary phone #172 CONFIRM).

import { WebGLRenderer } from 'three';
import {
  SAFE_GL_ATTRIBUTES,
  acquireWebGLContext,
  isSafariWebGLHost,
} from './acquireWebGLContext';

export function createFormaVisionRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const context = acquireWebGLContext(canvas, {
    safariLike: isSafariWebGLHost(),
    attributes: SAFE_GL_ATTRIBUTES,
  });
  if (!context) {
    throw new Error('WebGL context unavailable');
  }
  return new WebGLRenderer({
    canvas,
    context: context as WebGLRenderingContext,
    antialias: SAFE_GL_ATTRIBUTES.antialias,
    alpha: SAFE_GL_ATTRIBUTES.alpha,
    powerPreference: SAFE_GL_ATTRIBUTES.powerPreference,
    failIfMajorPerformanceCaveat: SAFE_GL_ATTRIBUTES.failIfMajorPerformanceCaveat,
  });
}
