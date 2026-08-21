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

export function filterPeptideCatalog(
  items: PeptideCatalogItem[],
  query: string,
): PeptideCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.displayName.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q),
  );
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

  useEffect(() => {
    if (selected) {
      setQuery(selected.displayName);
    } else if (!value) {
      setQuery('');
    }
  }, [selected, value]);

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
    onChange(item.id);
    setQuery(item.displayName);
    setOpen(false);
    setActiveIndex(-1);
  }

  function clearSelection() {
    onChange('');
    setQuery('');
    setOpen(true);
    setActiveIndex(-1);
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
    <div ref={rootRef} className="relative w-full space-y-1" data-testid={testId}>
      <label htmlFor={inputId} className="block text-xs text-white/60">
        {label}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
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
              ? 'pep-glass-input w-full rounded-xl py-2 pl-9 pr-9 text-sm'
              : 'w-full rounded-xl border border-white/15 bg-[var(--deep-navy)] py-2 pl-9 pr-9 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]/50'
          }
          data-testid={`${testId}-input`}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            setActiveIndex(0);
            if (selected && next !== selected.displayName) {
              onChange('');
            }
          }}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              setActiveIndex(filtered.length > 0 ? 0 : -1);
            }
          }}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/40 hover:text-white/80"
            aria-label="Clear peptide search"
            onClick={clearSelection}
            data-testid={`${testId}-clear`}
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <ul
          id={listboxId}
          role="listbox"
          className={
            glass
              ? 'pep-glass absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl text-white'
              : 'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-[var(--deep-navy)] text-white shadow-lg'
          }
          data-testid={`${testId}-list`}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm text-white/45">
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
                    active ? 'bg-[#2DA5A0]/20' : ''
                  } ${isSelected ? 'text-[#2DA5A0]' : 'text-white/85'}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(item);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div>{item.displayName}</div>
                  <div className="text-[10px] text-white/35">{item.slug}</div>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
