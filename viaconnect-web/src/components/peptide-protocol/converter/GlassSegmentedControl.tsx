'use client';

/**
 * Prompt 226b: accessible glass segmented control (radiogroup).
 * Presentation only. Selection logic is owned by the parent.
 */

import { useId, type KeyboardEvent } from 'react';

export type GlassSegmentOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  label: string;
  value: T;
  options: GlassSegmentOption<T>[];
  onChange: (next: T) => void;
  testId?: string;
  size?: 'sm' | 'md';
};

export function GlassSegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  testId,
  size = 'md',
}: Props<T>) {
  const groupId = useId();
  const pad = size === 'sm' ? 'px-2 py-1 text-[11px] rounded-lg' : 'px-3 py-2 text-xs rounded-xl';

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const idx = options.findIndex((o) => o.value === value);
    if (idx < 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = options[(idx + 1) % options.length];
      if (next) onChange(next.value);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = options[(idx - 1 + options.length) % options.length];
      if (next) onChange(next.value);
    }
  }

  return (
    <div className="space-y-2 text-xs text-white/60">
      <div id={groupId}>{label}</div>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        className="flex flex-wrap gap-2"
        onKeyDown={onKeyDown}
        data-testid={testId}
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              className={`pep-segment ${pad}`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
