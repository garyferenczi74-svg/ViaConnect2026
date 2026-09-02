// WebGL context-loss recovery for the FormaVision plate.
//
// Arnold box re-smoke after #176: a healthy 3D canvas spontaneously lost
// context (3x in one session, scroll/idle). The old path called
// onContextLost → remount budget → latch 2D and REMOVED the canvas from
// the DOM, so webglcontextrestored never fired. Phone blank plate is the
// same loss plus a remote Supabase SVG that never painted.
//
// Policy:
//   1. preventDefault on webglcontextlost (required for restore to fire).
//   2. Keep the canvas mounted and paint a local floor while waiting.
//   3. On webglcontextrestored, remount the r3f Canvas (THREE cannot
//      reuse a restored context). That remount does not burn the latch
//      budget.
//   4. If restore never arrives, remount a fresh canvas up to the budget,
//      then latch the honest 2D floor. Never leave the plate empty.

export const WEBGL_CONTEXT_LOST_MESSAGE = 'WebGL context lost';
export const FORMAVISION_ZERO_SIZE_MESSAGE = 'FormaVision canvas mounted at zero size';
export const CONTEXT_RESTORE_WAIT_MS = 1500;
export const WEBGL_REMOUNT_BUDGET = 2;

export type ContextLossAction = 'wait-restore' | 'remount' | 'latch-2d';

export function isWebGLContextLostMessage(message: string): boolean {
  return message.toLowerCase().includes('webgl context lost');
}

export function isZeroSizeCanvasMessage(message: string): boolean {
  return message.toLowerCase().includes('mounted at zero size');
}

export function canvasHasZeroClientBox(el: {
  clientWidth: number;
  clientHeight: number;
}): boolean {
  return el.clientWidth === 0 || el.clientHeight === 0;
}

export function decideContextLossAction(input: {
  remountsUsed: number;
  restoreSeen: boolean;
  timedOut: boolean;
  remountBudget?: number;
}): ContextLossAction {
  const budget = input.remountBudget ?? WEBGL_REMOUNT_BUDGET;
  if (input.restoreSeen) return 'remount';
  if (!input.timedOut) return 'wait-restore';
  if (input.remountsUsed < budget) return 'remount';
  return 'latch-2d';
}

export function attachWebGLContextRecovery(
  canvas: EventTarget,
  handlers: {
    onLost: (error: Error) => void;
    onRestored: () => void;
  },
): () => void {
  const onLost = (event: Event) => {
    event.preventDefault();
    handlers.onLost(new Error(WEBGL_CONTEXT_LOST_MESSAGE));
  };
  const onRestored = () => {
    handlers.onRestored();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  return () => {
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
  };
}

export function scheduleZeroSizeHonestyCheck(
  el: { clientWidth: number; clientHeight: number },
  report: (error: Error) => void,
  raf: (cb: () => void) => number = (cb) =>
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(cb)
      : (setTimeout(cb, 0) as unknown as number),
): void {
  raf(() => {
    if (canvasHasZeroClientBox(el)) {
      report(new Error(FORMAVISION_ZERO_SIZE_MESSAGE));
    }
  });
}
