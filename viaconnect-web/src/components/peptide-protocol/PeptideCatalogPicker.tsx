'use client';

/**
 * Prompt 226: reactive search picker for Collection 14 peptide catalogs.
 * Filters locally on every keystroke (display name + slug).
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
    const name = String(item.displayName ?? '').toLowerCase();
    const slug = String(item.slug ?? '').toLowerCase();
    if (name.includes(q) || slug.includes(q)) return true;
    return (
      normalizeSearch(name).includes(qNorm) ||
      normalizeSearch(slug).includes(qNorm)
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
  const inputRef = useRef<HTMLInputElement>(null);
  /** Last peptide id we synced into the text box (fromRx / pick). */
  const syncedValueRef = useRef<string>('');

  const selected = useMemo(
    () => items.find((item) => item.id === value) ?? null,
    [items, value],
  );

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Only push an external/committed selection into the input when value changes
  // to a new id (pick or fromRx). Never reset query while the user is typing.
  useEffect(() => {
    if (!value) {
      syncedValueRef.current = '';
      return;
    }
    if (value === syncedValueRef.current) return;
    const match = items.find((item) => item.id === value);
    if (!match) return;
    syncedValueRef.current = value;
    setQuery(match.displayName);
  }, [value, items]);

  const filtered = useMemo(
    () => filterPeptideCatalog(items, query),
    [items, query],
  );

  useEffect(() => {
    if (!open) return;
    if (filtered.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((current) =>
      current < 0 ? 0 : Math.min(current, filtered.length - 1),
    );
  }, [filtered, open]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function pick(item: PeptideCatalogItem) {
    syncedValueRef.current = item.id;
    onChange(item.id);
    setQuery(item.displayName);
    setOpen(false);
    setActiveIndex(-1);
  }

  function clearSearch() {
    syncedValueRef.current = '';
    setQuery('');
    if (value) onChange('');
    setOpen(true);
    setActiveIndex(0);
    inputRef.current?.focus();
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
    }
  }

  const showPanel = open && !disabled;
  const activeItem =
    showPanel && activeIndex >= 0 ? filtered[activeIndex] : null;
  const searching = query.trim().length > 0;

  return (
    <div
      ref={rootRef}
      className={`relative flex w-full flex-col gap-3 overflow-visible ${
        open ? 'z-30' : 'z-0'
      }`}
      data-testid={testId}
    >
      <label htmlFor={inputId} className="pep-field-label text-xs">
        {label}
      </label>
      <div className="relative z-10 overflow-visible">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/35"
          strokeWidth={1.5}
          aria-hidden
        />
        <input
          ref={inputRef}
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
            setQuery(next);
            setOpen(true);
            setActiveIndex(0);
            // Detach committed selection as soon as the text diverges.
            if (value && selected && next !== selected.displayName) {
              syncedValueRef.current = '';
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
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-white/40 hover:text-white/80"
            aria-label="Clear peptide search"
            onClick={clearSearch}
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
            <li
              className="sticky top-0 z-[1] border-b border-white/10 bg-[var(--card)] px-3 py-1.5 text-[10px] text-white/55"
              aria-hidden
            >
              {searching
                ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'} for "${query.trim()}"`
                : `${items.length} peptides · type to filter`}
            </li>
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
