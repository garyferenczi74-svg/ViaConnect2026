"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { LocationOption } from "@/lib/location/types";

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-teal-400/50 focus:ring-teal-400/30 text-white placeholder:text-white/30 focus:ring-1 focus:outline-none transition-all text-base min-h-[44px]";

const PANEL_CLASS =
  "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-[#1A2744] text-white shadow-lg";

export type TypeaheadSelection = LocationOption & { isFreeEntry: boolean };

export function freeEntryOptionLabel(query: string): string {
  return `Use '${query}'`;
}

export type TypeaheadComboboxProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: TypeaheadSelection) => void;
  items: LocationOption[];
  onQuery: (q: string) => void;
  disabled?: boolean;
  required?: boolean;
  allowFreeEntry?: boolean;
  freeEntryLabel?: string;
};

type DisplayOption = TypeaheadSelection & { optionId: string };

export function TypeaheadCombobox({
  id,
  label,
  placeholder,
  value,
  onChange,
  items,
  onQuery,
  disabled = false,
  required = false,
  allowFreeEntry = false,
  freeEntryLabel,
}: TypeaheadComboboxProps) {
  const reactId = useId();
  const listboxId = `${id}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const options = useMemo<DisplayOption[]>(() => {
    const query = value.trim();
    const mapped = items.map((item, index) => ({
      value: item.value,
      label: item.label,
      isFreeEntry: false,
      optionId: `${id}-opt-${index}`,
    }));

    const hasExact = items.some(
      (item) => item.label.toLowerCase() === query.toLowerCase(),
    );
    if (allowFreeEntry && query.length > 0 && !hasExact) {
      mapped.push({
        value: query,
        label: freeEntryLabel ?? freeEntryOptionLabel(query),
        isFreeEntry: true,
        optionId: `${id}-opt-free-${reactId}`,
      });
    }
    return mapped;
  }, [allowFreeEntry, freeEntryLabel, id, items, reactId, value]);

  useEffect(() => {
    if (options.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((current) =>
      current >= options.length ? -1 : current,
    );
  }, [options]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function selectOption(option: DisplayOption) {
    onChange({
      value: option.value,
      label: option.isFreeEntry ? option.value : option.label,
      isFreeEntry: option.isFreeEntry,
    });
    setOpen(false);
    setActiveIndex(-1);
  }

  function commitTypedOnBlur() {
    const query = value.trim();
    if (query.length === 0) {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const exact = items.find(
      (item) => item.label.toLowerCase() === query.toLowerCase(),
    );
    if (exact) {
      onChange({
        value: exact.value,
        label: exact.label,
        isFreeEntry: false,
      });
    } else if (allowFreeEntry) {
      onChange({
        value: query,
        label: query,
        isFreeEntry: true,
      });
    }

    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(options.length > 0 ? 0 : -1);
        return;
      }
      if (options.length === 0) {
        return;
      }
      setActiveIndex((current) =>
        current < 0 ? 0 : (current + 1) % options.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(options.length > 0 ? options.length - 1 : -1);
        return;
      }
      if (options.length === 0) {
        return;
      }
      setActiveIndex((current) =>
        current <= 0 ? options.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      if (open && activeIndex >= 0 && options[activeIndex]) {
        event.preventDefault();
        selectOption(options[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showPanel = open && !disabled && options.length > 0;
  const activeOption = showPanel && activeIndex >= 0 ? options[activeIndex] : null;

  return (
    <div ref={rootRef} className="relative w-full">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-white/70"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-activedescendant={activeOption?.optionId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-required={required}
        required={required}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        className={INPUT_CLASS}
        onChange={(event) => {
          onQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          if (!disabled) {
            setOpen(true);
            setActiveIndex(-1);
          }
        }}
        onBlur={commitTypedOnBlur}
        onKeyDown={onKeyDown}
      />
      {showPanel ? (
        <ul id={listboxId} role="listbox" className={PANEL_CLASS}>
          {options.map((option, index) => {
            const active = index === activeIndex;
            return (
              <li
                key={option.optionId}
                id={option.optionId}
                role="option"
                aria-selected={active}
                className={`min-h-[44px] cursor-pointer px-4 py-3 text-base ${
                  active ? "bg-teal-400/20" : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
