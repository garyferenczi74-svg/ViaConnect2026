// Prompt #157k: card anchor / placement / leader-line endpoint
// computer. Given a region centroid, the card's intrinsic size, the
// figure container's pixel bounds, and the set of already-occupied
// card zones, score four candidate placements (right / left / above
// / below) and return the lowest-scoring viable anchor.
//
// The score penalizes (a) any portion that would clip outside the
// container, (b) overlap with previously-positioned cards, (c)
// distance from the centroid, and (d) for left / right pairs, the
// side that would route the leader line across the body silhouette.
// Right and left placements always prefer the side opposite the
// region (left bicep card goes right, right bicep card goes left)
// so the leader line never crosses the figure.

import { CARD_BODY_GAP_PX } from './constants';
import type {
  BodyRegionId,
  CardPlacement,
  CardPosition,
  ContainerBounds,
  OccupiedZone,
} from './types';

interface PositionInput {
  readonly regionId: BodyRegionId;
  readonly centroidPx: { readonly x: number; readonly y: number };
  readonly cardSize: { readonly width: number; readonly height: number };
  readonly container: ContainerBounds;
  readonly occupied: readonly OccupiedZone[];
}

interface Candidate {
  readonly placement: CardPlacement;
  readonly x: number;
  readonly y: number;
  readonly leaderEnd: { readonly x: number; readonly y: number };
}

const PENALTY_OUT_OF_BOUNDS = 10000;
const PENALTY_OVERLAP = 5000;
const PENALTY_CROSSES_FIGURE = 1500;
const BONUS_MATCHES_PREFERRED_SIDE = 3000;
const PENALTY_PER_PIXEL_DISTANCE = 1;

function preferredSideForRegion(regionId: BodyRegionId): CardPlacement | null {
  if (regionId.startsWith('l_')) return 'left';   // left-side region -> card on the left
  if (regionId.startsWith('r_')) return 'right';  // right-side region -> card on the right
  return null;
}

function rectsOverlap(a: OccupiedZone, b: OccupiedZone): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function computeCandidates(input: PositionInput): readonly Candidate[] {
  const { centroidPx, cardSize } = input;
  const { width: w, height: h } = cardSize;
  const cx = centroidPx.x;
  const cy = centroidPx.y;
  const gap = CARD_BODY_GAP_PX;

  return [
    {
      placement: 'right',
      x: cx + gap,
      y: cy - h / 2,
      leaderEnd: { x: cx + gap, y: cy },
    },
    {
      placement: 'left',
      x: cx - gap - w,
      y: cy - h / 2,
      leaderEnd: { x: cx - gap, y: cy },
    },
    {
      placement: 'above',
      x: cx - w / 2,
      y: cy - gap - h,
      leaderEnd: { x: cx, y: cy - gap },
    },
    {
      placement: 'below',
      x: cx - w / 2,
      y: cy + gap,
      leaderEnd: { x: cx, y: cy + gap },
    },
  ];
}

function scoreCandidate(
  c: Candidate,
  input: PositionInput,
  preferredSide: CardPlacement | null,
): number {
  const { container, occupied, cardSize, centroidPx } = input;
  let score = 0;

  // Out-of-bounds penalty per clipped edge.
  const right = c.x + cardSize.width;
  const bottom = c.y + cardSize.height;
  if (c.x < 0) score += PENALTY_OUT_OF_BOUNDS * (-c.x + 1);
  if (c.y < 0) score += PENALTY_OUT_OF_BOUNDS * (-c.y + 1);
  if (right > container.width) score += PENALTY_OUT_OF_BOUNDS * (right - container.width + 1);
  if (bottom > container.height) score += PENALTY_OUT_OF_BOUNDS * (bottom - container.height + 1);

  // Overlap with already-placed cards.
  const proposed: OccupiedZone = {
    x: c.x,
    y: c.y,
    width: cardSize.width,
    height: cardSize.height,
  };
  for (const zone of occupied) {
    if (rectsOverlap(proposed, zone)) score += PENALTY_OVERLAP;
  }

  // Side-preference scoring for limb regions: matching side gets a
  // strong bonus so the card sits beside the muscle even when an
  // above / below candidate is closer to the centroid; opposite side
  // is penalized to keep the leader line off the body silhouette.
  if (preferredSide && (c.placement === 'left' || c.placement === 'right')) {
    if (c.placement === preferredSide) {
      score -= BONUS_MATCHES_PREFERRED_SIDE;
    } else {
      score += PENALTY_CROSSES_FIGURE;
    }
  }

  // Distance from centroid (smaller = better).
  const cardCenterX = c.x + cardSize.width / 2;
  const cardCenterY = c.y + cardSize.height / 2;
  const dx = cardCenterX - centroidPx.x;
  const dy = cardCenterY - centroidPx.y;
  score += Math.sqrt(dx * dx + dy * dy) * PENALTY_PER_PIXEL_DISTANCE;

  return score;
}

export function computeCardPosition(input: PositionInput): CardPosition {
  const candidates = computeCandidates(input);
  const preferredSide = preferredSideForRegion(input.regionId);

  let best: Candidate = candidates[0];
  let bestScore = scoreCandidate(best, input, preferredSide);
  for (let i = 1; i < candidates.length; i++) {
    const s = scoreCandidate(candidates[i], input, preferredSide);
    if (s < bestScore) {
      bestScore = s;
      best = candidates[i];
    }
  }

  // Final clamp so the card never renders fully outside the
  // container even if every candidate scored as out-of-bounds.
  const clampedX = Math.max(0, Math.min(input.container.width - input.cardSize.width, best.x));
  const clampedY = Math.max(0, Math.min(input.container.height - input.cardSize.height, best.y));

  return {
    x: clampedX,
    y: clampedY,
    placement: best.placement,
    leaderEnd: best.leaderEnd,
  };
}
