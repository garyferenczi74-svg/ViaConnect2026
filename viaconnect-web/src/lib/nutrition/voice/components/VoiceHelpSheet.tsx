/**
 * Voice editing help bottom sheet per Prompt 170j §11.9.
 *
 * Example commands grouped by 8 operation categories. Discoverable from the
 * VoiceCaptureOverlay help link. Closes on backdrop tap or close button.
 */

'use client';

import { X } from 'lucide-react';

interface VoiceHelpSheetProps {
  open: boolean;
  onClose: () => void;
}

interface CommandGroup {
  title: string;
  examples: string[];
}

const GROUPS: CommandGroup[] = [
  {
    title: 'Adding food',
    examples: [
      'Add 100 grams of grilled salmon',
      'Plus an apple',
      'I also had a slice of toast',
    ],
  },
  {
    title: 'Removing food',
    examples: ['Remove the bread', 'Take out the cheese', 'I did not eat the rice'],
  },
  {
    title: 'Changing portion',
    examples: ['Make the chicken 150 grams', 'Double the rice', 'Half the bread'],
  },
  {
    title: 'Cooking method',
    examples: ['Change the chicken to grilled', 'The salmon was baked'],
  },
  {
    title: 'Cooking oil',
    examples: ['Add 2 tablespoons olive oil', 'There is butter on the bread'],
  },
  {
    title: 'Modifiers',
    examples: ['It was buttery', 'Add the cheese chip'],
  },
  {
    title: 'Whole meal',
    examples: ['Make it half a portion', 'I ate twice as much'],
  },
  {
    title: 'Cancel',
    examples: ['Undo that', 'Never mind'],
  },
];

export function VoiceHelpSheet({ open, onClose }: VoiceHelpSheetProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-[#1A2744]/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-2xl rounded-t-3xl border-t border-white/10 bg-[#1E3054] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 id="help-title" className="text-lg font-semibold text-white">
            What can I say?
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help sheet"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 pb-4 pt-4">
          <ul className="space-y-5">
            {GROUPS.map((group) => (
              <li key={group.title}>
                <p className="text-[11px] uppercase tracking-wider text-[#2DA5A0] font-semibold">
                  {group.title}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {group.examples.map((ex) => (
                    <li
                      key={ex}
                      className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/85"
                    >
                      {ex}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-xs text-white/45">
            ViaConnect AI tries to understand many ways of phrasing these.
          </p>
        </div>
      </div>
    </div>
  );
}
