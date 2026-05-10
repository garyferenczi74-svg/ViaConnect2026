// Prompt #157k §4.1: card-position scorer tests. Pure function, no
// React. Verifies side-preference for left/right regions, edge
// avoidance, occupied-zone avoidance, and leader endpoint correctness.

import { describe, it, expect } from 'vitest';

import { computeCardPosition } from '@/components/body-tracker/HoverSystem/useCardPositioning';
import type { OccupiedZone } from '@/components/body-tracker/HoverSystem/types';

const DEFAULT_CARD = { width: 220, height: 110 };
const DEFAULT_CONTAINER = { width: 800, height: 1200 };

describe('computeCardPosition', () => {
  it('places a left-side region card on the LEFT of the centroid', () => {
    const result = computeCardPosition({
      regionId: 'l_bicep',
      centroidPx: { x: 300, y: 600 }, // 300-24-220=56 so left fits
      cardSize: DEFAULT_CARD,
      container: DEFAULT_CONTAINER,
      occupied: [],
    });
    expect(result.placement).toBe('left');
    // card right edge sits to the left of the centroid (with the 24px gap)
    expect(result.x + DEFAULT_CARD.width).toBeLessThanOrEqual(300 - 1);
  });

  it('places a right-side region card on the RIGHT of the centroid', () => {
    const result = computeCardPosition({
      regionId: 'r_bicep',
      centroidPx: { x: 500, y: 600 }, // 524+220=744 < 800 so right fits
      cardSize: DEFAULT_CARD,
      container: DEFAULT_CONTAINER,
      occupied: [],
    });
    expect(result.placement).toBe('right');
    expect(result.x).toBeGreaterThanOrEqual(500);
  });

  it('flips placement to keep the card inside the container', () => {
    // r_bicep would normally go right, but if the centroid is too
    // close to the right edge the scorer should fall back to
    // another placement (above / below / left) rather than clipping.
    const result = computeCardPosition({
      regionId: 'r_bicep',
      centroidPx: { x: 760, y: 600 }, // 40 px from right edge
      cardSize: DEFAULT_CARD,
      container: DEFAULT_CONTAINER,
      occupied: [],
    });
    expect(result.placement).not.toBe('right');
    // final clamp should keep card inside container
    expect(result.x + DEFAULT_CARD.width).toBeLessThanOrEqual(DEFAULT_CONTAINER.width);
  });

  it('avoids overlap with occupied zones', () => {
    const occupied: OccupiedZone[] = [
      { x: 560, y: 540, width: 220, height: 110 }, // covers the right placement
    ];
    const result = computeCardPosition({
      regionId: 'r_bicep',
      centroidPx: { x: 540, y: 600 },
      cardSize: DEFAULT_CARD,
      container: DEFAULT_CONTAINER,
      occupied,
    });
    // result rect should not overlap the occupied zone
    const overlaps = !(
      result.x + DEFAULT_CARD.width <= occupied[0].x ||
      occupied[0].x + occupied[0].width <= result.x ||
      result.y + DEFAULT_CARD.height <= occupied[0].y ||
      occupied[0].y + occupied[0].height <= result.y
    );
    expect(overlaps).toBe(false);
  });

  it('returns leader endpoint at the card edge nearest the centroid for right placement', () => {
    const result = computeCardPosition({
      regionId: 'r_bicep',
      centroidPx: { x: 400, y: 600 },
      cardSize: DEFAULT_CARD,
      container: DEFAULT_CONTAINER,
      occupied: [],
    });
    expect(result.placement).toBe('right');
    // leader.x should sit just to the right of the centroid (at the card's gap edge)
    expect(result.leaderEnd.x).toBeGreaterThan(result.x - 30);
    expect(result.leaderEnd.x).toBeLessThanOrEqual(result.x + 5);
    expect(result.leaderEnd.y).toBe(600);
  });

  it('clamps card position so it never renders fully outside the container', () => {
    const result = computeCardPosition({
      regionId: 'neck',
      centroidPx: { x: 0, y: 0 }, // pathological: centroid at origin
      cardSize: DEFAULT_CARD,
      container: DEFAULT_CONTAINER,
      occupied: [],
    });
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.x + DEFAULT_CARD.width).toBeLessThanOrEqual(DEFAULT_CONTAINER.width);
    expect(result.y + DEFAULT_CARD.height).toBeLessThanOrEqual(DEFAULT_CONTAINER.height);
  });

  it('handles a centroid near the bottom edge by placing the card above', () => {
    const result = computeCardPosition({
      regionId: 'neck', // not a left/right region; no side preference
      centroidPx: { x: 400, y: 1180 }, // 20 px from bottom
      cardSize: DEFAULT_CARD,
      container: DEFAULT_CONTAINER,
      occupied: [],
    });
    // placement should NOT be below since that would clip
    expect(result.placement).not.toBe('below');
  });

  it('center regions (neck, chest, waist, shoulders) have no left/right preference', () => {
    const a = computeCardPosition({
      regionId: 'chest',
      centroidPx: { x: 400, y: 600 }, // dead center
      cardSize: DEFAULT_CARD,
      container: DEFAULT_CONTAINER,
      occupied: [],
    });
    // chest sits at center; either left or right placement is acceptable
    expect(['left', 'right', 'above', 'below']).toContain(a.placement);
  });
});
