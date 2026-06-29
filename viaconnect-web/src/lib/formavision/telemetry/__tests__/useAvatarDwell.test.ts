// src/lib/formavision/telemetry/__tests__/useAvatarDwell.test.ts
//
// Prompt 210b P8-T2a: TDD tests for the dwell accumulator helper.
//
// Tests target createDwellAccumulator (the pure factory) with an injected
// nowFn so no real performance.now() or DOM is needed. The React hook wraps
// the factory with DOM event listeners; its logic is thin and covered by
// the factory tests below.
//
// No em-dashes. No en-dashes. No any cast.

import { describe, it, expect } from 'vitest';
import { createDwellAccumulator } from '../useAvatarDwell';

// ---------------------------------------------------------------------------
// T1. Basic accumulation: one visible->hidden cycle
// ---------------------------------------------------------------------------

describe('createDwellAccumulator: single visible/hidden cycle', () => {
  it('returns 0 when onHidden fires before any onVisible call', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);
    const result = acc.onHidden();
    expect(result).toBe(0);
  });

  it('returns elapsed ms after one visible->hidden cycle', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);
    acc.onVisible();  // t=0
    t = 1000;
    const result = acc.onHidden();  // 1000ms elapsed
    expect(result).toBe(1000);
  });

  it('rounds fractional ms to the nearest integer', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);
    acc.onVisible();
    t = 1500.6;
    const result = acc.onHidden();
    expect(result).toBe(1501);
  });

  it('rounds down on .4 fractional ms', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);
    acc.onVisible();
    t = 999.4;
    const result = acc.onHidden();
    expect(result).toBe(999);
  });
});

// ---------------------------------------------------------------------------
// T2. Accumulation across multiple visible<->hidden cycles
// ---------------------------------------------------------------------------

describe('createDwellAccumulator: multiple visible/hidden cycles', () => {
  it('accumulates time across two visible/hidden cycles', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);

    acc.onVisible();   // t=0
    t = 1000;
    acc.onHidden();    // +1000ms = 1000 total; emitted 1000
    acc.onVisible();   // t=1000
    t = 2500;
    const result = acc.onHidden();  // +1500ms = 2500 total; 2500 > 1000 -> emit 2500
    expect(result).toBe(2500);
  });

  it('accumulates across three cycles', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);

    acc.onVisible(); t = 500;
    acc.onHidden();           // 500ms emitted
    acc.onVisible(); t = 1000;
    acc.onHidden();           // +500 = 1000ms emitted
    acc.onVisible(); t = 1300;
    const result = acc.onHidden(); // +300 = 1300ms emitted
    expect(result).toBe(1300);
  });
});

// ---------------------------------------------------------------------------
// T3. Dedup guard: no additional visible time = return 0 (skip emit)
// ---------------------------------------------------------------------------

describe('createDwellAccumulator: dedup / no-new-time guard', () => {
  it('returns 0 on second onHidden when no visible time accrued between calls', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);
    acc.onVisible();
    t = 1000;
    const first = acc.onHidden();   // 1000ms -> emitted
    const second = acc.onHidden();  // nothing new -> skip
    expect(first).toBe(1000);
    expect(second).toBe(0);
  });

  it('returns 0 when onHidden fires twice rapidly with no interleaved onVisible', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);
    acc.onVisible();
    t = 500;
    acc.onHidden();   // emitted 500
    t = 501;          // 1ms more, but lastVisibleStart is null (hidden after first onHidden)
    const second = acc.onHidden();
    expect(second).toBe(0);
  });

  it('emits again after returning to visible and accumulating more time', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);
    acc.onVisible(); t = 1000;
    acc.onHidden();             // 1000ms emitted; lastEmittedMs=1000
    acc.onVisible(); t = 1100; // 100ms more accrued but hidden fires:
    const result = acc.onHidden(); // 1000 + 100 = 1100 -> 1100 > 1000 -> emit 1100
    expect(result).toBe(1100);
  });
});

// ---------------------------------------------------------------------------
// T4. Zero-guard: never emit a zero-ms dwell
// ---------------------------------------------------------------------------

describe('createDwellAccumulator: zero-ms guard', () => {
  it('returns 0 when onVisible and onHidden fire at the same instant (t=0)', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);
    acc.onVisible();
    // t stays 0
    const result = acc.onHidden();
    expect(result).toBe(0);
  });

  it('returns 0 when onVisible and onHidden fire 0.4ms apart (rounds to 0)', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);
    acc.onVisible();
    t = 0.4;
    const result = acc.onHidden();
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// T5. pagehide simulation: visible->pagehide without a prior visibilitychange
// ---------------------------------------------------------------------------

describe('createDwellAccumulator: pagehide without prior visibilitychange', () => {
  it('emits total visible time on first onHidden call (simulates pagehide)', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);
    acc.onVisible();  // mount with tab visible
    t = 5000;
    const result = acc.onHidden();  // pagehide fires without prior hidden event
    expect(result).toBe(5000);
  });

  it('returns 0 on a second pagehide-like onHidden call immediately after', () => {
    let t = 0;
    const acc = createDwellAccumulator(() => t);
    acc.onVisible(); t = 5000;
    const first = acc.onHidden();  // visibilitychange->hidden or pagehide
    t = 5001;                       // 1ms more, but we are hidden (no onVisible)
    const second = acc.onHidden(); // redundant pagehide within same tick
    expect(first).toBe(5000);
    expect(second).toBe(0);
  });
});
