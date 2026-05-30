/**
 * "Voice edited" chip in the result review header per Prompt 170j §11.10.
 *
 * Hannah's push-back: counts sessions (not operations) so the chip reads
 * as "Voice edited (3)" after three separate voice sessions, not after
 * three operations. Tap expands a popover with the most recent preview
 * strings.
 */

'use client';

import { ChevronDown, Mic } from 'lucide-react';
import { useState } from 'react';

interface VoiceEditedChipProps {
  sessionCount: number;
  recentOperationPreviews: ReadonlyArray<string>;
}

export function VoiceEditedChip({
  sessionCount,
  recentOperationPreviews,
}: VoiceEditedChipProps) {
  const [open, setOpen] = useState(false);

  if (sessionCount === 0) return null;

  const label = sessionCount === 1 ? 'Voice edited' : `Voice edited (${sessionCount})`;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${label}. Tap to view applied operations.`}
        className="inline-flex min-h-[28px] items-center gap-1.5 rounded-full bg-[#2DA5A0]/20 px-3 py-1 text-xs font-medium text-[#2DA5A0] transition hover:bg-[#2DA5A0]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
      >
        <Mic size={12} strokeWidth={1.5} aria-hidden="true" />
        {label}
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          aria-hidden="true"
          className={`transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && recentOperationPreviews.length > 0 && (
        <div
          role="dialog"
          aria-label="Recent voice operations"
          className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-white/10 bg-[#1E3054]/95 backdrop-blur-md p-3 shadow-xl shadow-black/40"
        >
          <p className="mb-2 text-[11px] uppercase tracking-wider text-white/45">
            Recent voice operations
          </p>
          <ul className="max-h-48 space-y-2 overflow-y-auto text-xs text-white/80">
            {recentOperationPreviews.slice(0, 6).map((preview, i) => (
              <li
                key={i}
                className="border-l-2 border-[#2DA5A0]/50 py-0.5 pl-2"
              >
                {preview}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
