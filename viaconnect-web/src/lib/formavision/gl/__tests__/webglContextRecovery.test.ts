import { describe, expect, it, vi } from 'vitest';
import {
  CONTEXT_RESTORE_WAIT_MS,
  FORMAVISION_ZERO_SIZE_MESSAGE,
  WEBGL_CONTEXT_LOST_MESSAGE,
  WEBGL_REMOUNT_BUDGET,
  attachWebGLContextRecovery,
  canvasHasZeroClientBox,
  decideContextLossAction,
  isWebGLContextLostMessage,
  isZeroSizeCanvasMessage,
  scheduleZeroSizeHonestyCheck,
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

  it('reports zero-size after the scheduled frame', () => {
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
});
