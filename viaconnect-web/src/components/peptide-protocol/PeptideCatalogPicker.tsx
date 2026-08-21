'use client';

/**
 * Prompt 226: reactive search picker for Collection 14 peptide catalogs.
 * Filters locally as the user types (display name + slug).
 */

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Search, X } from 'lucide-react';

export type PeptideCatalogItem = {
  id: string;
  slug: string;
  displayName: string;
};

/** Normalize for reactive match: lowercase, strip spaces/hyphens. */
function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function filterPeptideCatalog(
  items: PeptideCatalogItem[],
  query: string,
): PeptideCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const qNorm = normalizeSearch(query);
  return items.filter((item) => {
    const name = item.displayName.toLowerCase();
    const slug = item.slug.toLowerCase();
    if (name.includes(q) || slug.includes(q)) return true;
    // Also match "bpc157" to "BPC-157"
    return (
      normalizeSearch(item.displayName).includes(qNorm) ||
      normalizeSearch(item.slug).includes(qNorm)
    );
  });
}

type PeptideCatalogPickerProps = {
  items: PeptideCatalogItem[];
  value: string;
  onChange: (peptideId: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
  /** Prompt 226b: glass input treatment on converter only. */
  glass?: boolean;
};

export function PeptideCatalogPicker({
  items,
  value,
  onChange,
  label = 'Compound',
  placeholder = 'Search peptides by name...',
  disabled = false,
  testId = 'peptide-catalog-picker',
  glass = false,
}: PeptideCatalogPickerProps) {
  const reactId = useId();
  const inputId = `${testId}-input-${reactId}`;
  const listboxId = `${testId}-listbox-${reactId}`;
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === value) ?? null,
    [items, value],
  );

  const [query, setQuery] = useState(selected?.displayName ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** True while the user is typing a search; blocks selection sync from wiping the query. */
  const typingRef = useRef(false);

  // Sync input from committed selection only when not actively searching.
  // Bug fix: clearing peptideId on keystroke used to run setQuery('') and kill filtering.
  useEffect(() => {
    if (open || typingRef.current) return;
    if (selected) {
      setQuery(selected.displayName);
    } else if (!value) {
      setQuery('');
    }
  }, [selected, value, open]);

  const filtered = useMemo(
    () => filterPeptideCatalog(items, query),
    [items, query],
  );

  useEffect(() => {
    if (filtered.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((current) =>
      current >= filtered.length ? filtered.length - 1 : current,
    );
  }, [filtered]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        typingRef.current = false;
        setOpen(false);
        setActiveIndex(-1);
        if (selected) setQuery(selected.displayName);
        else if (!value) setQuery('');
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [selected, value]);

  function pick(item: PeptideCatalogItem) {
    typingRef.current = false;
    onChange(item.id);
    setQuery(item.displayName);
    setOpen(false);
    setActiveIndex(-1);
  }

  function clearSelection() {
    typingRef.current = true;
    onChange('');
    setQuery('');
    setOpen(true);
    setActiveIndex(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(filtered.length > 0 ? 0 : -1);
        return;
      }
      if (filtered.length === 0) return;
      setActiveIndex((current) =>
        current < 0 ? 0 : (current + 1) % filtered.length,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(filtered.length > 0 ? filtered.length - 1 : -1);
        return;
      }
      if (filtered.length === 0) return;
      setActiveIndex((current) =>
        current <= 0 ? filtered.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === 'Enter') {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        event.preventDefault();
        pick(filtered[activeIndex]);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      if (selected) setQuery(selected.displayName);
      return;
    }
  }

  const showPanel = open && !disabled;
  const activeItem =
    showPanel && activeIndex >= 0 ? filtered[activeIndex] : null;

  return (
    <div
      ref={rootRef}
      className={`relative flex w-full flex-col gap-3 ${open ? 'z-30' : 'z-0'}`}
      data-testid={testId}
    >
      <label htmlFor={inputId} className="pep-field-label text-xs">
        {label}
      </label>
      {/* Anchor: list is positioned under the search field, never over it */}
      <div className="relative z-10">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/35"
          strokeWidth={1.5}
          aria-hidden
        />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-activedescendant={
            activeItem ? `${listboxId}-opt-${activeItem.id}` : undefined
          }
          aria-autocomplete="list"
          aria-haspopup="listbox"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={
            glass
              ? 'pep-glass-input relative z-10 w-full rounded-xl py-2 pl-9 pr-9 text-sm'
              : 'relative z-10 w-full rounded-xl border border-white/15 bg-[var(--deep-navy)] py-2 pl-9 pr-9 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]/50'
          }
          data-testid={`${testId}-input`}
          onChange={(event) => {
            const next = event.target.value;
            typingRef.current = true;
            setQuery(next);
            setOpen(true);
            setActiveIndex(0);
            // Clear committed selection when the user edits the search text,
            // but do NOT reset query (that previously broke reactive filtering).
            if (value && selected && next !== selected.displayName) {
              onChange('');
            }
          }}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              setActiveIndex(filtered.length > 0 ? 0 : -1);
            }
          }}
          onBlur={() => {
            // Allow selection sync again after focus leaves (mousedown on option uses preventDefault).
            window.setTimeout(() => {
              typingRef.current = false;
            }, 0);
          }}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-white/40 hover:text-white/80"
            aria-label="Clear peptide search"
            onClick={clearSelection}
            data-testid={`${testId}-clear`}
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        ) : null}

        {showPanel ? (
          <ul
            id={listboxId}
            role="listbox"
            className="pep-catalog-dropdown absolute left-0 right-0 top-full z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl text-white"
            data-testid={`${testId}-list`}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-white/70">
                No peptides match &ldquo;{query.trim()}&rdquo;
              </li>
            ) : (
              filtered.map((item, index) => {
                const active = index === activeIndex;
                const isSelected = item.id === value;
                return (
                  <li
                    key={item.id}
                    id={`${listboxId}-opt-${item.id}`}
                    role="option"
                    aria-selected={isSelected || active}
                    className={`cursor-pointer px-3 py-2.5 text-sm ${
                      active ? 'pep-catalog-dropdown__active' : ''
                    } ${isSelected ? 'text-[var(--teal)]' : 'text-white'}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pick(item);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <div>{item.displayName}</div>
                    <div className="text-[10px] text-white/50">{item.slug}</div>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
