'use client';

/**
 * src/components/journey/JourneySelectionContext.tsx
 *
 * Thin React context that holds the single shared journey selection state
 * (Prompt 208c, Phase 1, Task P1-T2).
 *
 * The provider is mounted by the journey spine (/analytics page) - not here.
 * Consumers call useJourneySelection() to read state and drive highlight/dim.
 *
 * "use client" - useState only; no DB, no Supabase, no SSR concerns.
 * No em/en-dashes. No emojis. No new dependencies.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  isRelated as pureIsRelated,
  type Selection,
  type SelectionType,
} from '@/lib/journey/selection';

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

interface JourneySelectionContextValue {
  /** The currently active selection, or null when nothing is selected. */
  selection: Selection | null;
  /**
   * Set or toggle the selection. Passing the same entity that is already
   * selected clears it (toggle-off). Passing null clears unconditionally.
   */
  setSelection: (s: Selection | null) => void;
  /** Convenience: explicitly clears the selection. */
  clear: () => void;
  /**
   * Returns true when the given entity is related to the current selection
   * (including the selection itself). Returns false when selection is null
   * (neutral state: callers should not dim when nothing is selected).
   */
  isRelated: (type: SelectionType, id: string) => boolean;
}

// ---------------------------------------------------------------------------
// Context
//
// The default value throws when the hook is used outside the provider.
// This gives a clear error message instead of a silent null/undefined bug.
// ---------------------------------------------------------------------------

function notMounted(): never {
  throw new Error(
    'useJourneySelection must be used inside a JourneySelectionProvider',
  );
}

const JourneySelectionContext = createContext<JourneySelectionContextValue>({
  selection: null,
  setSelection: notMounted,
  clear: notMounted,
  isRelated: notMounted,
});

// ---------------------------------------------------------------------------
// JourneySelectionProvider
// ---------------------------------------------------------------------------

export function JourneySelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelectionState] = useState<Selection | null>(null);

  const setSelection = useCallback((next: Selection | null) => {
    setSelectionState((prev) => {
      // Toggle-off: selecting the same entity again clears it.
      if (
        next !== null &&
        prev !== null &&
        next.type === prev.type &&
        next.id.toLowerCase().trim() === prev.id.toLowerCase().trim()
      ) {
        return null;
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectionState(null);
  }, []);

  const isRelatedFn = useCallback(
    (type: SelectionType, id: string): boolean => {
      return pureIsRelated(selection, type, id);
    },
    [selection],
  );

  const value = useMemo<JourneySelectionContextValue>(
    () => ({
      selection,
      setSelection,
      clear,
      isRelated: isRelatedFn,
    }),
    [selection, setSelection, clear, isRelatedFn],
  );

  return (
    <JourneySelectionContext.Provider value={value}>
      {children}
    </JourneySelectionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// useJourneySelection
// ---------------------------------------------------------------------------

/**
 * Returns the active JourneySelectionContextValue.
 * Throws a clear error when called outside a JourneySelectionProvider.
 */
export function useJourneySelection(): JourneySelectionContextValue {
  return useContext(JourneySelectionContext);
}
