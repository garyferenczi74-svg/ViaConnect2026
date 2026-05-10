'use client';

// Prompt #157k: orchestrator for the body-region hover/peek/pin card
// system. Wraps the figure (children prop) and renders interactive
// overlays on top: hit map, glow rings, leader lines, and floating
// SegmentalCards. The Zustand pin store is shared with the standalone
// LegendBar so both surfaces (figure + chip toolbar) drive the same
// queue.
//
// Behaviors:
//   - Hover-peek (desktop only): pointerenter on a region polygon
//     opens a peek card after grace; pointerleave dismisses with a
//     120ms grace timer.
//   - Click / tap to pin: figure or legend chip activation calls
//     pinRegion with the responsive cap (3 desktop, 1 mobile).
//   - FIFO eviction (desktop) / replacement (mobile) handled by
//     usePinnedCards.
//   - Tab + sex reset: useEffect on (view, sex) clears the queue with
//     a 200ms cross-fade via AnimatePresence exit.
//   - Escape: with focus inside a card, closes that card and returns
//     focus to its trigger origin; with no card focused, clears all.
//   - aria-live region announces pin / evict / replace / unpin /
//     clearAll for assistive tech.

import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  BODY_TRACKER_EVENTS,
  getViewportTag,
  trackBodyTrackerEvent,
} from '@/lib/analytics/bodyTracker';
import { BodyRegionHitMap } from './BodyRegionHitMap';
import { LeaderLine } from './LeaderLine';
import { RegionGlowRing } from './RegionGlowRing';
import { SegmentalCard } from './SegmentalCard';
import {
  CARD_HEIGHT_ESTIMATE,
  CARD_WIDTH_DESKTOP,
  CARD_WIDTH_MOBILE,
  HOVER_GRACE_MS,
  REGION_CENTROIDS_BY_SEX,
  REGION_HIT_RECTS_BY_SEX,
  REGION_LABELS,
} from './constants';
import { computeCardPosition } from './useCardPositioning';
import { useReducedMotion } from './useReducedMotion';
import { useResponsivePinCap } from './useResponsivePinCap';
import { usePinnedCards } from './usePinnedCards';
import type {
  BodyRegionData,
  BodyRegionId,
  CardPosition,
  CardVariant,
  Sex,
  TriggerSource,
  ViewMode,
} from './types';

interface HoverSystemProps {
  readonly view: ViewMode;
  readonly sex: Sex;
  readonly regions: readonly BodyRegionData[];
  readonly children: React.ReactNode; // the figure (SegmentalHeatMap)
  readonly className?: string;
}

interface ActiveRegion {
  readonly id: BodyRegionId;
  readonly variant: CardVariant;
  readonly position: CardPosition;
}

function buildAnnouncement(
  kind: 'pin' | 'evict' | 'replace' | 'unpin' | 'clear',
  data: { primary?: BodyRegionData; evictedLabel?: string; addedLabel?: string },
): string {
  switch (kind) {
    case 'pin':
      if (!data.primary) return '';
      return `${data.primary.label} card opened. ${data.primary.metric.value.toFixed(1)} ${data.primary.metric.unit === '%' ? 'percent' : data.primary.metric.unit}, ${data.primary.classification} classification.`;
    case 'evict':
      return `${data.evictedLabel ?? 'Region'} card closed to make room for ${data.addedLabel ?? 'new region'} card.`;
    case 'replace':
      return `${data.addedLabel ?? 'Region'} card opened, replacing ${data.evictedLabel ?? 'previous region'} card.`;
    case 'unpin':
      return `${data.primary?.label ?? 'Region'} card closed.`;
    case 'clear':
      return 'All region cards closed.';
    default:
      return '';
  }
}

export function HoverSystem({ view, sex, regions, children, className }: HoverSystemProps) {
  const reducedMotion = useReducedMotion();
  const { pinCap, hoverEnabled, isDesktop } = useResponsivePinCap();
  const cardWidth = isDesktop ? CARD_WIDTH_DESKTOP : CARD_WIDTH_MOBILE;

  const pinnedIds = usePinnedCards((s) => s.pinnedIds);
  const hoveredId = usePinnedCards((s) => s.hoveredId);
  const triggerOriginById = usePinnedCards((s) => s.triggerOriginById);
  const pinRegion = usePinnedCards((s) => s.pinRegion);
  const setHovered = usePinnedCards((s) => s.setHovered);
  const clearAll = usePinnedCards((s) => s.clearAll);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track container bounds via ResizeObserver so cards reposition on
  // viewport / layout changes without re-mounting.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    ro.observe(el);
    setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Reset queue on view or sex change (#157k §2.3).
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    clearAll();
    setLiveMessage(buildAnnouncement('clear', {}));
    trackBodyTrackerEvent(BODY_TRACKER_EVENTS.REGION_CLEAR_ALL, {
      view,
      gender: sex,
      viewport: getViewportTag(),
      trigger_source: 'figure',
    });
  }, [view, sex, clearAll]);

  const regionsById = useMemo(() => {
    const m: Partial<Record<BodyRegionId, BodyRegionData>> = {};
    for (const r of regions) m[r.id] = r;
    return m;
  }, [regions]);

  // Build the active rendering set: pinned ids + (hovered id if not
  // already pinned and hover is enabled). Compute card positions via
  // the placement scorer, threading occupied zones forward so cards
  // pinned later avoid overlapping cards pinned earlier.
  const activeRegions: readonly ActiveRegion[] = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return [];
    const centroids = REGION_CENTROIDS_BY_SEX[sex];
    const ids: Array<{ id: BodyRegionId; variant: CardVariant }> = [];

    for (const id of pinnedIds) ids.push({ id, variant: 'pinned' });
    if (hoverEnabled && hoveredId && !pinnedIds.includes(hoveredId)) {
      ids.push({ id: hoveredId, variant: 'peek' });
    }

    const result: ActiveRegion[] = [];
    const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];
    for (const { id, variant } of ids) {
      const c = centroids[id];
      const centroidPx = {
        x: (c.xPct / 100) * containerSize.width,
        y: (c.yPct / 100) * containerSize.height,
      };
      const position = computeCardPosition({
        regionId: id,
        centroidPx,
        cardSize: { width: cardWidth, height: CARD_HEIGHT_ESTIMATE },
        container: containerSize,
        occupied,
      });
      result.push({ id, variant, position });
      occupied.push({
        x: position.x,
        y: position.y,
        width: cardWidth,
        height: CARD_HEIGHT_ESTIMATE,
      });
    }
    return result;
  }, [pinnedIds, hoveredId, hoverEnabled, sex, containerSize, cardWidth]);

  // aria-live announcements + analytics dispatch share a single
  // pinnedIds-watching effect. Diffing prev/curr identifies pins,
  // evictions, replacements, and unpins; the source is read from
  // triggerOriginById which is set inside pinRegion at activation
  // time, so this effect catches activations from every surface
  // (figure hit map, legend bar, keyboard, escape close) without
  // duplication.
  const [liveMessage, setLiveMessage] = useState('');
  const previousPinnedRef = useRef<readonly BodyRegionId[]>([]);
  useEffect(() => {
    const prev = previousPinnedRef.current;
    const curr = pinnedIds;

    const added = curr.filter((id) => !prev.includes(id));
    const removed = prev.filter((id) => !curr.includes(id));

    const viewport = getViewportTag();

    if (added.length === 1 && removed.length === 0) {
      const id = added[0];
      const data = regionsById[id];
      if (data) setLiveMessage(buildAnnouncement('pin', { primary: data }));
      trackBodyTrackerEvent(BODY_TRACKER_EVENTS.REGION_PIN, {
        region_id: id,
        view,
        gender: sex,
        viewport,
        trigger_source: triggerOriginById[id] ?? 'figure',
      });
    } else if (added.length === 1 && removed.length === 1) {
      const addedId = added[0];
      const removedId = removed[0];
      const addedLabel = REGION_LABELS[addedId];
      const evictedLabel = REGION_LABELS[removedId];
      const isCapEviction = pinCap > 1 && prev.length === pinCap;
      setLiveMessage(
        buildAnnouncement(isCapEviction ? 'evict' : 'replace', { addedLabel, evictedLabel }),
      );
      trackBodyTrackerEvent(
        isCapEviction ? BODY_TRACKER_EVENTS.REGION_EVICT : BODY_TRACKER_EVENTS.REGION_REPLACE,
        {
          region_id: addedId,
          [isCapEviction ? 'evicted_region_id' : 'replaced_region_id']: removedId,
          view,
          gender: sex,
          viewport,
          trigger_source: triggerOriginById[addedId] ?? 'figure',
        },
      );
    } else if (added.length === 0 && removed.length === 1) {
      const id = removed[0];
      const data = regionsById[id];
      if (data) setLiveMessage(buildAnnouncement('unpin', { primary: data }));
      trackBodyTrackerEvent(BODY_TRACKER_EVENTS.REGION_UNPIN, {
        region_id: id,
        view,
        gender: sex,
        viewport,
        trigger_source: 'figure',
      });
    } else if (added.length === 0 && removed.length > 1) {
      // clearAll path
      setLiveMessage(buildAnnouncement('clear', {}));
    }

    previousPinnedRef.current = curr;
  }, [pinnedIds, regionsById, pinCap, view, sex, triggerOriginById]);

  // Hover grace timer. Pointer leave starts a 120ms timer to dismiss
  // the peek card. Pointer enter cancels the timer.
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleHoverChange = useCallback(
    (id: BodyRegionId | null) => {
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      if (id === null) {
        graceTimerRef.current = setTimeout(() => setHovered(null), HOVER_GRACE_MS);
      } else {
        setHovered(id);
        if (process.env.NODE_ENV !== 'production') {
          // peek-only telemetry (desktop)
          trackBodyTrackerEvent(BODY_TRACKER_EVENTS.REGION_PEEK, {
            region_id: id,
            view,
            gender: sex,
            viewport: getViewportTag(),
            trigger_source: 'figure',
          });
        }
      }
    },
    [setHovered, view, sex],
  );
  useEffect(
    () => () => {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    },
    [],
  );

  // Activate dispatches to the store; analytics + announcements are
  // handled by the pinnedIds-watching effect above so this callback
  // stays a thin wrapper that LegendBar consumers (the page) can also
  // share via the same store, without duplicating dispatch logic.
  const handleActivate = useCallback(
    (id: BodyRegionId, source: TriggerSource) => {
      pinRegion(id, pinCap, source);
    },
    [pinRegion, pinCap],
  );

  // Escape key handler (#157k §2.3 + §2.6 keyboard).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const focused = document.activeElement as HTMLElement | null;
      const focusedRegion = focused?.closest('[data-region]')?.getAttribute('data-region') as
        | BodyRegionId
        | undefined;
      if (focusedRegion && pinnedIds.includes(focusedRegion)) {
        // Close that card and try to restore focus to its trigger.
        e.preventDefault();
        pinRegion(focusedRegion, pinCap, 'keyboard'); // toggles off
        const origin = triggerOriginById[focusedRegion];
        const triggerSelector =
          origin === 'legend'
            ? `[role="toolbar"] [data-region="${focusedRegion}"]`
            : `[role="group"][aria-label="Body region hit map"] [data-region="${focusedRegion}"]`;
        const trigger = document.querySelector<HTMLElement>(triggerSelector);
        trigger?.focus();
      } else if (pinnedIds.length > 0) {
        e.preventDefault();
        clearAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pinnedIds, pinCap, pinRegion, clearAll, triggerOriginById]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className ?? ''}`}
      data-testid="hover-system"
      data-view={view}
      data-sex={sex}
    >
      {children}

      {containerSize.width > 0 && (
        <BodyRegionHitMap
          sex={sex}
          regionsById={regionsById}
          hoverEnabled={hoverEnabled}
          onActivate={handleActivate}
          onHoverChange={handleHoverChange}
          container={containerSize}
        />
      )}

      <AnimatePresence>
        {activeRegions.map(({ id }) => {
          const rect = REGION_HIT_RECTS_BY_SEX[sex][id];
          return (
            <RegionGlowRing
              key={`glow-${id}`}
              regionId={id}
              rect={rect}
              container={containerSize}
              reducedMotion={reducedMotion}
            />
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {activeRegions.map(({ id, position }) => {
          const c = REGION_CENTROIDS_BY_SEX[sex][id];
          const centroidPx = {
            x: (c.xPct / 100) * containerSize.width,
            y: (c.yPct / 100) * containerSize.height,
          };
          return (
            <LeaderLine
              key={`leader-${id}`}
              regionId={id}
              from={position.leaderEnd}
              to={centroidPx}
              container={containerSize}
              reducedMotion={reducedMotion}
            />
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {activeRegions.map(({ id, variant, position }) => {
          const data = regionsById[id];
          if (!data) return null;
          return (
            <SegmentalCard
              key={`card-${id}`}
              region={data}
              variant={variant}
              position={position}
              width={cardWidth}
              reducedMotion={reducedMotion}
              onClose={
                variant === 'pinned'
                  ? () => handleActivate(id, 'figure')
                  : undefined
              }
            />
          );
        })}
      </AnimatePresence>

      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {liveMessage}
      </div>
    </div>
  );
}
