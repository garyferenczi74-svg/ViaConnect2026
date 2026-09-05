// r3f Canvas `gl` factory. Builds a THREE.WebGLRenderer from a Safari-safe
// WebGL2 context. THREE r184 rejects WebGL1 ("not supported since r163").
// Asking webgl first on Safari (#172 poison-avoidance) handed THREE a WebGL1
// context and the constructor threw — Gary #189 flash-then-dark. The live
// canvas is WebGL2-only; Safari attrs stay opaque + preserveDrawingBuffer.
//
// r3f 8 called `gl(canvas)` with the live HTMLCanvasElement. Fiber 9+ passes
// defaultProps `{ canvas, antialias, ... }`. Accept both so a props-object
// cannot be treated as the canvas (getContext undefined → error-boundary →
// false "device could not start WebGL").

import { WebGLRenderer } from 'three';
import {
  acquireWebGLContextResult,
  glAttributesForHost,
  isSafariWebGLHost,
  liveCanvasContextTypeOrder,
  shouldPassContextToThreeRenderer,
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
  const safariLike = isSafariWebGLHost();
  const acquired = acquireWebGLContextResult(canvas, {
    safariLike,
    attributes: glAttributesForHost(safariLike),
    typeOrder: liveCanvasContextTypeOrder(),
  });
  if (!acquired) {
    throw new Error(WEBGL_CONTEXT_UNAVAILABLE_MESSAGE);
  }
  // THREE r184 throws on WebGL1. Only pass a WebGL2 (or duck-typed test) context.
  // Safari-safe attrs (opaque + preserveDrawingBuffer) travel with the winner so
  // the first always-loop F3 frame actually composites on iPhone WebKit.
  const passContext = shouldPassContextToThreeRenderer(acquired.context);
  // antialias must match the context that actually won (SAFE true, or
  // SOFTWARE_SAFE false on SwiftShader MSAA-null). Passing true over a
  // non-MSAA context lies to THREE about the live GL state.
  return new WebGLRenderer({
    canvas: canvas as HTMLCanvasElement,
    ...(passContext ? { context: acquired.context as WebGL2RenderingContext } : {}),
    antialias: acquired.attributes.antialias === true,
    alpha: acquired.attributes.alpha !== false,
    preserveDrawingBuffer: acquired.attributes.preserveDrawingBuffer === true,
    powerPreference: acquired.attributes.powerPreference ?? 'default',
    failIfMajorPerformanceCaveat: acquired.attributes.failIfMajorPerformanceCaveat === true,
  });
}
