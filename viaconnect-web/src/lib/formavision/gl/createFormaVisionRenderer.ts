// r3f Canvas `gl` factory. Builds a THREE.WebGLRenderer from a Safari-safe
// context so iPhone Safari does not throw "Error creating WebGL context"
// after a poisoned webgl2-null canvas (Gary phone #172 CONFIRM).
//
// r3f 8.18 calls `gl(canvas)` with the live HTMLCanvasElement. Later fiber
// builds pass defaultProps `{ canvas, antialias, ... }`. Accept both so a
// props-object cannot be treated as the canvas (getContext undefined →
// error-boundary → false "device could not start WebGL").

import { WebGLRenderer } from 'three';
import {
  SAFE_GL_ATTRIBUTES,
  acquireWebGLContextResult,
  isSafariWebGLHost,
  type WebGLContextHost,
} from './acquireWebGLContext';

export const WEBGL_CONTEXT_UNAVAILABLE_MESSAGE = 'WebGL context unavailable';
export const FORMAVISION_GL_FACTORY_NO_CANVAS_MESSAGE =
  'FormaVision gl factory received no canvas';

export type FormaVisionGLFactoryInput = unknown;

function isCanvasHost(value: unknown): value is WebGLContextHost {
  return !!value && typeof value === 'object' && typeof (value as WebGLContextHost).getContext === 'function';
}

export function resolveFormaVisionGlCanvas(
  input: FormaVisionGLFactoryInput,
): WebGLContextHost | null {
  if (isCanvasHost(input)) return input;
  if (input && typeof input === 'object' && 'canvas' in input) {
    const canvas = (input as { canvas?: unknown }).canvas;
    if (isCanvasHost(canvas)) return canvas;
  }
  return null;
}

export function createFormaVisionRenderer(input: FormaVisionGLFactoryInput): WebGLRenderer {
  const canvas = resolveFormaVisionGlCanvas(input);
  if (!canvas) {
    throw new Error(FORMAVISION_GL_FACTORY_NO_CANVAS_MESSAGE);
  }
  const acquired = acquireWebGLContextResult(canvas, {
    safariLike: isSafariWebGLHost(),
    attributes: SAFE_GL_ATTRIBUTES,
  });
  if (!acquired) {
    throw new Error(WEBGL_CONTEXT_UNAVAILABLE_MESSAGE);
  }
  // antialias must match the context that actually won (SAFE true, or
  // SOFTWARE_SAFE false on SwiftShader MSAA-null). Passing true over a
  // non-MSAA context lies to THREE about the live GL state.
  return new WebGLRenderer({
    canvas: canvas as HTMLCanvasElement,
    context: acquired.context as WebGLRenderingContext,
    antialias: acquired.attributes.antialias === true,
    alpha: acquired.attributes.alpha !== false,
    powerPreference: acquired.attributes.powerPreference ?? 'default',
    failIfMajorPerformanceCaveat: acquired.attributes.failIfMajorPerformanceCaveat === true,
  });
}
