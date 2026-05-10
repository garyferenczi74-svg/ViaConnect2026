// Prompt #157k §4.1: FIFO pin queue tests for the body region hover
// system. Logic-only; no React rendering, no DOM. Zustand state is
// driven via getState / setState so the hook works in vitest's node
// environment without jsdom.

import { afterEach, describe, it, expect, beforeEach } from 'vitest';

import { usePinnedCards } from '@/components/body-tracker/HoverSystem/usePinnedCards';

const DESKTOP_CAP = 3;
const MOBILE_CAP = 1;

beforeEach(() => {
  usePinnedCards.getState().clearAll();
});

afterEach(() => {
  usePinnedCards.getState().clearAll();
});

describe('usePinnedCards', () => {
  it('starts with empty queue', () => {
    const s = usePinnedCards.getState();
    expect(s.pinnedIds).toEqual([]);
    expect(s.hoveredId).toBeNull();
  });

  it('appends a region when pinning into an empty queue (desktop)', () => {
    usePinnedCards.getState().pinRegion('chest', DESKTOP_CAP, 'figure');
    expect(usePinnedCards.getState().pinnedIds).toEqual(['chest']);
    expect(usePinnedCards.getState().triggerOriginById.chest).toBe('figure');
  });

  it('appends below cap on desktop, preserving FIFO order', () => {
    const { pinRegion } = usePinnedCards.getState();
    pinRegion('chest', DESKTOP_CAP, 'figure');
    pinRegion('l_bicep', DESKTOP_CAP, 'figure');
    pinRegion('r_bicep', DESKTOP_CAP, 'figure');
    expect(usePinnedCards.getState().pinnedIds).toEqual(['chest', 'l_bicep', 'r_bicep']);
  });

  it('evicts oldest when adding a 4th region at desktop cap (FIFO)', () => {
    const { pinRegion } = usePinnedCards.getState();
    pinRegion('chest', DESKTOP_CAP, 'figure');
    pinRegion('l_bicep', DESKTOP_CAP, 'figure');
    pinRegion('r_bicep', DESKTOP_CAP, 'figure');
    pinRegion('waist', DESKTOP_CAP, 'figure');
    expect(usePinnedCards.getState().pinnedIds).toEqual(['l_bicep', 'r_bicep', 'waist']);
  });

  it('clears triggerOrigin for evicted region but keeps it for survivors', () => {
    const { pinRegion } = usePinnedCards.getState();
    pinRegion('chest', DESKTOP_CAP, 'figure');
    pinRegion('l_bicep', DESKTOP_CAP, 'legend');
    pinRegion('r_bicep', DESKTOP_CAP, 'keyboard');
    pinRegion('waist', DESKTOP_CAP, 'figure');
    const origin = usePinnedCards.getState().triggerOriginById;
    expect(origin.chest).toBeUndefined();
    expect(origin.l_bicep).toBe('legend');
    expect(origin.r_bicep).toBe('keyboard');
    expect(origin.waist).toBe('figure');
  });

  it('replaces the entire queue on mobile (cap 1)', () => {
    const { pinRegion } = usePinnedCards.getState();
    pinRegion('chest', MOBILE_CAP, 'figure');
    expect(usePinnedCards.getState().pinnedIds).toEqual(['chest']);
    pinRegion('l_quad', MOBILE_CAP, 'figure');
    expect(usePinnedCards.getState().pinnedIds).toEqual(['l_quad']);
  });

  it('toggles a pinned region off when re-pinned (desktop)', () => {
    const { pinRegion } = usePinnedCards.getState();
    pinRegion('chest', DESKTOP_CAP, 'figure');
    pinRegion('chest', DESKTOP_CAP, 'figure');
    expect(usePinnedCards.getState().pinnedIds).toEqual([]);
    expect(usePinnedCards.getState().triggerOriginById.chest).toBeUndefined();
  });

  it('toggles a pinned region off when re-tapped (mobile)', () => {
    const { pinRegion } = usePinnedCards.getState();
    pinRegion('chest', MOBILE_CAP, 'figure');
    pinRegion('chest', MOBILE_CAP, 'figure');
    expect(usePinnedCards.getState().pinnedIds).toEqual([]);
  });

  it('unpinRegion removes a specific region without affecting others', () => {
    const { pinRegion, unpinRegion } = usePinnedCards.getState();
    pinRegion('chest', DESKTOP_CAP, 'figure');
    pinRegion('l_bicep', DESKTOP_CAP, 'figure');
    pinRegion('r_bicep', DESKTOP_CAP, 'figure');
    unpinRegion('l_bicep');
    expect(usePinnedCards.getState().pinnedIds).toEqual(['chest', 'r_bicep']);
  });

  it('unpinRegion is a no-op on a region that is not pinned', () => {
    const { pinRegion, unpinRegion } = usePinnedCards.getState();
    pinRegion('chest', DESKTOP_CAP, 'figure');
    unpinRegion('waist');
    expect(usePinnedCards.getState().pinnedIds).toEqual(['chest']);
  });

  it('setHovered tracks the transient hover region', () => {
    const { setHovered } = usePinnedCards.getState();
    setHovered('l_bicep');
    expect(usePinnedCards.getState().hoveredId).toBe('l_bicep');
    setHovered(null);
    expect(usePinnedCards.getState().hoveredId).toBeNull();
  });

  it('clearAll empties the queue, hover state, and trigger origins', () => {
    const { pinRegion, setHovered, clearAll } = usePinnedCards.getState();
    pinRegion('chest', DESKTOP_CAP, 'figure');
    pinRegion('l_bicep', DESKTOP_CAP, 'legend');
    setHovered('r_calf');
    clearAll();
    const s = usePinnedCards.getState();
    expect(s.pinnedIds).toEqual([]);
    expect(s.hoveredId).toBeNull();
    expect(s.triggerOriginById).toEqual({});
  });

  it('preserves FIFO order across many pins and evictions', () => {
    const { pinRegion } = usePinnedCards.getState();
    pinRegion('chest', DESKTOP_CAP, 'figure');
    pinRegion('l_bicep', DESKTOP_CAP, 'figure');
    pinRegion('r_bicep', DESKTOP_CAP, 'figure');
    pinRegion('l_quad', DESKTOP_CAP, 'figure');     // evicts chest
    pinRegion('r_quad', DESKTOP_CAP, 'figure');     // evicts l_bicep
    pinRegion('l_calf', DESKTOP_CAP, 'figure');     // evicts r_bicep
    expect(usePinnedCards.getState().pinnedIds).toEqual(['l_quad', 'r_quad', 'l_calf']);
  });
});
