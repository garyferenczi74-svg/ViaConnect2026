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
// Demand-loop paint watchdog. GL onCreated is NOT a painted frame.
export const FIRST_PAINT_WATCHDOG_MS = 400;
export const FIRST_PAINT_WATCHDOG_RETRIES = 12;
// Ready scan must not sit on "Loading…" forever. Long enough for the
// dynamic three chunk + first demand frame; short enough to be honest.
export const FIRST_PAINT_DEADLINE_MS = 8000;
export const FORMAVISION_FIRST_PAINT_TIMEOUT_MESSAGE =
  'FormaVision 3D did not present a frame';
// webglcontextrestored remounts do not burn WEBGL_REMOUNT_BUDGET. Cap
// the lost→restore spin so a phone GPU fight cannot stay on Loading.
export const RESTORE_SPIN_BUDGET = 3;
export const ZERO_SIZE_LATCH_MS = 80;

export type ContextLossAction = 'wait-restore' | 'remount' | 'latch-2d';

export type FirstPaintDeadlineAction =
  | 'keep-waiting'
  | 'present-ready-mesh'
  | 'latch-unavailable';

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

export function drawingBufferHasPixels(gl: {
  drawingBufferWidth: number;
  drawingBufferHeight: number;
}): boolean {
  return gl.drawingBufferWidth > 0 && gl.drawingBufferHeight > 0;
}

// Phone WebKit can report a 0×0 client box while the drawing buffer already
// has pixels (or the reverse). Either is enough to stamp a presented frame.
export function shouldStampPaintedFrame(input: {
  clientBoxZero: boolean;
  drawingBufferHasPixels: boolean;
}): boolean {
  if (input.drawingBufferHasPixels) return true;
  return !input.clientBoxZero;
}

export function readParentBox(
  canvas: { parentElement: { getBoundingClientRect: () => DOMRect } | null },
): { width: number; height: number } | null {
  const parent = canvas.parentElement;
  if (!parent) return null;
  const rect = parent.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { width: rect.width, height: rect.height };
}

export function syncCanvasToParentBox(
  canvas: HTMLCanvasElement,
  renderer: { setSize: (width: number, height: number, updateStyle?: boolean) => void },
): { width: number; height: number } | null {
  const box = readParentBox(canvas);
  const width = box?.width ?? canvas.clientWidth;
  const height = box?.height ?? canvas.clientHeight;
  if (width <= 0 || height <= 0) return null;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  renderer.setSize(width, height, false);
  return { width, height };
}

// GL context ready (Canvas onCreated) is not a presented frame. Phone
// WebKit can fire onCreated with an alpha, never-drawn buffer.
export function shouldTreatGlCreatedAsPainted(): boolean {
  return false;
}

// Zero-size must latch the honest floor immediately. Remounting a 0×0
// canvas burns the budget while the plate stays empty.
export function decideZeroSizeAction(): Extract<ContextLossAction, 'latch-2d'> {
  return 'latch-2d';
}

export function shouldFireFirstInteractive(source: 'gl-created' | 'first-demand-frame'): boolean {
  return source === 'first-demand-frame';
}

export function decideFirstPaintDeadlineAction(input: {
  painted: boolean;
  hasReadyScanData?: boolean;
}): FirstPaintDeadlineAction {
  if (input.painted) return 'keep-waiting';
  // Ready + BF/girths must keep the parametric (or Meshy) mesh compositable.
  // The 8s miss is not proof that there is no scan — only that useFrame
  // never reported. Latched alien is the #184 phone FAIL.
  if (input.hasReadyScanData) return 'present-ready-mesh';
  return 'latch-unavailable';
}

export function decideRestoreSpinAction(input: {
  restoreRemounts: number;
  budget?: number;
  hasReadyScanData?: boolean;
}): 'remount' | 'latch-2d' {
  if (input.hasReadyScanData) return 'remount';
  const budget = input.budget ?? RESTORE_SPIN_BUDGET;
  return input.restoreRemounts < budget ? 'remount' : 'latch-2d';
}

export function decideContextLossAction(input: {
  remountsUsed: number;
  restoreSeen: boolean;
  timedOut: boolean;
  remountBudget?: number;
  hasReadyScanData?: boolean;
}): ContextLossAction {
  const budget = input.remountBudget ?? WEBGL_REMOUNT_BUDGET;
  if (input.restoreSeen) return 'remount';
  if (!input.timedOut) return 'wait-restore';
  if (input.hasReadyScanData) return 'remount';
  if (input.remountsUsed < budget) return 'remount';
  return 'latch-2d';
}

export function frameloopUntilFirstPaint(
  painted: boolean,
  requested?: 'always' | 'demand',
): 'always' | 'demand' {
  return painted ? (requested ?? 'demand') : 'always';
}

// present-ready-mesh keeps the Ready plate mounted. It is not a GPU
// frame. Counting it as first-interactive restores demand and deadlocks
// phone WebKit (Gary #185 after #183/#184).
export function shouldTreatPresentReadyMeshAsPainted(): boolean {
  return false;
}

export function frameloopAfterDeadline(input: {
  painted: boolean;
  action: FirstPaintDeadlineAction;
  requested?: 'always' | 'demand';
}): 'always' | 'demand' {
  if (input.action === 'present-ready-mesh' && !input.painted) {
    return 'always';
  }
  return frameloopUntilFirstPaint(input.painted, input.requested);
}

export function shouldLatchHonestFloor(input: { hasReadyScanData: boolean }): boolean {
  return !input.hasReadyScanData;
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
  const fireIfZero = (): boolean => {
    if (canvasHasZeroClientBox(el)) {
      report(new Error(FORMAVISION_ZERO_SIZE_MESSAGE));
      return true;
    }
    return false;
  };
  // Wait one frame for layout (onCreated can see 0×0 before the plate
  // box is definite). Then latch immediately — do not remount a 0×0
  // canvas. A short follow-up catches a deferred collapse.
  raf(() => {
    if (fireIfZero()) return;
    setTimeout(() => {
      fireIfZero();
    }, ZERO_SIZE_LATCH_MS);
  });
}

export function scheduleFirstPaintWatchdog(
  hasPainted: () => boolean,
  onMiss: () => void,
  delayMs: number = FIRST_PAINT_WATCHDOG_MS,
  setTimer: (cb: () => void, ms: number) => ReturnType<typeof setTimeout> = (cb, ms) =>
    setTimeout(cb, ms),
  retries: number = FIRST_PAINT_WATCHDOG_RETRIES,
): () => void {
  let attempt = 0;
  let handle: ReturnType<typeof setTimeout> | null = null;
  const tick = (): void => {
    if (hasPainted()) return;
    onMiss();
    attempt += 1;
    if (attempt < retries) {
      handle = setTimer(tick, delayMs);
    }
  };
  handle = setTimer(tick, delayMs);
  return () => {
    if (handle !== null) clearTimeout(handle);
  };
}
