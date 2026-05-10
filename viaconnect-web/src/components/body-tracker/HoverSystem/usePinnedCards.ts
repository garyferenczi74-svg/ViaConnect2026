// Prompt #157k: FIFO-capped pin queue + transient hover state for the
// body region card system. Backed by Zustand so the orchestrator,
// the legend bar, and the hit map all read from the same store
// without prop-drilling. Cap is injected at pin time per §2.2 so the
// hook itself is breakpoint-agnostic and works for both the 3-card
// desktop and 1-card mobile policies.

'use client';

import { create } from 'zustand';

import type { BodyRegionId, TriggerSource } from './types';

export interface PinnedCardsState {
  readonly pinnedIds: readonly BodyRegionId[];
  readonly hoveredId: BodyRegionId | null;
  readonly triggerOriginById: Readonly<Partial<Record<BodyRegionId, TriggerSource>>>;
  pinRegion: (id: BodyRegionId, cap: number, source: TriggerSource) => void;
  unpinRegion: (id: BodyRegionId) => void;
  setHovered: (id: BodyRegionId | null) => void;
  clearAll: () => void;
}

export const usePinnedCards = create<PinnedCardsState>((set) => ({
  pinnedIds: [],
  hoveredId: null,
  triggerOriginById: {},

  pinRegion: (id, cap, source) =>
    set((state) => {
      // Toggle: if already pinned, unpin (per #157k §2.9 default).
      if (state.pinnedIds.includes(id)) {
        const nextOrigin = { ...state.triggerOriginById };
        delete nextOrigin[id];
        return {
          pinnedIds: state.pinnedIds.filter((x) => x !== id),
          triggerOriginById: nextOrigin,
        };
      }

      // Mobile cap (1): replace the whole queue with [id].
      if (cap <= 1) {
        return {
          pinnedIds: [id],
          triggerOriginById: { [id]: source },
        };
      }

      // Desktop cap (3): FIFO eviction when at cap.
      if (state.pinnedIds.length >= cap) {
        const evictedId = state.pinnedIds[0];
        const nextPinned = [...state.pinnedIds.slice(1), id];
        const nextOrigin = { ...state.triggerOriginById };
        delete nextOrigin[evictedId];
        nextOrigin[id] = source;
        return { pinnedIds: nextPinned, triggerOriginById: nextOrigin };
      }

      return {
        pinnedIds: [...state.pinnedIds, id],
        triggerOriginById: { ...state.triggerOriginById, [id]: source },
      };
    }),

  unpinRegion: (id) =>
    set((state) => {
      if (!state.pinnedIds.includes(id)) return state;
      const nextOrigin = { ...state.triggerOriginById };
      delete nextOrigin[id];
      return {
        pinnedIds: state.pinnedIds.filter((x) => x !== id),
        triggerOriginById: nextOrigin,
      };
    }),

  setHovered: (id) =>
    set((state) => (state.hoveredId === id ? state : { hoveredId: id })),

  clearAll: () =>
    set({ pinnedIds: [], hoveredId: null, triggerOriginById: {} }),
}));
