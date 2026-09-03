import { describe, expect, it, vi } from 'vitest';
import {
  CONTEXT_RESTORE_WAIT_MS,
  FIRST_PAINT_WATCHDOG_MS,
  FORMAVISION_ZERO_SIZE_MESSAGE,
  WEBGL_CONTEXT_LOST_MESSAGE,
  WEBGL_REMOUNT_BUDGET,
  ZERO_SIZE_LATCH_MS,
  attachWebGLContextRecovery,
  canvasHasZeroClientBox,
  decideContextLossAction,
  decideZeroSizeAction,
  isWebGLContextLostMessage,
  isZeroSizeCanvasMessage,
  scheduleFirstPaintWatchdog,
  scheduleZeroSizeHonestyCheck,
  shouldFireFirstInteractive,
  shouldTreatGlCreatedAsPainted,
  FIRST_PAINT_DEADLINE_MS,
  FORMAVISION_FIRST_PAINT_TIMEOUT_MESSAGE,
  RESTORE_SPIN_BUDGET,
  decideFirstPaintDeadlineAction,
  decideRestoreSpinAction,
  frameloopUntilFirstPaint,
  shouldLatchHonestFloor,
} from '../webglContextRecovery';

describe('decideContextLossAction', () => {
  it('waits for webglcontextrestored on first loss (does not tear the canvas)', () => {
    expect(
      decideContextLossAction({
        remountsUsed: 0,
        restoreSeen: false,
        timedOut: false,
      }),
    ).toBe('wait-restore');
  });

  it('remounts after restore without latching, even after several recoveries', () => {
    expect(
      decideContextLossAction({
        remountsUsed: 0,
        restoreSeen: true,
        timedOut: false,
      }),
    ).toBe('remount');
    expect(
      decideContextLossAction({
        remountsUsed: 3,
        restoreSeen: true,
        timedOut: false,
      }),
    ).toBe('remount');
  });

  it('remounts on restore timeout while budget remains, then latches', () => {
    expect(
      decideContextLossAction({
        remountsUsed: 0,
        restoreSeen: false,
        timedOut: true,
      }),
    ).toBe('remount');
    expect(
      decideContextLossAction({
        remountsUsed: 1,
        restoreSeen: false,
        timedOut: true,
      }),
    ).toBe('remount');
    expect(
      decideContextLossAction({
        remountsUsed: WEBGL_REMOUNT_BUDGET,
        restoreSeen: false,
        timedOut: true,
      }),
    ).toBe('latch-2d');
    expect(
      decideContextLossAction({
        remountsUsed: WEBGL_REMOUNT_BUDGET,
        restoreSeen: false,
        timedOut: true,
        hasReadyScanData: true,
      }),
    ).toBe('remount');
  });
});

describe('context-loss messages and canvas box', () => {
  it('classifies the restore-path message and the zero-size honesty reason', () => {
    expect(isWebGLContextLostMessage(WEBGL_CONTEXT_LOST_MESSAGE)).toBe(true);
    expect(isWebGLContextLostMessage('Shader compile failed')).toBe(false);
    expect(isZeroSizeCanvasMessage(FORMAVISION_ZERO_SIZE_MESSAGE)).toBe(true);
    expect(CONTEXT_RESTORE_WAIT_MS).toBeGreaterThan(0);
  });

  it('treats a 0x0 client box as empty (attr-PASS / visual-FAIL)', () => {
    expect(canvasHasZeroClientBox({ clientWidth: 0, clientHeight: 0 })).toBe(true);
    expect(canvasHasZeroClientBox({ clientWidth: 320, clientHeight: 0 })).toBe(true);
    expect(canvasHasZeroClientBox({ clientWidth: 320, clientHeight: 400 })).toBe(false);
  });

  it('preventDefault on lost so restore can fire, then remounts on restored', () => {
    const target = new EventTarget();
    const onLost = vi.fn();
    const onRestored = vi.fn();
    const detach = attachWebGLContextRecovery(target, { onLost, onRestored });

    const lost = new Event('webglcontextlost', { cancelable: true });
    target.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    expect(onLost).toHaveBeenCalledWith(expect.any(Error));
    expect((onLost.mock.calls[0]?.[0] as Error).message).toBe(WEBGL_CONTEXT_LOST_MESSAGE);

    target.dispatchEvent(new Event('webglcontextrestored'));
    expect(onRestored).toHaveBeenCalledTimes(1);
    detach();
  });

  it('reports zero-size on the first layout frame so the plate latches without remounts', () => {
    const report = vi.fn();
    let queued: (() => void) | null = null;
    scheduleZeroSizeHonestyCheck({ clientWidth: 0, clientHeight: 0 }, report, (cb) => {
      queued = cb;
      return 1;
    });
    expect(report).not.toHaveBeenCalled();
    queued?.();
    expect(report).toHaveBeenCalledWith(expect.any(Error));
    expect((report.mock.calls[0]?.[0] as Error).message).toBe(FORMAVISION_ZERO_SIZE_MESSAGE);
  });

  it('rechecks a collapsed box on the scheduled frame', () => {
    const report = vi.fn();
    const box = { clientWidth: 320, clientHeight: 400 };
    let queued: (() => void) | null = null;
    scheduleZeroSizeHonestyCheck(box, report, (cb) => {
      queued = cb;
      return 1;
    });
    expect(report).not.toHaveBeenCalled();
    box.clientWidth = 0;
    queued?.();
    expect(report).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('first-paint vs GL-created', () => {
  it('never treats onCreated as a painted frame', () => {
    expect(shouldTreatGlCreatedAsPainted()).toBe(false);
    expect(shouldFireFirstInteractive('gl-created')).toBe(false);
    expect(shouldFireFirstInteractive('first-demand-frame')).toBe(true);
    expect(decideZeroSizeAction()).toBe('latch-2d');
    expect(FIRST_PAINT_WATCHDOG_MS).toBeGreaterThan(0);
    expect(FIRST_PAINT_DEADLINE_MS).toBeGreaterThan(FIRST_PAINT_WATCHDOG_MS);
    expect(decideFirstPaintDeadlineAction({ painted: false })).toBe('latch-unavailable');
    expect(decideFirstPaintDeadlineAction({ painted: true })).toBe('keep-waiting');
    expect(
      decideFirstPaintDeadlineAction({ painted: false, hasReadyScanData: true }),
    ).toBe('present-ready-mesh');
    expect(decideRestoreSpinAction({ restoreRemounts: RESTORE_SPIN_BUDGET })).toBe(
      'latch-2d',
    );
    expect(
      decideRestoreSpinAction({
        restoreRemounts: RESTORE_SPIN_BUDGET,
        hasReadyScanData: true,
      }),
    ).toBe('remount');
    expect(FORMAVISION_FIRST_PAINT_TIMEOUT_MESSAGE).toMatch(/did not present a frame/);
    expect(ZERO_SIZE_LATCH_MS).toBeLessThan(CONTEXT_RESTORE_WAIT_MS);
  });

  it('paint watchdog only misses when no frame has presented', () => {
    const onMiss = vi.fn();
    let painted = false;
    let queued: (() => void) | null = null;
    const cancel = scheduleFirstPaintWatchdog(
      () => painted,
      onMiss,
      10,
      (cb) => {
        queued = cb;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      },
    );
    expect(onMiss).not.toHaveBeenCalled();
    queued?.();
    expect(onMiss).toHaveBeenCalledTimes(1);
    painted = true;
    queued = null;
    scheduleFirstPaintWatchdog(
      () => painted,
      onMiss,
      10,
      (cb) => {
        queued = cb;
        return 2 as unknown as ReturnType<typeof setTimeout>;
      },
    );
    queued?.();
    expect(onMiss).toHaveBeenCalledTimes(1);
    cancel();
  });

  it('forces always-loop until a Ready mesh paints, then restores demand', () => {
    expect(frameloopUntilFirstPaint(false)).toBe('always');
    expect(frameloopUntilFirstPaint(false, 'demand')).toBe('always');
    expect(frameloopUntilFirstPaint(true)).toBe('demand');
    expect(frameloopUntilFirstPaint(true, 'always')).toBe('always');
    expect(shouldLatchHonestFloor({ hasReadyScanData: true })).toBe(false);
    expect(shouldLatchHonestFloor({ hasReadyScanData: false })).toBe(true);
  });
});
